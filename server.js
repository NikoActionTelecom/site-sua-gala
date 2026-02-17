const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'registrations.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'sualg2026';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Data helpers ---
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- Basic auth middleware for admin ---
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  const base64 = authHeader.split(' ')[1];
  const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return next();
  }
  return res.status(401).json({ error: 'Identifiants incorrects' });
}

// ============================
// PUBLIC API - Registration
// ============================

app.post('/api/register', (req, res) => {
  const {
    type, // 'gala' | 'mousquetaire'
    profil, // 'particulier' | 'entreprise'
    nom,
    prenom,
    raisonSociale,
    siret,
    email,
    telephone,
    adresse,
    clubAffilie,
    // Gala specific
    nombrePersonnes,
    montantDon,
    // Mousquetaire specific
    categorie, // 'porthos' | 'athos' | 'aramis' | 'dartagnan'
    // Payment
    reglement, // 'cheque' | 'virement'
    commentaire
  } = req.body;

  // Validation
  const errors = [];
  if (!type) errors.push('Type d\'inscription requis');
  if (!profil) errors.push('Profil requis');
  if (!nom) errors.push('Nom requis');
  if (!prenom) errors.push('Prénom requis');
  if (!email) errors.push('Email requis');
  if (!telephone) errors.push('Téléphone requis');
  if (profil === 'entreprise' && !raisonSociale) errors.push('Raison sociale requise');
  if (type === 'mousquetaire' && !categorie) errors.push('Catégorie Mousquetaire requise');
  if (type === 'gala' && !nombrePersonnes) errors.push('Nombre de personnes requis');

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const registrations = readData();

  // Check duplicate email + type
  const exists = registrations.find(r => r.email === email && r.type === type && r.statut !== 'annule');
  if (exists) {
    return res.status(409).json({ error: 'Une inscription avec cet email existe déjà pour ce type d\'événement.' });
  }

  const registration = {
    id: uuidv4(),
    type,
    profil,
    nom,
    prenom,
    raisonSociale: raisonSociale || '',
    siret: siret || '',
    email,
    telephone,
    adresse: adresse || '',
    clubAffilie: clubAffilie || '',
    nombrePersonnes: type === 'gala' ? (parseInt(nombrePersonnes) || 2) : null,
    montantDon: montantDon ? parseFloat(montantDon) : null,
    categorie: type === 'mousquetaire' ? categorie : null,
    reglement: reglement || '',
    commentaire: commentaire || '',
    statut: 'en_attente', // en_attente, confirme, annule
    paiement: 'non_recu', // non_recu, recu
    dateInscription: new Date().toISOString(),
    notes: ''
  };

  registrations.push(registration);
  writeData(registrations);

  res.status(201).json({
    message: 'Inscription enregistrée avec succès !',
    id: registration.id
  });
});

// ============================
// ADMIN API
// ============================

// Login check
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Identifiants incorrects' });
});

