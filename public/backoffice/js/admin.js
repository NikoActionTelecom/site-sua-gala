let authToken = '';
let allData = { registrations: [], stats: {} };

// === Auth ===
const loginOverlay = document.getElementById('loginOverlay');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Check saved token
const saved = sessionStorage.getItem('sua_token');
if (saved) {
  authToken = saved;
  showApp();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    loginError.textContent = 'Veuillez remplir les deux champs';
    loginError.style.display = '';
    return;
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      authToken = data.token;
      sessionStorage.setItem('sua_token', authToken);
      showApp();
    } else {
      loginError.textContent = data.error || 'Identifiants incorrects';
      loginError.style.display = '';
    }
  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = 'Erreur de connexion au serveur';
    loginError.style.display = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('sua_token');
  authToken = '';
  loginOverlay.style.display = '';
  app.style.display = 'none';
});

function showApp() {
  loginOverlay.style.display = 'none';
  app.style.display = 'flex';
  loadData();
}

// === API ===
async function apiGet(url) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Basic ${authToken}` }
  });
  if (res.status === 401) {
    sessionStorage.removeItem('sua_token');
    location.reload();
    return null;
  }
  return res.json();
}

async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Basic ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Basic ${authToken}` }
  });
  return res.json();
}

// === Load data ===
async function loadData(params = {}) {
  const query = new URLSearchParams(params).toString();
  const data = await apiGet(`/api/admin/registrations?${query}`);
  if (!data) return;
  allData = data;
  renderDashboard();
  renderTable('gala');
  renderTable('mousquetaire');
  renderRecent();
}

// === Dashboard ===
function renderDashboard() {
  const s = allData.stats;
  document.getElementById('statTotal').textContent = s.total;
  document.getElementById('statGala').textContent = s.gala;
  document.getElementById('statMousq').textContent = s.mousquetaire;
  document.getElementById('statConfirmes').textContent = s.confirmes;
  document.getElementById('statEnAttente').textContent = s.enAttente;
  document.getElementById('statPaiements').textContent = s.paiementsRecus;
  document.getElementById('statPersonnes').textContent = s.totalPersonnesGala;
  document.getElementById('statMontant').innerHTML = formatMoney(s.montantTotal);

  // Category bars
  const cats = s.parCategorie;
  const maxCat = Math.max(cats.porthos, cats.athos, cats.aramis, cats.dartagnan, 1);
  ['porthos', 'athos', 'aramis', 'dartagnan'].forEach(cat => {
    const key = cat.charAt(0).toUpperCase() + cat.slice(1);
    document.getElementById(`bar${key}`).style.width = `${(cats[cat] / maxCat) * 100}%`;
    document.getElementById(`count${key}`).textContent = cats[cat];
  });
}

// === Tables ===
function renderTable(type) {
  const bodyId = type === 'gala' ? 'galaBody' : 'mousqBody';
  const tbody = document.getElementById(bodyId);
  const filtered = allData.registrations.filter(r => r.type === type);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Aucune inscription</td></tr>`;
    return;
  }

  if (type === 'gala') {
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>${formatDate(r.dateInscription)}</td>
        <td><span class="badge badge-blue">${r.profil}</span></td>
        <td><strong>${escHtml(r.nom)} ${escHtml(r.prenom)}</strong></td>
        <td>${escHtml(r.email)}</td>
        <td>${escHtml(r.telephone)}</td>
        <td>${r.nombrePersonnes || '-'}</td>
        <td>${r.montantDon ? formatMoney(r.montantDon) : '-'}</td>
        <td>${statutBadge(r.statut)}</td>
        <td>${paiementBadge(r.paiement)}</td>
        <td><button class="btn-icon" onclick="openDetail('${r.id}')">Voir</button></td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>${formatDate(r.dateInscription)}</td>
        <td><span class="badge badge-blue">${r.profil}</span></td>
        <td><strong>${escHtml(r.nom)} ${escHtml(r.prenom)}</strong></td>
        <td>${escHtml(r.raisonSociale || '-')}</td>
        <td>${escHtml(r.email)}</td>
        <td>${escHtml(r.telephone)}</td>
        <td><span class="badge badge-gold">${categorieName(r.categorie)}</span></td>
        <td>${statutBadge(r.statut)}</td>
        <td>${paiementBadge(r.paiement)}</td>
        <td><button class="btn-icon" onclick="openDetail('${r.id}')">Voir</button></td>
      </tr>
    `).join('');
  }
}

function renderRecent() {
  const tbody = document.getElementById('recentBody');
  const recent = allData.registrations.slice(0, 10);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Aucune inscription</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(r => `
    <tr>
      <td>${formatDate(r.dateInscription)}</td>
      <td><span class="badge ${r.type === 'gala' ? 'badge-gold' : 'badge-blue'}">${r.type === 'gala' ? 'Gala' : 'Mousquetaire'}</span></td>
      <td><strong>${escHtml(r.nom)} ${escHtml(r.prenom)}</strong></td>
      <td>${escHtml(r.email)}</td>
      <td>${statutBadge(r.statut)}</td>
      <td>${paiementBadge(r.paiement)}</td>
      <td><button class="btn-icon" onclick="openDetail('${r.id}')">Voir</button></td>
    </tr>
  `).join('');
}

