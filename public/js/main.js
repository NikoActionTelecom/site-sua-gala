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

    const typeEl = form.querySelector('input[name="type"]:checked');
    const profilEl = form.querySelector('input[name="profil"]:checked');
    const reglementEl = form.querySelector('input[name="reglement"]:checked');

    const type = typeEl ? typeEl.value : 'gala';
    const profil = profilEl ? profilEl.value : 'particulier';
    const reglement = reglementEl ? reglementEl.value : '';

    const getValue = (sel) => {
      const el = form.querySelector(sel);
      return el ? el.value.trim() : '';
    };

    const data = {
      type,
      profil,
      nom: getValue('#nom'),
      prenom: getValue('#prenom'),
      raisonSociale: getValue('#raisonSociale'),
      siret: getValue('#siret'),
      email: getValue('#email'),
      telephone: getValue('#telephone'),
      adresse: getValue('#adresse'),
      clubAffilie: getValue('#clubAffilie'),
      reglement,
      commentaire: getValue('#commentaire'),
    };

    if (type === 'gala') {
      data.nombrePersonnes = getValue('#nombrePersonnes') || '2';
      data.montantDon = getValue('#montantDonGala') || '2000';
    } else {
      const catEl = form.querySelector('input[name="categorie"]:checked');
      data.categorie = catEl ? catEl.value : 'porthos';
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

      let result;
      try {
        result = await res.json();
      } catch (parseErr) {
        alert('Erreur serveur. Veuillez réessayer.');
        return;
      }

      if (res.ok) {
        steps.forEach(s => s.classList.remove('active'));
        successEl.style.display = '';
        progressEl.style.display = 'none';
      } else {
        const msg = result.error || (result.errors && result.errors.join(', ')) || 'Erreur lors de l\'inscription';
        alert(msg);
      }
    } catch (err) {
      console.error('Erreur submit:', err);
      alert('Impossible de contacter le serveur. Vérifiez que le serveur est démarré (npm start).');
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

  // === Mode Mousquetaire uniquement (via /mousquetaires ou ?type=mousquetaire) ===
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('type');

  if (modeParam === 'mousquetaire') {
    // Pré-sélectionner Mousquetaire
    const mousqRadio = form.querySelector('input[name="type"][value="mousquetaire"]');
    if (mousqRadio) {
      mousqRadio.checked = true;
      updateTypeFields();
    }

    // Masquer le choix Gala dans l'étape 1
    const galaTypeCard = form.querySelector('input[name="type"][value="gala"]');
    if (galaTypeCard) {
      galaTypeCard.closest('.type-card').style.display = 'none';
    }

    // Adapter le titre et la grille
    const stepTitle = form.querySelector('[data-step="1"] .form-step-title');
    if (stepTitle) {
      stepTitle.textContent = 'Devenir Mousquetaire d\'Armandie';
    }
    const typeCards = form.querySelector('.form-type-cards');
    if (typeCards) {
      typeCards.style.gridTemplateColumns = '1fr';
    }

    // Masquer l'encart bridge (plus nécessaire en mode direct)
    const bridgeInfo = form.querySelector('.form-info-bridge');
    if (bridgeInfo) {
      bridgeInfo.style.display = 'none';
    }

    // Masquer les sections Gala (tarifs, héro soirée-centrée) si post-soirée
    // Les sections restent visibles par défaut - à masquer manuellement si besoin
  }

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