// Get all registrations
app.get('/api/admin/registrations', adminAuth, (req, res) => {
  const registrations = readData();
  const { type, statut, paiement, search } = req.query;

  let filtered = registrations;
  if (type) filtered = filtered.filter(r => r.type === type);
  if (statut) filtered = filtered.filter(r => r.statut === statut);
  if (paiement) filtered = filtered.filter(r => r.paiement === paiement);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.nom.toLowerCase().includes(s) ||
      r.prenom.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      (r.raisonSociale && r.raisonSociale.toLowerCase().includes(s)) ||
      (r.clubAffilie && r.clubAffilie.toLowerCase().includes(s))
    );
  }

  // Sort by date desc
  filtered.sort((a, b) => new Date(b.dateInscription) - new Date(a.dateInscription));

  // Stats
  const stats = {
    total: registrations.length,
    gala: registrations.filter(r => r.type === 'gala').length,
    mousquetaire: registrations.filter(r => r.type === 'mousquetaire').length,
    confirmes: registrations.filter(r => r.statut === 'confirme').length,
    enAttente: registrations.filter(r => r.statut === 'en_attente').length,
    annules: registrations.filter(r => r.statut === 'annule').length,
    paiementsRecus: registrations.filter(r => r.paiement === 'recu').length,
    totalPersonnesGala: registrations
      .filter(r => r.type === 'gala' && r.statut !== 'annule')
      .reduce((sum, r) => sum + (r.nombrePersonnes || 0), 0),
    montantTotal: registrations
      .filter(r => r.statut !== 'annule' && r.montantDon)
      .reduce((sum, r) => sum + r.montantDon, 0),
    parCategorie: {
      porthos: registrations.filter(r => r.categorie === 'porthos' && r.statut !== 'annule').length,
      athos: registrations.filter(r => r.categorie === 'athos' && r.statut !== 'annule').length,
      aramis: registrations.filter(r => r.categorie === 'aramis' && r.statut !== 'annule').length,
      dartagnan: registrations.filter(r => r.categorie === 'dartagnan' && r.statut !== 'annule').length,
    }
  };

  res.json({ registrations: filtered, stats });
});

// Get single registration
app.get('/api/admin/registrations/:id', adminAuth, (req, res) => {
  const registrations = readData();
  const reg = registrations.find(r => r.id === req.params.id);
  if (!reg) return res.status(404).json({ error: 'Inscription non trouvée' });
  res.json(reg);
});

// Update registration
app.patch('/api/admin/registrations/:id', adminAuth, (req, res) => {
  const registrations = readData();
  const idx = registrations.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Inscription non trouvée' });

  const allowed = ['statut', 'paiement', 'notes', 'nombrePersonnes', 'montantDon', 'categorie'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      registrations[idx][key] = req.body[key];
    }
  }
  registrations[idx].dateMaj = new Date().toISOString();

  writeData(registrations);
  res.json(registrations[idx]);
});

// Delete registration
app.delete('/api/admin/registrations/:id', adminAuth, (req, res) => {
  let registrations = readData();
  const idx = registrations.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Inscription non trouvée' });

  registrations.splice(idx, 1);
  writeData(registrations);
  res.json({ message: 'Inscription supprimée' });
});

// Export CSV
app.get('/api/admin/export', adminAuth, (req, res) => {
  const registrations = readData();
  const { type } = req.query;
  let data = registrations;
  if (type) data = data.filter(r => r.type === type);

  const headers = [
    'Type', 'Statut', 'Paiement', 'Profil', 'Nom', 'Prénom', 'Raison Sociale',
    'SIRET', 'Email', 'Téléphone', 'Adresse', 'Club', 'Catégorie',
    'Nb Personnes', 'Montant Don', 'Règlement', 'Commentaire', 'Date Inscription'
  ];

  const rows = data.map(r => [
    r.type, r.statut, r.paiement, r.profil, r.nom, r.prenom, r.raisonSociale,
    r.siret, r.email, r.telephone, r.adresse, r.clubAffilie, r.categorie || '',
    r.nombrePersonnes || '', r.montantDon || '', r.reglement, r.commentaire,
    new Date(r.dateInscription).toLocaleDateString('fr-FR')
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // BOM for Excel UTF-8
  const bom = '\uFEFF';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=inscriptions_sua.csv');
  res.send(bom + csvContent);
});

// Serve backoffice
app.get('/backoffice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backoffice', 'index.html'));
});

// Lien différencié Mousquetaires (redirige vers la page principale avec paramètre)
app.get('/mousquetaires', (req, res) => {
  res.redirect('/?type=mousquetaire');
});

app.listen(PORT, () => {
  console.log(`Serveur SUA Gala démarré sur http://localhost:${PORT}`);
  console.log(`Backoffice: http://localhost:${PORT}/backoffice`);
  console.log(`Admin: ${ADMIN_USER} / ${ADMIN_PASS}`);
});