// === Detail Modal ===
async function openDetail(id) {
  const reg = await apiGet(`/api/admin/registrations/${id}`);
  if (!reg) return;

  const modal = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent =
    `${reg.nom} ${reg.prenom} - ${reg.type === 'gala' ? 'Soirée de Gala' : 'Mousquetaire'}`;

  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <label>Type</label>
        <p>${reg.type === 'gala' ? 'Soirée de Gala' : 'Mousquetaire d\'Armandie'}</p>
      </div>
      <div class="detail-item">
        <label>Profil</label>
        <p>${reg.profil === 'particulier' ? 'Particulier' : 'Entreprise'}</p>
      </div>
      <div class="detail-item">
        <label>Nom Prénom</label>
        <p>${escHtml(reg.nom)} ${escHtml(reg.prenom)}</p>
      </div>
      <div class="detail-item">
        <label>Email</label>
        <p>${escHtml(reg.email)}</p>
      </div>
      <div class="detail-item">
        <label>Téléphone</label>
        <p>${escHtml(reg.telephone)}</p>
      </div>
      <div class="detail-item">
        <label>Adresse</label>
        <p>${escHtml(reg.adresse || '-')}</p>
      </div>
      ${reg.raisonSociale ? `
      <div class="detail-item">
        <label>Raison sociale</label>
        <p>${escHtml(reg.raisonSociale)}</p>
      </div>` : ''}
      ${reg.siret ? `
      <div class="detail-item">
        <label>SIRET</label>
        <p>${escHtml(reg.siret)}</p>
      </div>` : ''}
      <div class="detail-item">
        <label>Club affilié</label>
        <p>${escHtml(reg.clubAffilie || '-')}</p>
      </div>
      ${reg.type === 'gala' ? `
      <div class="detail-item">
        <label>Nombre de personnes</label>
        <p>${reg.nombrePersonnes || '-'}</p>
      </div>
      <div class="detail-item">
        <label>Montant du don</label>
        <p>${reg.montantDon ? formatMoney(reg.montantDon) : '-'}</p>
      </div>` : ''}
      ${reg.type === 'mousquetaire' ? `
      <div class="detail-item">
        <label>Catégorie</label>
        <p><span class="badge badge-gold">${categorieName(reg.categorie)}</span></p>
      </div>` : ''}
      <div class="detail-item">
        <label>Règlement</label>
        <p>${reg.reglement === 'virement' ? 'Virement bancaire' : reg.reglement === 'cheque' ? 'Chèque' : '-'}</p>
      </div>
      <div class="detail-item">
        <label>Statut</label>
        <p>${statutBadge(reg.statut)}</p>
      </div>
      <div class="detail-item">
        <label>Paiement</label>
        <p>${paiementBadge(reg.paiement)}</p>
      </div>
      <div class="detail-item">
        <label>Date d'inscription</label>
        <p>${new Date(reg.dateInscription).toLocaleString('fr-FR')}</p>
      </div>
    </div>
    ${reg.commentaire ? `<div class="detail-item" style="margin-bottom:16px"><label>Commentaire</label><p>${escHtml(reg.commentaire)}</p></div>` : ''}
    <div class="notes-area">
      <label style="display:block;font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;margin-bottom:4px">Notes internes</label>
      <textarea id="notesField" rows="3" placeholder="Notes internes...">${escHtml(reg.notes || '')}</textarea>
      <button class="btn btn-sm btn-outline" style="margin-top:8px" onclick="saveNotes('${reg.id}')">Sauvegarder notes</button>
    </div>
    <div class="detail-actions">
      ${reg.statut !== 'confirme' ? `<button class="btn btn-sm btn-success" onclick="updateStatus('${reg.id}','statut','confirme')">Confirmer</button>` : ''}
      ${reg.statut !== 'en_attente' ? `<button class="btn btn-sm btn-warning" onclick="updateStatus('${reg.id}','statut','en_attente')">En attente</button>` : ''}
      ${reg.statut !== 'annule' ? `<button class="btn btn-sm btn-outline" onclick="updateStatus('${reg.id}','statut','annule')">Annuler</button>` : ''}
      ${reg.paiement !== 'recu' ? `<button class="btn btn-sm btn-success" onclick="updateStatus('${reg.id}','paiement','recu')">Paiement reçu</button>` : `<button class="btn btn-sm btn-outline" onclick="updateStatus('${reg.id}','paiement','non_recu')">Marquer non reçu</button>`}
      <button class="btn btn-sm btn-danger" onclick="deleteReg('${reg.id}')">Supprimer</button>
    </div>
  `;

  modal.style.display = '';
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

async function updateStatus(id, field, value) {
  await apiPatch(`/api/admin/registrations/${id}`, { [field]: value });
  closeModal();
  loadData();
}

async function saveNotes(id) {
  const notes = document.getElementById('notesField').value;
  await apiPatch(`/api/admin/registrations/${id}`, { notes });
  alert('Notes sauvegardées');
}

async function deleteReg(id) {
  if (!confirm('Supprimer cette inscription ?')) return;
  await apiDelete(`/api/admin/registrations/${id}`);
  closeModal();
  loadData();
}

// === Export ===
function exportCSV(type) {
  const url = `/api/admin/export${type ? `?type=${type}` : ''}`;
  const a = document.createElement('a');
  // Need to fetch with auth
  fetch(url, { headers: { 'Authorization': `Basic ${authToken}` } })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = `inscriptions_${type || 'all'}_sua.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    });
}

