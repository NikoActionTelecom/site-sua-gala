document.addEventListener('DOMContentLoaded', () => {
  // === Navbar scroll ===
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // === Mobile nav ===
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // === Form multi-step ===
  const form = document.getElementById('registrationForm');
  const steps = form.querySelectorAll('.form-step');
  const progressSteps = document.querySelectorAll('.progress-step');
  const successEl = document.getElementById('formSuccess');
  const progressEl = document.getElementById('formProgress');
  let currentStep = 1;

  function showStep(n) {
    steps.forEach(s => s.classList.remove('active'));
    const target = form.querySelector(`[data-step="${n}"]`);
    if (target) target.classList.add('active');

    progressSteps.forEach(ps => {
      const s = parseInt(ps.dataset.step);
      ps.classList.remove('active', 'done');
      if (s === n) ps.classList.add('active');
      if (s < n) ps.classList.add('done');
    });

    currentStep = n;
  }

  // Next / Prev buttons
  form.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        showStep(currentStep + 1);
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  form.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      showStep(currentStep - 1);
    });
  });

  // === Type toggle ===
  const typeRadios = form.querySelectorAll('input[name="type"]');
  const galaFields = form.querySelector('.gala-fields');
  const mousqFields = form.querySelector('.mousquetaire-fields');

  function updateTypeFields() {
    const type = form.querySelector('input[name="type"]:checked').value;
    galaFields.style.display = type === 'gala' ? '' : 'none';
    mousqFields.style.display = type === 'mousquetaire' ? '' : 'none';
  }
  typeRadios.forEach(r => r.addEventListener('change', updateTypeFields));
  updateTypeFields();

  // === Profil toggle ===
  const profilRadios = form.querySelectorAll('input[name="profil"]');
  const entrepriseFields = form.querySelector('.entreprise-fields');

  function updateProfilFields() {
    const profil = form.querySelector('input[name="profil"]:checked').value;
    entrepriseFields.style.display = profil === 'entreprise' ? '' : 'none';
  }
  profilRadios.forEach(r => r.addEventListener('change', updateProfilFields));

  // === Validation ===
  function validateStep(step) {
    clearErrors();
    let valid = true;

    if (step === 2) {
      const nom = form.querySelector('#nom');
      const prenom = form.querySelector('#prenom');
      const email = form.querySelector('#email');
      const tel = form.querySelector('#telephone');

      if (!nom.value.trim()) { markError(nom); valid = false; }
      if (!prenom.value.trim()) { markError(prenom); valid = false; }
      if (!email.value.trim() || !email.value.includes('@')) { markError(email); valid = false; }
      if (!tel.value.trim()) { markError(tel); valid = false; }

      const profil = form.querySelector('input[name="profil"]:checked').value;
      if (profil === 'entreprise') {
        const rs = form.querySelector('#raisonSociale');
        if (!rs.value.trim()) { markError(rs); valid = false; }
      }
    }

    return valid;
  }

  function markError(el) {
    el.classList.add('error');
    el.addEventListener('input', () => el.classList.remove('error'), { once: true });
  }

  function clearErrors() {
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }

  // === Submit ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = form.querySelector('input[name="type"]:checked').value;
    const profil = form.querySelector('input[name="profil"]:checked').value;
    const reglement = form.querySelector('input[name="reglement"]:checked')?.value || '';

    const data = {
      type,
      profil,
      nom: form.querySelector('#nom').value.trim(),
      prenom: form.querySelector('#prenom').value.trim(),
      raisonSociale: form.querySelector('#raisonSociale').value.trim(),
      siret: form.querySelector('#siret').value.trim(),
      email: form.querySelector('#email').value.trim(),
      telephone: form.querySelector('#telephone').value.trim(),
      adresse: form.querySelector('#adresse').value.trim(),
      clubAffilie: form.querySelector('#clubAffilie').value.trim(),
      reglement,
      commentaire: form.querySelector('#commentaire').value.trim(),
    };

    if (type === 'gala') {
      data.nombrePersonnes = form.querySelector('#nombrePersonnes').value;
      data.montantDon = form.querySelector('#montantDonGala').value;
    } else {
      data.categorie = form.querySelector('input[name="categorie"]:checked')?.value || '';
    }

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok) {
        steps.forEach(s => s.classList.remove('active'));
        successEl.style.display = '';
        progressEl.style.display = 'none';
      } else {
        const msg = result.error || (result.errors && result.errors.join(', ')) || 'Erreur lors de l\'inscription';
        alert(msg);
      }
    } catch (err) {
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Valider mon inscription
      `;
    }
  });

  // === New registration ===
  document.getElementById('newRegistration').addEventListener('click', () => {
    form.reset();
    successEl.style.display = 'none';
    progressEl.style.display = '';
    updateTypeFields();
    updateProfilFields();
    showStep(1);
  });

  // === Mousquetaire card links ===
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.cat;
      // Select mousquetaire type
      const mousqRadio = form.querySelector('input[name="type"][value="mousquetaire"]');
      mousqRadio.checked = true;
      updateTypeFields();
      // Select category
      const catRadio = form.querySelector(`input[name="categorie"][value="${cat}"]`);
      if (catRadio) catRadio.checked = true;

      document.getElementById('inscription').scrollIntoView({ behavior: 'smooth' });
    });
  });
});