// === Navigation ===
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const view = item.dataset.view;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById('viewTitle').textContent = item.textContent.trim();
    // Close mobile sidebar
    document.querySelector('.sidebar').classList.remove('open');
  });
});

// Mobile menu
document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

// === Filters & Search ===
document.querySelectorAll('.search-input').forEach(input => {
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const type = input.dataset.type;
      applyFilters(type);
    }, 300);
  });
});

document.querySelectorAll('.filter-select').forEach(select => {
  select.addEventListener('change', () => {
    const type = select.dataset.type;
    applyFilters(type);
  });
});

function applyFilters(type) {
  const container = document.getElementById(`view-${type}`);
  const search = container.querySelector('.search-input')?.value.toLowerCase() || '';
  const statut = container.querySelector('[data-filter="statut"]')?.value || '';
  const paiement = container.querySelector('[data-filter="paiement"]')?.value || '';

  let filtered = allData.registrations.filter(r => r.type === type);

  if (search) {
    filtered = filtered.filter(r =>
      r.nom.toLowerCase().includes(search) ||
      r.prenom.toLowerCase().includes(search) ||
      r.email.toLowerCase().includes(search) ||
      (r.raisonSociale && r.raisonSociale.toLowerCase().includes(search)) ||
      (r.clubAffilie && r.clubAffilie.toLowerCase().includes(search))
    );
  }
  if (statut) filtered = filtered.filter(r => r.statut === statut);
  if (paiement) filtered = filtered.filter(r => r.paiement === paiement);

  const bodyId = type === 'gala' ? 'galaBody' : 'mousqBody';
  const tbody = document.getElementById(bodyId);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Aucun résultat</td></tr>`;
    return;
  }

  if (type === 'gala') {
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>${formatDate(r.dateInscription)}</td>
        <td><span class="badge badge-blue">${r.profil}</span></td>
        <td><strong>${escHtml(r.nom)} ${escHtml(r.prenom)}</strong></td>
        <td>${escHtml(r.email)}</td>
        <td>${escHtml(r.telephone)}</td>
        <td>${r.nombrePersonnes || '-'}</td>
        <td>${r.montantDon ? formatMoney(r.montantDon) : '-'}</td>
        <td>${statutBadge(r.statut)}</td>
        <td>${paiementBadge(r.paiement)}</td>
        <td><button class="btn-icon" onclick="openDetail('${r.id}')">Voir</button></td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>${formatDate(r.dateInscription)}</td>
        <td><span class="badge badge-blue">${r.profil}</span></td>
        <td><strong>${escHtml(r.nom)} ${escHtml(r.prenom)}</strong></td>
        <td>${escHtml(r.raisonSociale || '-')}</td>
        <td>${escHtml(r.email)}</td>
        <td>${escHtml(r.telephone)}</td>
        <td><span class="badge badge-gold">${categorieName(r.categorie)}</span></td>
        <td>${statutBadge(r.statut)}</td>
        <td>${paiementBadge(r.paiement)}</td>
        <td><button class="btn-icon" onclick="openDetail('${r.id}')">Voir</button></td>
      </tr>
    `).join('');
  }
}

// === Helpers ===
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function statutBadge(s) {
  const map = {
    'en_attente': '<span class="badge badge-warning">En attente</span>',
    'confirme': '<span class="badge badge-success">Confirmé</span>',
    'annule': '<span class="badge badge-error">Annulé</span>'
  };
  return map[s] || s;
}

function paiementBadge(p) {
  return p === 'recu'
    ? '<span class="badge badge-success">Reçu</span>'
    : '<span class="badge badge-warning">Non reçu</span>';
}

function categorieName(c) {
  const map = {
    'porthos': 'Porthos',
    'athos': 'Athos',
    'aramis': 'Aramis',
    'dartagnan': 'D\'Artagnan'
  };
  return map[c] || c || '-';
}
