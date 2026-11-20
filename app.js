// Migration from Aura keys to Pulse keys if present
(function migrateStorageKeys() {
  const keys = [
    'theme', 'profiles_list', 'active_profile_id', 'pin_code', 'appointments',
    'therapies', 'cabinet', 'symptoms', 'radar', 'custom_hub'
  ];
  keys.forEach(k => {
    const oldVal = localStorage.getItem('aura_' + k);
    if (oldVal !== null && localStorage.getItem('pulse_' + k) === null) {
      localStorage.setItem('pulse_' + k, oldVal);
    }
  });
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('aura_profile_')) {
      const suffix = key.substring('aura_profile_'.length);
      if (localStorage.getItem('pulse_profile_' + suffix) === null) {
        localStorage.setItem('pulse_profile_' + suffix, localStorage.getItem(key));
      }
    } else if (key && key.startsWith('aura_vision_')) {
      const suffix = key.substring('aura_vision_'.length);
      if (localStorage.getItem('pulse_vision_' + suffix) === null) {
        localStorage.setItem('pulse_vision_' + suffix, localStorage.getItem(key));
      }
    }
  }
})();

// Pulse Application Logic - Master Upgrade v2.5 (Bug Free & Event Delegation)
document.addEventListener('DOMContentLoaded', async () => {
  // Richiesta persistenza storage locale (iOS/Safari/Chrome Local Storage Protection)
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(persisted => {
      // Storage is secured locally
    }).catch(() => {});
  }

  initTheme();
  initProfilesState();
  initPinSecurity();
  await initSeedData();
  initNavigation();
  initCalendar();
  initAppointments();
  initDocumentsView();
  initAddDocumentModal();
  initTax730();
  initPharmacyMode();
  initTherapyTracker();
  initSymptomsDiary();
  initPreventionRadar();
  initClinicalSummaryPDF();
  initProfile();
  initDoctorModal();
  initQuickHub();
  initGlobalModalsHandler();
  await renderAllViews();
});

// Toast Dynamic Island notification
function showToast(message, icon = '✓') {
  const toast = document.getElementById('dynamicToast');
  if (!toast) return;
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// Global Modal Backdrop & ESC handler
function initGlobalModalsHandler() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// 1. Theme Toggle
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const saved = localStorage.getItem('pulse_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pulse_theme', next);
    updateThemeIcon(next);
    showToast(`Modalità ${next === 'dark' ? 'Scura' : 'Chiara'} attivata`, '🌓');
  });
}

function updateThemeIcon(theme) {
  const iconContainer = document.getElementById('themeToggleBtn');
  if (!iconContainer) return;
  iconContainer.innerHTML = theme === 'dark' ? window.PULSE_ICONS.sun : window.PULSE_ICONS.moon;
}

// 2. Multi-Profile Management
function getProfiles() {
  const list = localStorage.getItem('pulse_profiles_list');
  if (!list) {
    const defaultList = [
      { id: 'me', name: 'Io' },
      { id: 'family_1', name: 'Familiare' }
    ];
    localStorage.setItem('pulse_profiles_list', JSON.stringify(defaultList));
    return defaultList;
  }
  return JSON.parse(list);
}

function getActiveProfileId() {
  return localStorage.getItem('pulse_active_profile_id') || 'me';
}

async function setActiveProfileId(id) {
  localStorage.setItem('pulse_active_profile_id', id);
  updateProfilePill();
  await renderAllViews();
}

function initProfilesState() {
  updateProfilePill();
  const pillBtn = document.getElementById('profilePillBtn');
  pillBtn.addEventListener('click', openProfileSwitcher);

  const newProfileForm = document.getElementById('newProfileForm');
  newProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newProfileNameInput').value.trim();
    if (!name) return;
    const id = 'prof_' + Date.now();
    const profiles = getProfiles();
    profiles.push({ id, name });
    localStorage.setItem('pulse_profiles_list', JSON.stringify(profiles));

    const newProfileData = {
      name: name,
      cf: '',
      bloodType: '0 Rh+',
      allergies: '',
      doctor: '',
      doctorPhone: '',
      doctorEmail: ''
    };
    localStorage.setItem(`pulse_profile_${id}`, JSON.stringify(newProfileData));

    closeAllModals();
    newProfileForm.reset();
    await setActiveProfileId(id);
    showToast(`Profilo "${name}" creato e attivato`, '👤');
  });
}

function updateProfilePill() {
  const activeId = getActiveProfileId();
  const profiles = getProfiles();
  const current = profiles.find(p => p.id === activeId) || profiles[0] || { id: 'me', name: 'Io' };
  const label = document.getElementById('profilePillName');
  if (label) label.innerText = current.name;
  const desktopLabel = document.getElementById('desktopProfilePillName');
  if (desktopLabel) desktopLabel.innerText = current.name;
}

function openProfileSwitcher() {
  const activeId = getActiveProfileId();
  const profiles = getProfiles();
  const listContainer = document.getElementById('profileSwitchList');

  listContainer.innerHTML = profiles.map(p => `
    <div class="glass-card" style="padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-color: ${p.id === activeId ? 'var(--accent-coral)' : 'var(--border-glass)'};" onclick="selectProfile('${p.id}')">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${p.id === activeId ? 'rgba(255,45,85,0.15)' : 'var(--bg-card-secondary)'}; color: ${p.id === activeId ? 'var(--accent-coral)' : 'var(--text-primary)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
          ${escapeHTML(p.name.substring(0, 2).toUpperCase())}
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700;">${escapeHTML(p.name)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${p.id === activeId ? 'Attivo' : 'Tocca per selezionare'}</div>
        </div>
      </div>
      ${p.id === activeId ? '<span style="color: var(--accent-coral); font-weight: 700;">✓</span>' : ''}
    </div>
  `).join('');

  openModal('profileSwitcherModalOverlay');
}

async function selectProfile(id) {
  closeAllModals();
  await setActiveProfileId(id);
  showToast('Profilo selezionato', '👤');
}

// 3. PIN Security & Privacy Lock
let currentPinInput = '';

function initPinSecurity() {
  const lockBtn = document.getElementById('headerLockBtn');
  lockBtn.addEventListener('click', triggerManualLock);

  document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => {
      const val = key.dataset.val;
      if (val === 'del') {
        currentPinInput = currentPinInput.slice(0, -1);
      } else if (currentPinInput.length < 4) {
        currentPinInput += val;
      }
      updatePinDots();
      if (currentPinInput.length === 4) {
        verifyPinCode();
      }
    });
  });

  const pinToggle = document.getElementById('pinSecurityToggle');
  const savedPin = localStorage.getItem('pulse_pin_code');
  if (pinToggle) {
    pinToggle.checked = !!savedPin;
    pinToggle.addEventListener('change', () => {
      if (pinToggle.checked) {
        openModal('setupPinModalOverlay');
      } else {
        localStorage.removeItem('pulse_pin_code');
        showToast('Blocco PIN disattivato', '🔓');
      }
    });
  }

  const setupForm = document.getElementById('setupPinForm');
  if (setupForm) {
    setupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const p1 = document.getElementById('pinInput1').value;
      const p2 = document.getElementById('pinInput2').value;
      if (p1.length !== 4 || isNaN(p1)) {
        alert('Il PIN deve essere di 4 cifre numeriche.');
        return;
      }
      if (p1 !== p2) {
        alert('I due PIN non coincidono.');
        return;
      }
      localStorage.setItem('pulse_pin_code', btoa(p1));
      closeAllModals();
      setupForm.reset();
      showToast('PIN a 4 cifre salvato!', '🔒');
      if (pinToggle) pinToggle.checked = true;
    });
  }

  if (savedPin) {
    triggerManualLock();
  }
}

function triggerManualLock() {
  const savedPin = localStorage.getItem('pulse_pin_code');
  if (!savedPin) {
    openModal('setupPinModalOverlay');
    return;
  }
  currentPinInput = '';
  updatePinDots();
  const overlay = document.getElementById('pinLockScreenOverlay');
  overlay.classList.add('active');
  document.body.classList.add('modal-open');
}

function updatePinDots() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`pinDot${i}`);
    if (dot) dot.classList.toggle('filled', i <= currentPinInput.length);
  }
}

function verifyPinCode() {
  const savedPin = localStorage.getItem('pulse_pin_code');
  if (btoa(currentPinInput) === savedPin) {
    const overlay = document.getElementById('pinLockScreenOverlay');
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    currentPinInput = '';
    updatePinDots();
    showToast('Pulse sbloccata', '🔓');
  } else {
    const dotsRow = document.querySelector('.pin-dots-row');
    dotsRow.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate([80, 80, 80]);
    setTimeout(() => {
      dotsRow.classList.remove('shake');
      currentPinInput = '';
      updatePinDots();
    }, 450);
  }
}

// 4. Seed Demo Data
async function initSeedData() {
  const docs = await pulseDB.getAllDocuments();
  if (!docs || docs.length === 0) {
    const demoDocs = [
      {
        id: 'doc_' + Date.now() + '_1',
        profileId: 'me',
        title: 'Analisi Sangue di Routine (Emocromo & Lipidi)',
        bodyZone: 'blood',
        category: 'Referto',
        date: '2026-11-05',
        nre: '',
        notes: 'Tutti i valori nella norma. Colesterolo totale 178 mg/dl.',
        isDeductible730: false,
        amount: null,
        imageData: generateDemoPlaceholder('ANALISI SANGUE - CLINICA SANT\'ORSOLA', 'Emocromo: globuli bianchi 6.4, glicemia 88, colesterolo 178.'),
        createdAt: Date.now() - 86400000 * 14
      },
      {
        id: 'doc_' + Date.now() + '_2',
        profileId: 'me',
        title: 'Prescrizione Amoxicillina 1g per Infezione',
        bodyZone: 'pharma',
        category: 'Ricetta',
        date: '2026-11-12',
        nre: '0800P9384729103',
        isUsedRx: false,
        notes: '1 compressa ogni 12 ore per 6 giorni.',
        isDeductible730: false,
        amount: null,
        imageData: generateDemoPlaceholder('RICETTA SSN - DOTT.SSA BIANCHI', 'Prescrizione antibiotico: Amoxicillina e acido clavulanico.'),
        createdAt: Date.now() - 86400000 * 7
      },
      {
        id: 'doc_' + Date.now() + '_3',
        profileId: 'me',
        title: 'Fattura Igiene Orale & Radiografia Panoramica',
        bodyZone: 'dental',
        category: 'Fattura',
        date: '2026-11-10',
        nre: '',
        notes: 'Studio Dentistico Rossi. Pagamento tracciato Bancomat.',
        isDeductible730: true,
        amount: 110.00,
        refundedAmount: 40.00,
        taxCategory: 'Visite Specialistiche',
        paymentMethod: 'tracciabile',
        imageData: generateDemoPlaceholder('FATTURA SANITARIA N. 42', 'Igiene orale e radiografia endorale. Totale € 110,00.'),
        createdAt: Date.now() - 86400000 * 9
      },
      {
        id: 'doc_' + Date.now() + '_4',
        profileId: 'me',
        title: 'Fattura Mappatura Nei Dermatologica',
        bodyZone: 'derma',
        category: 'Fattura',
        date: '2026-10-15',
        nre: '',
        notes: 'Controllo nevi in epiluminescenza. Carta di credito.',
        isDeductible730: true,
        amount: 140.00,
        refundedAmount: 0.00,
        taxCategory: 'Visite Specialistiche',
        paymentMethod: 'tracciabile',
        imageData: generateDemoPlaceholder('FATTURA VISITA DERMATOLOGICA', 'Mappatura nei. Importo versato € 140,00 con POS.'),
        createdAt: Date.now() - 86400000 * 35
      },
      {
        id: 'doc_' + Date.now() + '_5',
        profileId: 'me',
        title: 'Scontrino Farmacia Comunale (Farmaci + Dispositivi)',
        bodyZone: 'pharma',
        category: 'Fattura',
        date: '2026-11-02',
        nre: '',
        notes: 'Farmaci prescritti con CF parlante.',
        isDeductible730: true,
        amount: 45.50,
        refundedAmount: 0.00,
        taxCategory: 'Farmaci',
        paymentMethod: 'tracciabile',
        imageData: generateDemoPlaceholder('SCONTRINO PARLANTE FARMACIA', 'Totale farmaci detraibili € 45,50.'),
        createdAt: Date.now() - 86400000 * 17
      }
    ];

    for (const d of demoDocs) {
      await pulseDB.saveDocument(d);
    }
  }

  if (!localStorage.getItem('pulse_appointments')) {
    const today = new Date();
    const apptDate1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 30);
    const apptDate2 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 16, 0);

    const demoAppts = [
      {
        id: 'app_1',
        profileId: 'me',
        title: 'Visita Cardiologica & ECG',
        datetime: apptDate1.toISOString(),
        location: 'Ospedale Maggiore — Poliambulatorio B',
        notes: 'Portare referti precedenti ed essere a digiuno da 2 ore.',
        docId: docs && docs[1] ? docs[1].id : '',
        checklist: [
          { text: 'Chiedere se ridurre caffè a 1 al giorno', done: false },
          { text: 'Confermare idoneità per corsa amatoriale', done: true },
          { text: 'Mostrare esami sangue del 05/11', done: false }
        ]
      },
      {
        id: 'app_2',
        profileId: 'me',
        title: 'Controllo Oculistico Fondo Oculare',
        datetime: apptDate2.toISOString(),
        location: 'Centro Medico Santagostino',
        notes: 'Portare occhiali attuali.',
        docId: '',
        checklist: [
          { text: 'Verificare lieve calo visus occhio sinistro', done: false }
        ]
      }
    ];
    localStorage.setItem('pulse_appointments', JSON.stringify(demoAppts));
  }

  if (!localStorage.getItem('pulse_profile_me') && !localStorage.getItem('pulse_profile')) {
    const defaultProfile = {
      name: 'Mario Rossi',
      cf: 'RSSMRA85M01H501Z',
      bloodType: '0 Rh+',
      allergies: 'Penicillina, Polline di Graminacee',
      doctor: 'Dr. Marco Rossi',
      doctorPhone: '+39 051 1234567',
      doctorWa: '3401234567',
      doctorEmail: 'dr.rossi@medicina.it',
      doctorAddress: 'Via Roma 14, Bologna',
      doctorNotes: 'Riceve su appuntamento • Segreteria attiva 08:30–11:30',
      doctorHours: {
        lun: '09:00 - 12:00',
        mar: '15:00 - 18:00',
        mer: '09:00 - 12:00',
        gio: '15:00 - 18:00',
        ven: '09:00 - 12:00'
      }
    };
    localStorage.setItem('pulse_profile_me', JSON.stringify(defaultProfile));
    localStorage.setItem('pulse_profile', JSON.stringify(defaultProfile));
  }

  if (!localStorage.getItem('pulse_therapies')) {
    const todayStr = new Date().toISOString().split('T')[0];
    const demoTherapies = [
      {
        id: 'ther_1',
        profileId: 'me',
        name: 'Amoxicillina 1g',
        dosesPerDay: 2,
        durationDays: 6,
        startDate: todayStr,
        notes: 'Dopo i pasti (ore 8:30 e 20:30)',
        times: ['08:30', '20:30'],
        logs: { [todayStr]: [true, false] }
      }
    ];
    localStorage.setItem('pulse_therapies', JSON.stringify(demoTherapies));
  }

  if (!localStorage.getItem('pulse_cabinet')) {
    const demoCabinet = [
      {
        id: 'cab_1',
        profileId: 'me',
        name: 'Tachipirina 1000mg',
        quantity: '12 compresse',
        expiryDate: '2027-08-31',
        notes: 'Per febbre e dolori muscolari'
      },
      {
        id: 'cab_2',
        profileId: 'me',
        name: 'Collirio Antistaminico',
        quantity: 'Flaconcino aperto',
        expiryDate: new Date(Date.now() + 86400000 * 25).toISOString().split('T')[0],
        notes: 'Usare per allergia stagionale'
      }
    ];
    localStorage.setItem('pulse_cabinet', JSON.stringify(demoCabinet));
  }

  if (!localStorage.getItem('pulse_vision_me')) {
    const demoVision = {
      odSph: '-1.50',
      odCyl: '-0.50',
      odAxis: '90°',
      osSph: '-1.75',
      osCyl: '-0.25',
      osAxis: '85°',
      dip: '63 mm',
      date: '2026-05-18'
    };
    localStorage.setItem('pulse_vision_me', JSON.stringify(demoVision));
  }

  if (!localStorage.getItem('pulse_symptoms')) {
    const today = new Date();
    const demoSymptoms = [
      {
        id: 'sym_1',
        profileId: 'me',
        type: 'Pressione',
        val: '120/80 mmHg',
        note: 'Misurata a riposo',
        datetime: new Date(today.getTime() - 86400000 * 2).toISOString()
      },
      {
        id: 'sym_2',
        profileId: 'me',
        type: 'Febbre',
        val: '37.8 °C',
        note: 'Brividi serali',
        datetime: new Date(today.getTime() - 86400000 * 1).toISOString()
      }
    ];
    localStorage.setItem('pulse_symptoms', JSON.stringify(demoSymptoms));
  }

  if (!localStorage.getItem('pulse_radar')) {
    const demoRadar = [
      { id: 'rad_dent', profileId: 'me', name: 'Igiene Dentale', months: 6, lastDate: '2026-05-10', iconId: 'dental' },
      { id: 'rad_blood', profileId: 'me', name: 'Analisi del Sangue', months: 12, lastDate: '2026-11-05', iconId: 'blood' },
      { id: 'rad_eyes', profileId: 'me', name: 'Visita Oculistica', months: 12, lastDate: '2025-10-12', iconId: 'eyes' },
      { id: 'rad_derma', profileId: 'me', name: 'Mappatura Nei', months: 12, lastDate: '2026-10-15', iconId: 'derma' }
    ];
    localStorage.setItem('pulse_radar', JSON.stringify(demoRadar));
  }
}

function generateDemoPlaceholder(title, text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#ffffff" />
    <rect x="30" y="30" width="540" height="740" fill="none" stroke="#e0e0e0" stroke-width="2" rx="8"/>
    <rect x="60" y="60" width="80" height="80" rx="12" fill="#007AFF" opacity="0.1"/>
    <text x="100" y="108" font-family="-apple-system, sans-serif" font-size="28" font-weight="bold" fill="#FF2D55" text-anchor="middle">PULSE</text>
    <text x="60" y="180" font-family="-apple-system, sans-serif" font-size="22" font-weight="bold" fill="#1C1C1E">${title}</text>
    <line x1="60" y1="205" x2="540" y2="205" stroke="#007AFF" stroke-width="2"/>
    <text x="60" y="250" font-family="-apple-system, sans-serif" font-size="16" fill="#3A3A3C">${text}</text>
    <rect x="60" y="300" width="480" height="80" rx="8" fill="#F2F2F7"/>
    <text x="80" y="345" font-family="-apple-system, sans-serif" font-size="14" fill="#8E8E93">DOCUMENTO DIGITALE ARCHIVIATO IN LOCALE</text>
    <text x="60" y="730" font-family="-apple-system, sans-serif" font-size="12" fill="#AEAEB2">Firma e Timbro digitale • Crittografia dispositivo</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Navigation Tabs
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      switchTab(target);
    });
  });

  const headerCalBtn = document.getElementById('headerCalendarBtn');
  if (headerCalBtn) {
    headerCalBtn.addEventListener('click', () => {
      switchTab('agenda');
      const calSegBtn = document.getElementById('segAgendaCal');
      if (calSegBtn) calSegBtn.click();
    });
  }

  const fabAdd = document.getElementById('fabAddDoc');
  if (fabAdd) {
    fabAdd.addEventListener('click', () => {
      openAddDocModal();
    });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.desktop-nav-btn').forEach(b => b.classList.remove('active'));

  const view = document.getElementById(`tab-${tabId}`);
  const btn = document.querySelector(`.nav-tab-btn[data-target="${tabId}"]`);
  const desktopBtn = document.querySelector(`.desktop-nav-btn[data-target="${tabId}"]`);
  if (view) view.classList.add('active');
  if (btn) btn.classList.add('active');
  if (desktopBtn) desktopBtn.classList.add('active');

  if (tabId === 'agenda') {
    renderCalendar();
    renderPreventionRadar();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render Master Views
async function renderAllViews() {
  await renderHome();
  await renderArchiveGrid();
  renderAppointments();
  renderCalendar();
  renderProfile();
  renderTax730Dashboard();
  renderTherapies();
  renderSymptoms();
  renderPreventionRadar();
}

// 5. Home View
async function renderHome() {
  const heroOggi = document.getElementById('homeHeroOggi');
  const recentContainer = document.getElementById('homeRecentDocs');
  const activeProfile = getActiveProfileId();
  const profile = getProfileData(activeProfile);
  const now = new Date();

  // Calcola data estesa in italiano
  const dateStrOggi = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalizedDate = dateStrOggi.charAt(0).toUpperCase() + dateStrOggi.slice(1);

  // Calcola terapie e anello di oggi
  const thers = JSON.parse(localStorage.getItem('pulse_therapies') || '[]');
  const profileThers = thers.filter(t => !t.profileId || t.profileId === activeProfile);
  const todayIso = now.toISOString().split('T')[0];

  let totalDosesToday = 0;
  let takenDosesToday = 0;
  profileThers.forEach(t => {
    totalDosesToday += t.dosesPerDay || 1;
    const logs = (t.logs && t.logs[todayIso]) || [];
    takenDosesToday += logs.filter(Boolean).length;
  });

  const ringPct = totalDosesToday > 0 ? Math.round((takenDosesToday / totalDosesToday) * 100) : 100;
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const strokeDash = (ringPct / 100) * circ;

  // Prossimo Appuntamento
  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const profileAppts = allAppts.filter(a => !a.profileId || a.profileId === activeProfile);
  const future = profileAppts
    .filter(a => new Date(a.datetime) >= now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  let apptHTML = '';
  if (future.length > 0) {
    const next = future[0];
    const dt = new Date(next.datetime);
    const diffDays = Math.ceil((dt - now) / (1000 * 60 * 60 * 24));
    let badgeText = diffDays === 0 ? "Oggi!" : (diffDays === 1 ? "Domani" : `Tra ${diffDays} giorni`);
    const dateFormatted = dt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeFormatted = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    apptHTML = `
      <div style="margin-top: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge-countdown ${diffDays > 5 ? 'far' : ''}" style="font-size: 10px; padding: 2px 7px;">${badgeText}</span>
          <div class="hero-oggi-title">${escapeHTML(next.title)}</div>
        </div>
        <div class="hero-oggi-sub">
          <span>📅 ${dateFormatted}, ${timeFormatted}</span>
          <span>&bull;</span>
          <span>📍 ${escapeHTML(next.location || 'Ambulatorio')}</span>
          ${next.docId ? `<button onclick="openDocById('${next.docId}')" class="btn-secondary-sm" style="padding: 2px 6px; font-size: 10px; margin-left: 4px;">Doc 📄</button>` : ''}
        </div>
      </div>
    `;
  } else {
    apptHTML = `
      <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div class="hero-oggi-title" style="font-size: 15px; font-weight: 700;">Nessuna visita imminente</div>
          <div class="hero-oggi-sub">Pianifica controlli o visite specialistiche</div>
        </div>
        <button class="btn-secondary-sm" onclick="openNewApptModal()" style="padding: 4px 10px; font-size: 12px; margin-left: 8px;">+ Aggiungi</button>
      </div>
    `;
  }

  // Render BLOCCO A: Hero Oggi
  if (heroOggi) {
    heroOggi.innerHTML = `
      <div class="hero-oggi-inner">
        <div class="hero-oggi-left">
          <div class="hero-oggi-date">${capitalizedDate}</div>
          ${apptHTML}
        </div>
        <div class="hero-oggi-right">
          <div class="therapy-ring-wrap" style="width: 54px; height: 54px;">
            <svg width="54" height="54" viewBox="0 0 54 54">
              <circle cx="27" cy="27" r="${radius}" fill="none" stroke="var(--bg-card-secondary)" stroke-width="5" />
              <circle cx="27" cy="27" r="${radius}" fill="none" stroke="${totalDosesToday === 0 ? 'var(--accent-teal)' : 'var(--accent-coral)'}" stroke-width="5"
                stroke-dasharray="${circ}" stroke-dashoffset="${circ - strokeDash}"
                stroke-linecap="round" transform="rotate(-90 27 27)" style="transition: stroke-dashoffset 0.4s var(--spring-easing);" />
            </svg>
            <div style="position: absolute; font-size: ${totalDosesToday === 0 ? '16px' : '11px'}; font-weight: 800; color: ${totalDosesToday === 0 ? 'var(--accent-teal)' : 'var(--accent-coral)'};">
              ${totalDosesToday === 0 ? '✓' : `${takenDosesToday}/${totalDosesToday}`}
            </div>
          </div>
          <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-top: 4px; text-align: center;">
            ${totalDosesToday === 0 ? 'In ordine' : 'Dosi oggi'}
          </div>
        </div>
      </div>
    `;
  }

  // Render BLOCCO B: Bento 2x2 Widgets
  renderBentoWidgets();

  // Render BLOCCO D: Check-in Rapido
  renderCheckinStrip();

  // Render BLOCCO E: Ultimi nel Dossier (3 latest)
  const allDocs = await pulseDB.getAllDocuments();
  const profileDocs = allDocs.filter(d => !d.profileId || d.profileId === activeProfile);
  profileDocs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const recent = profileDocs.slice(0, 3);

  if (recentContainer) {
    if (recent.length === 0) {
      recentContainer.innerHTML = `
        <div class="empty-state" style="padding: 16px;">
          <div class="empty-text">Nessun documento nel Dossier</div>
          <div class="empty-sub">Scansiona o carica i tuoi referti per averli sempre con te.</div>
          <button class="btn-secondary-sm" style="margin: 8px auto 0; max-width: 200px;" onclick="openAddDocModal()">
            + Scansiona Referto
          </button>
        </div>
      `;
    } else {
      recentContainer.innerHTML = recent.map(doc => renderDocCardHTML(doc)).join('');
    }
  }
}

// 5.1 Bento 2x2 Widgets Update
async function renderBentoWidgets() {
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();
  const profileDocs = allDocs.filter(d => !d.profileId || d.profileId === activeProfile);

  // 1. Ricette & Farmacia
  const rxStatusEl = document.getElementById('widgetRxStatus');
  if (rxStatusEl) {
    const pendingRx = profileDocs.filter(d => (d.category === 'Ricetta' || d.nre) && !d.isUsedRx);
    if (pendingRx.length > 0) {
      rxStatusEl.innerHTML = `<span style="color: #34C759; font-weight: 700;">${pendingRx.length} ${pendingRx.length === 1 ? 'pronta' : 'pronte'}</span> da ritirare`;
    } else {
      rxStatusEl.innerText = 'Nessuna ricetta attiva';
    }
  }

  // 2. Armadietto
  const cabStatusEl = document.getElementById('widgetCabinetStatus');
  if (cabStatusEl) {
    const cabinetItems = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]').filter(c => !c.profileId || c.profileId === activeProfile);
    const nowTime = Date.now();
    const thresholdTime = nowTime + 60 * 86400000;
    let expiringCount = 0;
    cabinetItems.forEach(item => {
      if (item.expiryDate && new Date(item.expiryDate).getTime() <= thresholdTime) expiringCount++;
    });

    if (expiringCount > 0) {
      cabStatusEl.innerHTML = `<span style="color: var(--accent-amber); font-weight: 700;">● ${expiringCount} in scadenza</span>`;
    } else {
      cabStatusEl.innerText = `${cabinetItems.length} farmaci presenti`;
    }
  }

  // 3. Prevenzione
  const radarStatusEl = document.getElementById('widgetRadarStatus');
  if (radarStatusEl) {
    const radarItems = JSON.parse(localStorage.getItem('pulse_radar') || '[]').filter(r => !r.profileId || r.profileId === activeProfile);
    let dueCount = 0;
    const now = new Date();
    radarItems.forEach(r => {
      if (r.lastDate && r.intervalMonths) {
        const last = new Date(r.lastDate);
        const nextDate = new Date(last.setMonth(last.getMonth() + r.intervalMonths));
        if (nextDate <= now) dueCount++;
      }
    });

    if (dueCount > 0) {
      radarStatusEl.innerHTML = `<span style="color: var(--accent-coral); font-weight: 700;">● ${dueCount} da prenotare</span>`;
    } else {
      radarStatusEl.innerHTML = `<span style="color: var(--accent-teal); font-weight: 700;">✓ In regola</span> (${radarItems.length})`;
    }
  }

  // 4. Medico di Base
  const docNameEl = document.getElementById('widgetDoctorName');
  const docStatusEl = document.getElementById('widgetDoctorStatus');
  if (docNameEl && docStatusEl) {
    const profile = getProfileData(activeProfile);
    docNameEl.innerText = profile.doctor || 'Configura Medico';

    const schedule = calculateDoctorOpenStatus(profile);
    if (schedule.isOpen) {
      docStatusEl.innerHTML = `<span style="color: #34C759; font-weight: 700;">● Aperto</span> · fino alle ${schedule.closingTime}`;
    } else {
      docStatusEl.innerHTML = `<span style="color: var(--text-secondary);">Chiuso</span> · ${schedule.nextOpening}`;
    }
  }
}

// Calcola stato orario del medico in base all'ora corrente
function calculateDoctorOpenStatus(profile) {
  const hours = profile.doctorHours || {
    lun: '09:00 - 12:00',
    mar: '15:00 - 18:00',
    mer: '09:00 - 12:00',
    gio: '15:00 - 18:00',
    ven: '09:00 - 12:00'
  };

  const daysMap = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const now = new Date();
  const dayIndex = now.getDay();
  const dayKey = daysMap[dayIndex];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todayHours = hours[dayKey];
  if (todayHours && todayHours.includes('-')) {
    const [startStr, endStr] = todayHours.split('-').map(s => s.trim());
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);

    if (nowMin >= startMin && nowMin < endMin) {
      return { isOpen: true, closingTime: endStr };
    }
    if (nowMin < startMin) {
      return { isOpen: false, nextOpening: `Oggi ${startStr}` };
    }
  }

  // Cerca prossimo turno aperto nei giorni successivi
  for (let i = 1; i <= 7; i++) {
    const nextIdx = (dayIndex + i) % 7;
    const nextKey = daysMap[nextIdx];
    const nHours = hours[nextKey];
    if (nHours && nHours.includes('-')) {
      const dayLabel = i === 1 ? 'Domani' : dayNames[nextIdx].substring(0, 3);
      const startStr = nHours.split('-')[0].trim();
      return { isOpen: false, nextOpening: `${dayLabel} ${startStr}` };
    }
  }

  return { isOpen: false, nextOpening: 'Orario non impostato' };
}

// 5.2 Check-in Rapido
function renderCheckinStrip() {
  const displayVal = document.getElementById('checkinLatestValue');
  if (!displayVal) return;
  const activeProfile = getActiveProfileId();
  const symptoms = JSON.parse(localStorage.getItem('pulse_symptoms') || '[]').filter(s => !s.profileId || s.profileId === activeProfile);
  if (symptoms.length > 0) {
    const latest = symptoms[0];
    const dt = new Date(latest.datetime);
    const diffDays = Math.floor((Date.now() - dt.getTime()) / 86400000);
    const dayLabel = diffDays === 0 ? 'Oggi' : `${diffDays}g fa`;
    displayVal.innerText = `${latest.type}: ${latest.val} (${dayLabel})`;
  } else {
    displayVal.innerText = 'Nessun rilievo recente';
  }
}

function quickAddSymptom(type) {
  openModal('symptomsModalOverlay');
  const typeSelect = document.getElementById('symptomTypeSelect');
  if (typeSelect) {
    typeSelect.value = type;
    const valInput = document.getElementById('symptomValInput');
    if (valInput) {
      valInput.focus();
      valInput.placeholder = type === 'Pressione' ? 'Es. 120/80' : (type === 'Febbre' ? 'Es. 37.5 °C' : 'Descrivi sintomo...');
    }
  }
}

function renderDocCardHTML(doc) {
  const zone = getBodyZone(doc.bodyZone);
  const tagClass = 'tag-' + (doc.category || 'referto').toLowerCase();
  const dateStr = doc.date ? new Date(doc.date).toLocaleDateString('it-IT') : 'Data non specificata';

  return `
    <div class="doc-item-card" onclick="openDocById('${doc.id}')">
      <div class="doc-left">
        <div class="squircle-icon-badge" style="background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color};">
          ${zone.svg}
        </div>
        <div class="doc-info" style="overflow: hidden;">
          <div class="doc-title">${escapeHTML(doc.title)}</div>
          <div class="doc-sub">
            <span class="doc-tag ${tagClass}">${escapeHTML(doc.category || 'Referto')}</span>
            ${doc.amount ? `<span style="font-weight: 700; color: var(--accent-amber);">€ ${Number(doc.amount).toFixed(2)}</span>` : ''}
            <span>•</span>
            <span>${dateStr}</span>
          </div>
        </div>
      </div>
      <div style="color: var(--text-tertiary);">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  `;
}

// 6. Anatomical Archive
let currentSearch = '';
let currentFilterCategory = 'Tutti';

async function renderArchiveGrid() {
  const gridContainer = document.getElementById('bodyZonesGrid');
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();
  const profileDocs = allDocs.filter(d => !d.profileId || d.profileId === activeProfile);

  const counts = {};
  profileDocs.forEach(d => {
    counts[d.bodyZone] = (counts[d.bodyZone] || 0) + 1;
  });

  gridContainer.innerHTML = BODY_ZONES.map(zone => {
    const count = counts[zone.id] || 0;
    const countLabel = count === 0 ? 'Vuota' : (count === 1 ? '1 file' : `${count} file`);
    return `
      <div class="zone-card" onclick="openZoneFolder('${zone.id}')">
        <div class="squircle-icon-badge" style="background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color};">
          ${zone.svg}
        </div>
        <div class="zone-name">${zone.name}</div>
        <div class="zone-count">${countLabel}</div>
      </div>
    `;
  }).join('');
}

function initDocumentsView() {
  const searchInput = document.getElementById('docSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase();
      applyFilters();
    });
  }

  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilterCategory = chip.dataset.cat;
      applyFilters();
    });
  });
}

async function applyFilters() {
  const searchResultContainer = document.getElementById('archiveFilterResults');
  const grid = document.getElementById('bodyZonesGrid');
  const activeProfile = getActiveProfileId();

  if (!currentSearch && currentFilterCategory === 'Tutti') {
    searchResultContainer.style.display = 'none';
    grid.style.display = 'grid';
    return;
  }

  searchResultContainer.style.display = 'block';
  grid.style.display = 'none';

  const allDocs = await pulseDB.getAllDocuments();
  const filtered = allDocs.filter(d => {
    if (d.profileId && d.profileId !== activeProfile) return false;
    const matchCat = currentFilterCategory === 'Tutti' || d.category === currentFilterCategory;
    const matchSearch = !currentSearch ||
      (d.title && d.title.toLowerCase().includes(currentSearch)) ||
      (d.notes && d.notes.toLowerCase().includes(currentSearch)) ||
      (d.nre && d.nre.toLowerCase().includes(currentSearch));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    searchResultContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-text">Nessun documento trovato</div>
        <div class="empty-sub">Prova a modificare i filtri o la parola chiave di ricerca.</div>
      </div>
    `;
  } else {
    searchResultContainer.innerHTML = `
      <div class="doc-list">
        ${filtered.map(d => renderDocCardHTML(d)).join('')}
      </div>
    `;
  }
}

// Open Folder View
async function openZoneFolder(zoneId) {
  const zone = getBodyZone(zoneId);
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();
  const zoneDocs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && d.bodyZone === zoneId);

  const title = document.getElementById('folderViewTitle');
  const body = document.getElementById('folderViewContent');

  title.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <span style="display: inline-flex; align-items: center; gap: 10px;">
        <span class="squircle-icon-badge" style="width: 34px; height: 34px; min-width: 34px; border-radius: 10px; background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color};">
          ${zone.svg}
        </span>
        ${zone.name}
      </span>
      <button class="btn-secondary-sm" onclick="closeAllModals()" style="padding: 4px 10px; font-size: 12px; margin-right: 28px;">
        ← Dossier
      </button>
    </div>
  `;

  let extraHeaderHTML = '';

  if (zoneId === 'pharma') {
    extraHeaderHTML += `
      <div class="segmented-control" id="pharmaSegmentedControl">
        <button class="seg-btn active" onclick="switchPharmaTab('docs')">Documenti & Ricette</button>
        <button class="seg-btn" onclick="switchPharmaTab('cabinet')">Armadietto Casa</button>
      </div>
      <div id="pharmaCabinetViewWrap" style="display: none; margin-bottom: 16px;"></div>
    `;
  }

  if (zoneId === 'eyes') {
    extraHeaderHTML += `
      <div id="eyesVisionCardWrap" style="margin-bottom: 16px;"></div>
    `;
  }

  body.innerHTML = extraHeaderHTML + `
    <div id="folderDocsListWrap">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">${zoneDocs.length} ${zoneDocs.length === 1 ? 'documento' : 'documenti archiviati'}</span>
        <button class="btn-secondary-sm" style="color: var(--accent-coral); font-weight: 700; padding: 6px 12px;" onclick="closeAllModals(); openAddDocModal('${zoneId}')">
          + Aggiungi qui
        </button>
      </div>
      ${zoneDocs.length === 0 ? `
        <div class="empty-state">
          <div class="empty-text">Nessun documento in questa cartella</div>
          <div class="empty-sub">Aggiungi esami, referti o ricette legati a ${zone.name}.</div>
        </div>
      ` : `
        <div class="doc-list" style="margin-bottom: 20px;">
          ${zoneDocs.map(d => renderDocCardHTML(d)).join('')}
        </div>
      `}
      <button class="btn-secondary-sm" style="width: 100%; margin-top: 10px;" onclick="closeAllModals(); openAddDocModal('${zoneId}')">
        + Aggiungi qui in ${zone.name}
      </button>
    </div>
  `;

  openModal('folderModalOverlay');

  if (zoneId === 'pharma') {
    renderMedicineCabinetInFolder();
  }
  if (zoneId === 'eyes') {
    renderVisionCardInFolder();
  }
}

// 7. Viewer Modale
let currentViewerObjectUrl = null;

function cleanupViewerObjectUrl() {
  if (currentViewerObjectUrl) {
    URL.revokeObjectURL(currentViewerObjectUrl);
    currentViewerObjectUrl = null;
  }
}

async function openDocById(id) {
  const doc = await pulseDB.getDocument(id);
  if (!doc) {
    showToast('Documento non trovato', '⚠️');
    return;
  }

  cleanupViewerObjectUrl();

  let fileUrl = doc.imageData;
  if (doc.imageData && doc.imageData.startsWith('data:')) {
    try {
      const parts = doc.imageData.split(',');
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      currentViewerObjectUrl = URL.createObjectURL(blob);
      fileUrl = currentViewerObjectUrl;
    } catch (e) {
      fileUrl = doc.imageData;
    }
  }

  const zone = getBodyZone(doc.bodyZone);
  const viewerContent = document.getElementById('docViewerContent');
  const dateFormatted = doc.date ? new Date(doc.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non indicata';

  viewerContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
      <div class="squircle-icon-badge" style="background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color};">
        ${zone.svg}
      </div>
      <div>
        <h3 style="font-size: 17px; font-weight: 700;">${escapeHTML(doc.title)}</h3>
        <span class="doc-tag tag-${(doc.category || 'referto').toLowerCase()}">${escapeHTML(doc.category || 'Referto')}</span>
        ${doc.isDeductible730 ? '<span class="doc-tag" style="background: rgba(255,149,0,0.15); color: var(--accent-amber); margin-left: 4px;">Detraibile 730</span>' : ''}
      </div>
    </div>

    ${doc.amount ? `
      <div style="background: var(--bg-card-secondary); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; color: var(--text-secondary);">Importo:</span>
        <strong style="font-size: 16px; color: var(--accent-amber);">€ ${Number(doc.amount).toFixed(2)}</strong>
      </div>
    ` : ''}

    ${doc.nre ? `
      <div style="background: var(--bg-card-secondary); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 14px; text-align: center;">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">CODICE RICETTA NRE:</div>
        <div style="font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">${escapeHTML(doc.nre)}</div>
        <div style="background: #fff; padding: 8px; border-radius: 8px;">
          ${generateCode39SVG(doc.nre, 50, false)}
        </div>
      </div>
    ` : ''}

    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
      📅 Data documento: <strong style="color: var(--text-primary);">${dateFormatted}</strong>
    </div>

    ${doc.notes ? `
      <div style="background: var(--bg-card-secondary); padding: 12px; border-radius: var(--radius-md); font-size: 13px; line-height: 1.4; margin-bottom: 16px;">
        <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">NOTE CLINICHE:</div>
        <div>${escapeHTML(doc.notes)}</div>
      </div>
    ` : ''}

    <div style="background: #000; border-radius: var(--radius-md); overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 200px; max-height: 360px; margin-bottom: 16px;">
      ${doc.isPdf ? `
        <div style="text-align: center; color: #fff; padding: 30px;">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 8px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div style="font-weight: 600;">Documento PDF Protetto</div>
          <div style="font-size: 12px; opacity: 0.8;">Clicca 'Scarica' per visualizzare</div>
        </div>
      ` : `
        <img src="${fileUrl}" alt="${escapeHTML(doc.title)}" style="max-width: 100%; max-height: 340px; object-fit: contain;" />
      `}
    </div>

    <div style="display: flex; gap: 10px;">
      <a href="${fileUrl}" download="${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}${doc.isPdf ? '.pdf' : '.jpg'}" class="btn-secondary-sm" style="flex: 1; text-decoration: none; padding: 12px;" onclick="showToast('Download avviato', '⬇️')">
        Scarica File
      </a>
      <button class="btn-secondary-sm" style="color: var(--accent-coral); padding: 12px;" onclick="deleteDocItem('${doc.id}')">
        Elimina
      </button>
    </div>
  `;

  openModal('docViewerModalOverlay');
}

async function deleteDocItem(id) {
  if (confirm('Sei sicuro di voler eliminare questo documento da Pulse?')) {
    await pulseDB.deleteDocument(id);
    closeAllModals();
    showToast('Documento eliminato', '🗑️');
    await renderAllViews();
  }
}

// 8. Add / Scan Document Modal
let rawUploadedImage = null;
let currentRotation = 0;
let currentFilterMode = 'bw';
let selectedZoneId = 'blood';

function initAddDocumentModal() {
  const form = document.getElementById('addDocForm');
  const cameraInput = document.getElementById('scanCameraInput');
  const fileInput = document.getElementById('scanFileInput');
  const previewImg = document.getElementById('scanPreviewImg');
  const previewWrap = document.getElementById('scanPreviewWrap');
  const rotateBtn = document.getElementById('rotateScanBtn');
  const catSelect = document.getElementById('docCategorySelect');
  const taxFieldsWrap = document.getElementById('tax730ExtraFields');
  const filterSegmentBtns = document.querySelectorAll('#scanFilterSegments .seg-btn');

  catSelect.addEventListener('change', () => {
    const val = catSelect.value;
    taxFieldsWrap.style.display = (val === 'Fattura') ? 'block' : 'none';
  });

  const paymentSelect = document.getElementById('docPaymentMethodSelect');
  const taxCatSelect = document.getElementById('docTaxCategorySelect');
  const cashWarning = document.getElementById('cashPaymentWarning');

  function checkCashTraceability() {
    const isCash = paymentSelect.value === 'contanti';
    const isPrivateVisit = taxCatSelect.value === 'Visite Specialistiche';
    if (isCash && isPrivateVisit) {
      cashWarning.style.display = 'block';
      document.getElementById('docDeductibleToggle').checked = false;
    } else {
      cashWarning.style.display = 'none';
    }
  }

  paymentSelect.addEventListener('change', checkCashTraceability);
  taxCatSelect.addEventListener('change', checkCashTraceability);

  const picker = document.getElementById('zonePickerGrid');
  picker.innerHTML = BODY_ZONES.map(z => `
    <div class="zone-pick-item ${z.id === selectedZoneId ? 'selected' : ''}" data-zone="${z.id}" onclick="selectPickerZone('${z.id}')" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; padding: 6px; border-radius: 12px; border: 1.5px solid transparent;">
      <div class="squircle-icon-badge" style="width: 40px; height: 40px; min-width: 40px; border-radius: 12px; background: ${z.bg}; border: 1px solid ${z.border}; color: ${z.color};">
        ${z.svg}
      </div>
      <div style="font-size: 10px; margin-top: 4px; text-align: center; color: var(--text-secondary);">${z.name.split(' ')[0]}</div>
    </div>
  `).join('');

  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      if (!rawUploadedImage || rawUploadedImage.isPdf) return;
      currentRotation = (currentRotation + 90) % 360;
      processImageOptimization();
    });
  }

  filterSegmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterSegmentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilterMode = btn.dataset.filter || 'original';
      if (rawUploadedImage && !rawUploadedImage.isPdf) {
        processImageOptimization();
      }
    });
  });

  const handleFile = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const indicator = document.getElementById('pdfAnalyzingIndicator');
    const extractedPill = document.getElementById('pdfExtractedPill');
    const filtersWrap = document.getElementById('imageFiltersControlWrap');
    if (rotateBtn) rotateBtn.style.display = isPdf ? 'none' : 'inline-flex';
    if (filtersWrap) filtersWrap.style.display = isPdf ? 'none' : 'block';

    if (extractedPill) extractedPill.style.display = 'none';
    currentRotation = 0;

    const reader = new FileReader();
    reader.onload = async (e) => {
      rawUploadedImage = {
        dataUrl: e.target.result,
        isPdf: isPdf
      };
      if (isPdf) {
        previewWrap.style.display = 'block';
        previewImg.src = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23007AFF" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>');

        if (indicator) indicator.style.display = 'flex';
        try {
          const extractedText = await extractTextFromPDFDataUri(e.target.result);
          if (indicator) indicator.style.display = 'none';

          if (!extractedText || extractedText.trim().length < 20) {
            showToast('PDF scansionato: compila i campi manualmente', 'ℹ️');
          } else {
            const parsed = parseMedicalDocument(extractedText, file.name);
            applyParsedDataToForm(parsed);
            if (extractedPill) extractedPill.style.display = 'flex';
            showToast('Documento analizzato con successo!', '✨');
          }
        } catch (err) {
          if (indicator) indicator.style.display = 'none';
          showToast('PDF scansionato: compila i campi manualmente', 'ℹ️');
        }
      } else {
        previewWrap.style.display = 'block';
        processImageOptimization();
      }
    };
    reader.readAsDataURL(file);
  };

  cameraInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('docTitleInput').value.trim();
    const category = document.getElementById('docCategorySelect').value;
    const date = document.getElementById('docDateInput').value;
    const nre = document.getElementById('docNreInput').value.trim();
    const notes = document.getElementById('docNotesInput').value.trim();
    const amountVal = parseFloat(document.getElementById('docAmountInput').value) || null;
    const refundedVal = parseFloat(document.getElementById('docRefundedInput').value) || 0;
    const isDeductible = document.getElementById('docDeductibleToggle').checked;
    const taxCat = document.getElementById('docTaxCategorySelect').value;
    const payment = document.getElementById('docPaymentMethodSelect').value;

    let finalImg = rawUploadedImage ? previewImg.src : generateDemoPlaceholder(title || 'REFERTO CLINICO', notes || 'Documento registrato su Pulse');

    const newDoc = {
      id: 'doc_' + Date.now(),
      profileId: getActiveProfileId(),
      title: title || 'Nuovo Documento Sanitario',
      bodyZone: selectedZoneId,
      category: category,
      date: date || new Date().toISOString().split('T')[0],
      nre: nre,
      notes: notes,
      amount: amountVal,
      refundedAmount: refundedVal,
      taxCategory: taxCat,
      paymentMethod: payment,
      isDeductible730: (category === 'Fattura') ? isDeductible : false,
      isUsedRx: false,
      imageData: finalImg,
      isPdf: rawUploadedImage ? rawUploadedImage.isPdf : false,
      createdAt: Date.now()
    };

    await pulseDB.saveDocument(newDoc);
    closeAllModals();
    form.reset();
    previewWrap.style.display = 'none';
    rawUploadedImage = null;
    currentRotation = 0;

    showToast('Documento salvato con successo', '✅');
    await renderAllViews();
  });
}

function processImageOptimization() {
  if (!rawUploadedImage || rawUploadedImage.isPdf) return;
  const img = new Image();
  img.onload = () => {
    const maxSide = 1600;
    let w = img.width;
    let h = img.height;
    if (w > maxSide || h > maxSide) {
      if (w > h) {
        h = Math.round((h * maxSide) / w);
        w = maxSide;
      } else {
        w = Math.round((w * maxSide) / h);
        h = maxSide;
      }
    }

    const canvas = document.createElement('canvas');
    const isSideways = currentRotation === 90 || currentRotation === 270;
    canvas.width = isSideways ? h : w;
    canvas.height = isSideways ? w : h;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);

    if (currentFilterMode === 'bw') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = gray > 135 ? 255 : (gray < 75 ? 0 : Math.min(255, gray * 0.9));
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (currentFilterMode === 'sharp') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // High contrast while preserving colors
        d[i] = Math.min(255, Math.max(0, (d[i] - 128) * 1.35 + 128));
        d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * 1.35 + 128));
        d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * 1.35 + 128));
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const preview = document.getElementById('scanPreviewImg');
    if (preview) {
      preview.src = canvas.toDataURL('image/jpeg', 0.82);
    }
  };
  img.src = rawUploadedImage.dataUrl;
}

function selectPickerZone(zoneId) {
  selectedZoneId = zoneId;
  document.querySelectorAll('.zone-pick-item').forEach(item => {
    const isSel = item.dataset.zone === zoneId;
    item.style.borderColor = isSel ? 'var(--accent-coral)' : 'transparent';
    item.style.background = isSel ? 'rgba(255, 45, 85, 0.08)' : 'transparent';
  });
}

function applyBWCanvasFilter() {
  processImageOptimization();
}

async function extractTextFromPDFDataUri(dataUri) {
  if (!window.pdfjsLib) return '';
  const base64Data = dataUri.split(',')[1];
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const maxPages = Math.min(pdf.numPages, 2);
  let fullText = '';

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}

function applyParsedDataToForm(data) {
  if (!data) return;
  const titleEl = document.getElementById('docTitleInput');
  const catEl = document.getElementById('docCategorySelect');
  const dateEl = document.getElementById('docDateInput');
  const nreEl = document.getElementById('docNreInput');
  const amountEl = document.getElementById('docAmountInput');
  const deductibleEl = document.getElementById('docDeductibleToggle');
  const taxWrap = document.getElementById('tax730ExtraFields');

  if (data.title && titleEl) {
    titleEl.value = data.title;
    triggerFieldHighlight(titleEl);
  }
  if (data.category && catEl) {
    catEl.value = data.category;
    taxWrap.style.display = (data.category === 'Fattura') ? 'block' : 'none';
    triggerFieldHighlight(catEl);
  }
  if (data.bodyZone) {
    selectPickerZone(data.bodyZone);
    const item = document.querySelector(`.zone-pick-item[data-zone="${data.bodyZone}"]`);
    if (item) triggerFieldHighlight(item);
  }
  if (data.date && dateEl) {
    dateEl.value = data.date;
    triggerFieldHighlight(dateEl);
  }
  if (data.nre && nreEl) {
    nreEl.value = data.nre;
    triggerFieldHighlight(nreEl);
  }
  if (data.category === 'Fattura') {
    if (data.amount && amountEl) {
      amountEl.value = Number(data.amount).toFixed(2);
      triggerFieldHighlight(amountEl);
    }
    if (deductibleEl) {
      deductibleEl.checked = data.isDeductible730;
    }
  }
}

function triggerFieldHighlight(el) {
  if (!el) return;
  el.classList.remove('field-autofilled');
  void el.offsetWidth;
  el.classList.add('field-autofilled');
}

function openAddDocModal(preselectedZone) {
  if (preselectedZone) {
    selectPickerZone(preselectedZone);
  }
  document.getElementById('docDateInput').value = new Date().toISOString().split('T')[0];
  openModal('addDocModalOverlay');
}

// 9. Interactive Calendar & Agenda
let calCurrentYear = new Date().getFullYear();
let calCurrentMonth = new Date().getMonth();
let calSelectedDate = new Date();

function initCalendar() {
  document.getElementById('calPrevMonthBtn').addEventListener('click', () => {
    calCurrentMonth--;
    if (calCurrentMonth < 0) {
      calCurrentMonth = 11;
      calCurrentYear--;
    }
    renderCalendar();
  });

  document.getElementById('calNextMonthBtn').addEventListener('click', () => {
    calCurrentMonth++;
    if (calCurrentMonth > 11) {
      calCurrentMonth = 0;
      calCurrentYear++;
    }
    renderCalendar();
  });

  document.getElementById('calTodayBtn').addEventListener('click', () => {
    const today = new Date();
    calCurrentYear = today.getFullYear();
    calCurrentMonth = today.getMonth();
    calSelectedDate = today;
    renderCalendar();
  });
}

function renderCalendar() {
  const monthTitle = document.getElementById('calMonthTitle');
  const grid = document.getElementById('calDaysGrid');
  const activeProfile = getActiveProfileId();

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  monthTitle.innerText = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const profileAppts = allAppts.filter(a => !a.profileId || a.profileId === activeProfile);

  const apptsByDate = {};
  profileAppts.forEach(a => {
    const dStr = a.datetime.split('T')[0];
    apptsByDate[dStr] = (apptsByDate[dStr] || 0) + 1;
  });

  const firstDayOfMonth = new Date(calCurrentYear, calCurrentMonth, 1);
  const lastDayOfMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0);

  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const totalDays = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

  let html = '';

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    html += `<div class="cal-day-cell other-month">${dayNum}</div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedStr = calSelectedDate.toISOString().split('T')[0];

  for (let day = 1; day <= totalDays; day++) {
    const yStr = calCurrentYear;
    const mStr = String(calCurrentMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDateStr = `${yStr}-${mStr}-${dStr}`;

    const isToday = fullDateStr === todayStr;
    const isSelected = fullDateStr === selectedStr;
    const hasAppts = apptsByDate[fullDateStr] || 0;

    let dotsHtml = '';
    if (hasAppts > 0) {
      dotsHtml = `<div class="cal-dots-wrap">` +
        `<span class="cal-dot"></span>`.repeat(Math.min(hasAppts, 3)) +
        `</div>`;
    }

    html += `
      <div class="cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" onclick="selectCalendarDate(${calCurrentYear}, ${calCurrentMonth}, ${day})" ondblclick="quickAddApptDate(${calCurrentYear}, ${calCurrentMonth}, ${day})">
        <span>${day}</span>
        ${dotsHtml}
      </div>
    `;
  }

  const totalCells = startDayOfWeek + totalDays;
  const trailingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailingCells; i++) {
    html += `<div class="cal-day-cell other-month">${i}</div>`;
  }

  grid.innerHTML = html;
  renderSelectedDayAppointments();
}

function selectCalendarDate(year, month, day) {
  calSelectedDate = new Date(year, month, day);
  renderCalendar();
}

function quickAddApptDate(year, month, day) {
  calSelectedDate = new Date(year, month, day);
  openNewApptModalWithDate(calSelectedDate);
}

function renderSelectedDayAppointments() {
  const container = document.getElementById('selectedDayApptsList');
  const bannerTitle = document.getElementById('selectedDayBannerTitle');
  const activeProfile = getActiveProfileId();

  const dateStr = calSelectedDate.toISOString().split('T')[0];
  const dateFormatted = calSelectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  bannerTitle.innerText = dateFormatted;

  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const dayAppts = allAppts.filter(a => (!a.profileId || a.profileId === activeProfile) && a.datetime.startsWith(dateStr));

  if (dayAppts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 18px 12px;">
        <div class="empty-text">Nessun impegno in questa data</div>
        <div class="empty-sub">Tocca "+ Aggiungi Visita" per pianificare un promemoria.</div>
        <button class="btn-secondary-sm" style="margin: 0 auto; max-width: 240px;" onclick="openNewApptModalWithDate(calSelectedDate)">
          + Aggiungi Visita il ${calSelectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
        </button>
      </div>
    `;
  } else {
    container.innerHTML = dayAppts.map(a => renderInteractiveApptCard(a)).join('') + `
      <button class="btn-secondary-sm" style="width: 100%; margin-top: 6px;" onclick="openNewApptModalWithDate(calSelectedDate)">
        + Aggiungi un'altra visita in questa data
      </button>
    `;
  }
}

function renderInteractiveApptCard(a) {
  const dt = new Date(a.datetime);
  const timeFormatted = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const checklist = a.checklist || [];

  return `
    <div class="glass-card" style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${escapeHTML(a.title)}</div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 3px;">
            ⏰ Ore ${timeFormatted} ${a.location ? `• 📍 ${escapeHTML(a.location)}` : ''}
          </div>
          ${a.notes ? `<div style="font-size: 12px; background: var(--bg-card-secondary); padding: 6px 10px; border-radius: var(--radius-sm); margin-top: 8px;">${escapeHTML(a.notes)}</div>` : ''}
        </div>
      </div>

      <div class="checklist-container" style="background: var(--bg-card-secondary); border-radius: var(--radius-md); padding: 10px 12px; margin-top: 10px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent-blue); margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>🩺 Domande per il Medico</span>
          <span style="color: var(--text-secondary);">${checklist.filter(c => c.done).length}/${checklist.length}</span>
        </div>
        ${checklist.map((item, idx) => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; cursor: pointer; ${item.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}" onclick="toggleChecklistItem('${a.id}', ${idx})">
            <span style="width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--accent-blue); display: flex; align-items: center; justify-content: center; font-size: 10px; background: ${item.done ? 'var(--accent-blue)' : 'transparent'}; color: #fff;">${item.done ? '✓' : ''}</span>
            <span>${escapeHTML(item.text)}</span>
          </div>
        `).join('')}
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <input type="text" id="checkInput_${a.id}" class="form-input" style="padding: 6px 10px; font-size: 12px;" placeholder="Nuova domanda..." onkeydown="if(event.key==='Enter') addChecklistItem('${a.id}')">
          <button class="btn-secondary-sm" style="flex: none; padding: 6px 12px;" onclick="addChecklistItem('${a.id}')">+</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
        <button class="btn-secondary-sm" onclick="exportSingleICS('${a.id}')">Salva .ics</button>
        ${a.docId ? `<button class="btn-secondary-sm" onclick="openDocById('${a.docId}')">📄 Impegnativa</button>` : ''}
        <button class="btn-secondary-sm" style="color: var(--accent-coral);" onclick="deleteAppt('${a.id}')">Elimina</button>
      </div>
    </div>
  `;
}

function toggleChecklistItem(apptId, index) {
  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const appt = allAppts.find(a => a.id === apptId);
  if (appt && appt.checklist && appt.checklist[index] !== undefined) {
    appt.checklist[index].done = !appt.checklist[index].done;
    localStorage.setItem('pulse_appointments', JSON.stringify(allAppts));
    renderCalendar();
  }
}

function addChecklistItem(apptId) {
  const input = document.getElementById(`checkInput_${apptId}`);
  if (!input || !input.value.trim()) return;
  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const appt = allAppts.find(a => a.id === apptId);
  if (appt) {
    if (!appt.checklist) appt.checklist = [];
    appt.checklist.push({ text: input.value.trim(), done: false });
    localStorage.setItem('pulse_appointments', JSON.stringify(allAppts));
    input.value = '';
    renderCalendar();
    showToast('Domanda aggiunta!', '📝');
  }
}

function initAppointments() {
  const form = document.getElementById('newApptForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('apptTitleInput').value.trim();
    const datetime = document.getElementById('apptDatetimeInput').value;
    const location = document.getElementById('apptLocationInput').value.trim();
    const notes = document.getElementById('apptNotesInput').value.trim();
    const docId = document.getElementById('apptDocSelect').value;
    const firstQuestion = document.getElementById('apptFirstQuestionInput').value.trim();

    const checklist = [];
    if (firstQuestion) checklist.push({ text: firstQuestion, done: false });

    const newAppt = {
      id: 'app_' + Date.now(),
      profileId: getActiveProfileId(),
      title: title || 'Promemoria Visita',
      datetime: datetime,
      location: location,
      notes: notes,
      docId: docId,
      checklist: checklist
    };

    const appts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
    appts.push(newAppt);
    localStorage.setItem('pulse_appointments', JSON.stringify(appts));

    closeAllModals();
    form.reset();
    showToast('Promemoria aggiunto', '🗓️');
    renderAppointments();
    renderCalendar();
    renderHome();
  });
}

async function renderAppointments() {
  const docSelect = document.getElementById('apptDocSelect');
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();
  const profileDocs = allDocs.filter(d => !d.profileId || d.profileId === activeProfile);
  docSelect.innerHTML = '<option value="">Nessun documento collegato</option>' +
    profileDocs.map(d => `<option value="${d.id}">${escapeHTML(d.title)}</option>`).join('');
}

function openNewApptModalWithDate(dateObj) {
  const dt = dateObj ? new Date(dateObj) : new Date();
  dt.setHours(9, 30, 0, 0);
  const isoStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('apptDatetimeInput').value = isoStr;
  openModal('newApptModalOverlay');
}

function openNewApptModal() {
  openNewApptModalWithDate(new Date());
}

async function deleteAppt(id) {
  if (confirm('Rimuovere questo promemoria?')) {
    let appts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
    appts = appts.filter(a => a.id !== id);
    localStorage.setItem('pulse_appointments', JSON.stringify(appts));
    showToast('Promemoria eliminato', '🗑️');
    await renderAppointments();
    renderCalendar();
    await renderHome();
  }
}

function exportSingleICS(apptId) {
  const appts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const appt = appts.find(a => a.id === apptId);
  if (!appt) return;

  const startDate = new Date(appt.datetime);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let desc = (appt.notes || 'Visita medica salvata da Pulse');
  if (appt.checklist && appt.checklist.length > 0) {
    desc += '\\n\\nDomande per il medico:\\n' + appt.checklist.map(c => `- ${c.text} [${c.done ? 'FATTO' : 'DA CHIEDERE'}]`).join('\\n');
  }

  const icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulse Health App//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${appt.id}@pulse.health.local`, `DTSTAMP:${formatICSDate(new Date())}`, `DTSTART:${formatICSDate(startDate)}`, `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${appt.title}`, `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`, `LOCATION:${appt.location || 'Visita medica'}`, 'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Promemoria Visita Domani (Pulse)', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Promemoria Visita Tra 2 Ore (Pulse)', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${appt.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('File .ics generato con allarmi!', '📅');
}

// 10. Modalità Farmacia (Barcode Code 39)
function initPharmacyMode() {
  const btn = document.getElementById('headerPharmacyBtn');
  btn.addEventListener('click', openPharmacyMode);
}

async function openPharmacyMode() {
  const activeProfile = getActiveProfileId();
  const profile = getProfileData(activeProfile);

  document.getElementById('pharmacyName').innerText = profile.name || 'Mario Rossi';
  document.getElementById('pharmacyCf').innerText = profile.cf || 'RSSMRA85M01H501Z';

  const barcodeContainer = document.getElementById('pharmacyBarcodeWrap');
  if (profile.cf) {
    barcodeContainer.innerHTML = generateCode39SVG(profile.cf, 60, true);
  } else {
    barcodeContainer.innerHTML = '<div style="color: red; font-size: 12px;">Codice Fiscale non impostato</div>';
  }

  const allDocs = await pulseDB.getAllDocuments();
  const recipes = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && d.category === 'Ricetta' && d.nre && !d.isUsedRx);

  const listContainer = document.getElementById('pharmacyRecipesList');
  if (recipes.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px 12px; background: #F9F9FB; border-radius: 14px;">
        <div style="font-weight: 700; color: #1C1C1E; font-size: 14px;">Nessuna ricetta attiva con NRE</div>
        <div style="font-size: 12px; color: #8E8E93; margin-top: 4px;">Le prescrizioni con codice NRE appariranno automaticamente qui.</div>
      </div>
    `;
  } else {
    listContainer.innerHTML = recipes.map(r => `
      <div style="background: #FFFFFF; border: 1.5px solid #000000; border-radius: 16px; padding: 14px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #000;">${escapeHTML(r.title)}</div>
            <div style="font-size: 11px; color: #636366;">Data: ${r.date ? new Date(r.date).toLocaleDateString('it-IT') : 'N/D'}</div>
          </div>
          <button style="background: #E5E5EA; border: none; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; cursor: pointer; color: #1C1C1E;" onclick="markRecipeUsed('${r.id}')">
            Segna ritirata
          </button>
        </div>
        <div style="background: #F2F2F7; padding: 8px; border-radius: 10px; margin: 10px 0; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #8E8E93;">CODICE NRE</div>
          <div style="font-family: monospace; font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #000;">${escapeHTML(r.nre)}</div>
        </div>
        <div style="background: #fff; padding: 6px; border-radius: 8px; overflow-x: auto;">
          ${generateCode39SVG(r.nre, 55, false)}
        </div>
      </div>
    `).join('');
  }
  openModal('pharmacyModalOverlay');
}

async function markRecipeUsed(docId) {
  const doc = await pulseDB.getDocument(docId);
  if (doc) {
    doc.isUsedRx = true;
    await pulseDB.saveDocument(doc);
    showToast('Ricetta segnata come ritirata!', '💊');
    openPharmacyMode();
  }
}

// 11. Potenziamento Cassetto 730
let taxSelectedYear = new Date().getFullYear();

function initTax730() {
  const banner = document.getElementById('homeTax730Banner');
  if (banner) banner.addEventListener('click', openTax730Modal);

  const profileLink = document.getElementById('profileTax730Link');
  if (profileLink) profileLink.addEventListener('click', openTax730Modal);

  document.getElementById('taxYearPrevBtn').addEventListener('click', () => {
    taxSelectedYear--;
    renderTax730ModalContent();
  });
  document.getElementById('taxYearNextBtn').addEventListener('click', () => {
    taxSelectedYear++;
    renderTax730ModalContent();
  });

  document.getElementById('exportCsv730Btn').addEventListener('click', exportTax730CSV);
  document.getElementById('printDossierCafBtn').addEventListener('click', printDossierCAF);
  document.getElementById('btnQuickAdd730').addEventListener('click', () => {
    closeAllModals();
    openAddDocModal('pharma');
    document.getElementById('docCategorySelect').value = 'Fattura';
    document.getElementById('tax730ExtraFields').style.display = 'block';
  });

  document.querySelectorAll('.tax-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.tax-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderTaxExpensesList(chip.dataset.filter);
    });
  });
}

async function renderTax730Dashboard() {
  const profileAmt = document.getElementById('profileTax730Amount');
  const profileRef = document.getElementById('profileTax730Refund');
  const profileFran = document.getElementById('profileTax730Franchigia');

  const activeProfile = getActiveProfileId();
  const currentYearStr = new Date().getFullYear().toString();
  const allDocs = await pulseDB.getAllDocuments();

  const taxDocs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && d.isDeductible730 && d.date && d.date.startsWith(currentYearStr));

  let netDeductible = 0;
  taxDocs.forEach(d => {
    const amt = parseFloat(d.amount) || 0;
    const ref = parseFloat(d.refundedAmount) || 0;
    netDeductible += Math.max(0, amt - ref);
  });

  const franchigia = 129.11;
  const refund = Math.max(0, netDeductible - franchigia) * 0.19;

  if (profileAmt) profileAmt.innerText = `€ ${netDeductible.toFixed(2)}`;
  if (profileRef) profileRef.innerText = `€ ${refund.toFixed(2)}`;

  if (profileFran) {
    if (netDeductible >= franchigia) {
      profileFran.innerHTML = `<span style="color: var(--accent-teal); font-weight: 700;">✓ Franchigia superata</span> • Rimborso attivo`;
    } else {
      const missing = franchigia - netDeductible;
      profileFran.innerHTML = `Mancano <strong>€ ${missing.toFixed(2)}</strong> alla franchigia`;
    }
  }
}

async function openTax730Modal() {
  await renderTax730ModalContent();
  openModal('tax730ModalOverlay');
}

async function renderTax730ModalContent() {
  document.getElementById('taxModalYearLabel').innerText = taxSelectedYear;
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();

  const yearStr = taxSelectedYear.toString();
  const docs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && (d.isDeductible730 || d.category === 'Fattura') && d.date && d.date.startsWith(yearStr));

  let totalGross = 0;
  let totalRefunded = 0;
  let netAdmitted = 0;

  const categoriesTotal = {
    'Farmaci': 0,
    'Visite Specialistiche': 0,
    'Esami & Ticket SSN': 0,
    'Dispositivi Medici': 0
  };

  docs.forEach(d => {
    const gross = parseFloat(d.amount) || 0;
    const ref = parseFloat(d.refundedAmount) || 0;
    const net = Math.max(0, gross - ref);
    totalGross += gross;
    totalRefunded += ref;

    if (d.isDeductible730) {
      netAdmitted += net;
      const cat = d.taxCategory || (d.bodyZone === 'pharma' ? 'Farmaci' : 'Visite Specialistiche');
      if (categoriesTotal[cat] !== undefined) categoriesTotal[cat] += net;
      else categoriesTotal['Visite Specialistiche'] += net;
    }
  });

  const franchigia = 129.11;
  const estimatedRefund = Math.max(0, netAdmitted - franchigia) * 0.19;
  const progressPct = Math.min(100, Math.round((netAdmitted / franchigia) * 100));

  document.getElementById('taxHeroGross').innerText = `€ ${totalGross.toFixed(2)}`;
  document.getElementById('taxHeroRefunded').innerText = `€ ${totalRefunded.toFixed(2)}`;
  document.getElementById('taxHeroNetAdmitted').innerText = `€ ${netAdmitted.toFixed(2)}`;
  document.getElementById('taxHeroEstimatedRefund').innerText = `€ ${estimatedRefund.toFixed(2)}`;

  const fill = document.getElementById('taxFranchigiaFill');
  const badge = document.getElementById('taxFranchigiaBadge');
  fill.style.width = `${progressPct}%`;
  fill.style.backgroundColor = (netAdmitted >= franchigia) ? 'var(--accent-teal)' : 'var(--accent-amber)';

  if (netAdmitted >= franchigia) {
    badge.innerHTML = `<span style="color: var(--accent-teal); font-weight: 700;">✓ Franchigia superata</span> — Stai maturando il 19%!`;
  } else {
    badge.innerText = `€ ${netAdmitted.toFixed(2)} di € 129,11 (${progressPct}%)`;
  }

  const breakdownBar = document.getElementById('taxBreakdownBar');
  if (netAdmitted > 0) {
    const farmPct = (categoriesTotal['Farmaci'] / netAdmitted) * 100;
    const visPct = (categoriesTotal['Visite Specialistiche'] / netAdmitted) * 100;
    const ssnPct = (categoriesTotal['Esami & Ticket SSN'] / netAdmitted) * 100;
    const dispPct = (categoriesTotal['Dispositivi Medici'] / netAdmitted) * 100;

    breakdownBar.innerHTML = `
      <div class="breakdown-seg" style="width: ${farmPct}%; background: #34C759;" title="Farmaci"></div>
      <div class="breakdown-seg" style="width: ${visPct}%; background: #FF2D55;" title="Visite"></div>
      <div class="breakdown-seg" style="width: ${ssnPct}%; background: #007AFF;" title="Ticket"></div>
      <div class="breakdown-seg" style="width: ${dispPct}%; background: #AF52DE;" title="Dispositivi"></div>
    `;
  } else {
    breakdownBar.innerHTML = `<div class="breakdown-seg" style="width: 100%; background: var(--bg-card-secondary);"></div>`;
  }

  renderTaxExpensesList('tutte');
}

async function renderTaxExpensesList(filter = 'tutte') {
  const container = document.getElementById('modalTaxExpensesList');
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();
  const yearStr = taxSelectedYear.toString();

  let docs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && (d.isDeductible730 || d.category === 'Fattura') && d.date && d.date.startsWith(yearStr));

  if (filter === 'detraibili') {
    docs = docs.filter(d => d.isDeductible730);
  } else if (filter === 'allegati') {
    docs = docs.filter(d => d.imageData && !d.imageData.startsWith('data:image/svg+xml;base64,'));
  }

  if (docs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-text">Nessuna spesa sanitaria registrata</div><div class="empty-sub">Aggiungi scontrini o fatture per questo anno fiscale.</div></div>`;
    return;
  }

  container.innerHTML = docs.map(d => {
    const gross = parseFloat(d.amount) || 0;
    const ref = parseFloat(d.refundedAmount) || 0;
    const net = Math.max(0, gross - ref);
    const isTraceable = d.paymentMethod !== 'contanti';

    return `
      <div class="glass-card" style="margin-bottom: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="openDocById('${d.id}')">
        <div>
          <div style="font-size: 14px; font-weight: 700;">${escapeHTML(d.title)}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
            ${d.date ? new Date(d.date).toLocaleDateString('it-IT') : ''} • ${d.taxCategory || 'Visita'} • ${isTraceable ? '💳 Tracciabile' : '💵 Contanti'}
            ${ref > 0 ? `• <span style="color: var(--accent-coral);">Rimborso -€${ref.toFixed(2)}</span>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 15px; font-weight: 800; color: ${d.isDeductible730 ? 'var(--accent-teal)' : 'var(--text-tertiary)'}; font-variant-numeric: tabular-nums;">
            € ${net.toFixed(2)}
          </div>
          ${!d.isDeductible730 ? '<div style="font-size: 9px; color: var(--accent-coral); font-weight: 700;">NON DETRAIBILE</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function exportTax730CSV() {
  const activeProfile = getActiveProfileId();
  const profile = getProfileData(activeProfile);
  const allDocs = await pulseDB.getAllDocuments();
  const yearStr = taxSelectedYear.toString();

  const docs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && d.isDeductible730 && d.date && d.date.startsWith(yearStr));

  let csv = 'Data;Titolo;Categoria730;MetodoPagamento;ImportoLordo;RimborsoAssicurazione;NettoDetraibile;CodiceFiscale\r\n';
  docs.forEach(d => {
    const gross = parseFloat(d.amount) || 0;
    const ref = parseFloat(d.refundedAmount) || 0;
    const net = Math.max(0, gross - ref);
    csv += `"${d.date || ''}";"${d.title.replace(/"/g, '""')}";"${d.taxCategory || 'Spesa Sanitaria'}";"${d.paymentMethod || 'Tracciabile'}";"${gross.toFixed(2)}";"${ref.toFixed(2)}";"${net.toFixed(2)}";"${profile.cf || ''}"\r\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Pulse_Cassetto730_${taxSelectedYear}_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV 730 Esportato!', '📊');
}

async function printDossierCAF() {
  const activeProfile = getActiveProfileId();
  const profile = getProfileData(activeProfile);
  const allDocs = await pulseDB.getAllDocuments();
  const yearStr = taxSelectedYear.toString();

  const docs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && d.isDeductible730 && d.date && d.date.startsWith(yearStr));

  let totalNet = 0;
  let rowsHtml = '';
  docs.forEach((d, i) => {
    const gross = parseFloat(d.amount) || 0;
    const ref = parseFloat(d.refundedAmount) || 0;
    const net = Math.max(0, gross - ref);
    totalNet += net;
    rowsHtml += `
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd;">${i + 1}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${d.date ? new Date(d.date).toLocaleDateString('it-IT') : 'N/D'}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${escapeHTML(d.title)}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${escapeHTML(d.taxCategory || 'Spesa')}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${d.paymentMethod === 'contanti' ? 'Contanti' : 'Tracciabile'}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">€ ${gross.toFixed(2)}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: red;">${ref > 0 ? '-€ ' + ref.toFixed(2) : '-'}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">€ ${net.toFixed(2)}</td>
      </tr>
    `;
  });

  const franchigia = 129.11;
  const refund = Math.max(0, totalNet - franchigia) * 0.19;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dossier Spese Sanitarie 730 — ${taxSelectedYear}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; padding: 30px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #666; margin-bottom: 20px; }
        .meta-box { background: #f7f7f7; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
        th { background: #eee; padding: 8px; border: 1px solid #ddd; text-align: left; }
        .summary-box { background: #eef9f8; border: 1px solid #00C7BE; padding: 14px; border-radius: 8px; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>Dossier Fiscale Spese Mediche 730 / Modello Redditi</h1>
      <div class="sub">Generato in locale dall'app Pulse • Documento di riepilogo per CAF e commercialista</div>
      <div class="meta-box">
        <strong>Contribuente:</strong> ${escapeHTML(profile.name)} &nbsp;&bull;&nbsp; <strong>Codice Fiscale:</strong> ${escapeHTML(profile.cf)}<br>
        <strong>Anno Fiscale:</strong> ${taxSelectedYear} &nbsp;&bull;&nbsp; <strong>Numero Documenti Inclusi:</strong> ${docs.length}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Data</th><th>Descrizione / Struttura</th><th>Categoria</th><th>Pagamento</th><th>Lordo</th><th>Rimborso Assic.</th><th>Netto Ammesso</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="summary-box">
        <div><strong>Totale Spese Sanitarie Ammesse:</strong> € ${totalNet.toFixed(2)}</div>
        <div><strong>Franchigia di Legge:</strong> € 129,11</div>
        <div style="font-size: 16px; margin-top: 6px; color: #007A78;"><strong>Detrazione Fiscale Spettante (19%):</strong> € ${refund.toFixed(2)}</div>
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// 12. Tracker Terapie Temporanee
function initTherapyTracker() {
  const btn = document.getElementById('btnNewTherapy');
  if (btn) btn.addEventListener('click', () => {
    updateTherapyTimeInputs();
    openModal('newTherapyModalOverlay');
  });

  const dosesSelect = document.getElementById('therapyDosesSelect');
  if (dosesSelect) {
    dosesSelect.addEventListener('change', updateTherapyTimeInputs);
  }

  function updateTherapyTimeInputs() {
    const container = document.getElementById('therapyTimesSlotsContainer');
    if (!container) return;
    const doses = parseInt(document.getElementById('therapyDosesSelect').value) || 2;
    const defaults = {
      1: ['08:30'],
      2: ['08:30', '20:30'],
      3: ['08:00', '14:00', '20:30'],
      4: ['08:00', '12:30', '17:00', '21:30']
    };
    const defTimes = defaults[doses] || defaults[2];
    container.innerHTML = defTimes.map((time, idx) => `
      <div style="display: flex; align-items: center; gap: 6px; background: var(--bg-card-secondary); padding: 6px 10px; border-radius: var(--radius-sm);">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">Dose ${idx + 1}:</span>
        <input type="time" class="form-input therapy-slot-input" value="${time}" style="padding: 4px 8px; font-size: 13px;">
      </div>
    `).join('');
  }

  const form = document.getElementById('newTherapyForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('therapyNameInput').value.trim();
      const doses = parseInt(document.getElementById('therapyDosesSelect').value) || 1;
      const days = parseInt(document.getElementById('therapyDaysInput').value) || 7;
      const notes = document.getElementById('therapyNotesInput').value.trim();

      const timeInputs = document.querySelectorAll('.therapy-slot-input');
      const times = Array.from(timeInputs).map(inp => inp.value || '08:00');

      const todayStr = new Date().toISOString().split('T')[0];
      const newTher = {
        id: 'ther_' + Date.now(),
        profileId: getActiveProfileId(),
        name: name,
        dosesPerDay: doses,
        durationDays: days,
        startDate: todayStr,
        notes: notes,
        times: times,
        logs: { [todayStr]: new Array(doses).fill(false) }
      };

      const thers = JSON.parse(localStorage.getItem('pulse_therapies') || '[]');
      thers.push(newTher);
      localStorage.setItem('pulse_therapies', JSON.stringify(thers));

      closeAllModals();
      form.reset();
      showToast('Terapia registrata', '💊');
      renderTherapies();
    });
  }
}

function renderTherapies() {
  const container = document.getElementById('homeTherapiesList');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const thers = JSON.parse(localStorage.getItem('pulse_therapies') || '[]');
  const profileThers = thers.filter(t => !t.profileId || t.profileId === activeProfile);

  if (profileThers.length === 0) {
    container.innerHTML = `
      <div style="font-size: 13px; color: var(--text-tertiary); text-align: center; padding: 14px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-glass);">
        Nessuna terapia attiva in corso. Tocca "+ Nuova Terapia" per monitorare antibiotici o cure temporanee.
      </div>
    `;
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  container.innerHTML = profileThers.map(t => {
    if (!t.logs[todayStr]) {
      t.logs[todayStr] = new Array(t.dosesPerDay).fill(false);
    }
    const todayLogs = t.logs[todayStr];
    const takenCount = todayLogs.filter(Boolean).length;
    const progressPct = Math.round((takenCount / t.dosesPerDay) * 100);

    const startDt = new Date(t.startDate);
    const currDt = new Date(todayStr);
    const dayIndex = Math.min(t.durationDays, Math.max(1, Math.floor((currDt - startDt) / 86400000) + 1));

    const radius = 20;
    const circ = 2 * Math.PI * radius;
    const strokeDash = (progressPct / 100) * circ;

    // Default times if missing in legacy records
    const defTimes = ['08:30', '14:00', '20:30', '22:00'];
    const times = t.times || defTimes.slice(0, t.dosesPerDay);

    return `
      <div class="therapy-ring-card" style="padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="therapy-ring-wrap">
              <svg width="48" height="48" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="${radius}" fill="none" stroke="var(--bg-card-secondary)" stroke-width="4.5" />
                <circle cx="25" cy="25" r="${radius}" fill="none" stroke="var(--accent-coral)" stroke-width="4.5"
                  stroke-dasharray="${circ}" stroke-dashoffset="${circ - strokeDash}"
                  stroke-linecap="round" transform="rotate(-90 25 25)" style="transition: stroke-dashoffset 0.3s ease;" />
              </svg>
              <div style="position: absolute; font-size: 11px; font-weight: 800; color: var(--accent-coral);">${takenCount}/${t.dosesPerDay}</div>
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 700;">${escapeHTML(t.name)}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                Giorno ${dayIndex} di ${t.durationDays} ${t.notes ? `&bull; ${escapeHTML(t.notes)}` : ''}
              </div>
            </div>
          </div>
          <button style="background: none; border: none; font-size: 12px; color: var(--accent-coral); cursor: pointer;" onclick="deleteTherapy('${t.id}')">Elimina</button>
        </div>

        <!-- Pillole Slot Orari Interattive -->
        <div class="therapy-slots-row">
          ${todayLogs.map((done, idx) => {
            const timeSlot = times[idx] || `Dose ${idx + 1}`;
            let isUrgent = false;
            if (!done && timeSlot.includes(':')) {
              const [h, m] = timeSlot.split(':').map(Number);
              const slotMin = h * 60 + m;
              if (currentMinutes >= slotMin - 30) isUrgent = true;
            }

            return `
              <button class="time-slot-pill ${done ? 'taken' : ''} ${isUrgent ? 'urgent' : ''}" onclick="toggleTherapyDose('${t.id}', ${idx})">
                <span>${timeSlot}</span>
                <span>${done ? '✓' : (isUrgent ? '• Ora' : '')}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function deleteTherapy(id) {
  if (confirm('Vuoi rimuovere questa terapia attiva?')) {
    const thers = JSON.parse(localStorage.getItem('pulse_therapies') || '[]');
    const filtered = thers.filter(t => t.id !== id);
    localStorage.setItem('pulse_therapies', JSON.stringify(filtered));
    renderTherapies();
    showToast('Terapia rimossa', '🗑️');
  }
}

function toggleTherapyDose(therId, doseIndex) {
  const thers = JSON.parse(localStorage.getItem('pulse_therapies') || '[]');
  const t = thers.find(item => item.id === therId);
  if (!t) return;
  const todayStr = new Date().toISOString().split('T')[0];
  if (!t.logs[todayStr]) t.logs[todayStr] = new Array(t.dosesPerDay).fill(false);
  t.logs[todayStr][doseIndex] = !t.logs[todayStr][doseIndex];
  localStorage.setItem('pulse_therapies', JSON.stringify(thers));
  renderTherapies();
  renderHome(); // aggiorna l'anello nella Hero Oggi all'istante
  showToast(t.logs[todayStr][doseIndex] ? 'Dose registrata!' : 'Dose rimossa', '💊');
}

// 13. Diario Parametri & Sintomi
function initSymptomsDiary() {
  const openBtn = document.getElementById('btnOpenSymptomsModal');
  if (openBtn) openBtn.addEventListener('click', () => openModal('symptomsModalOverlay'));

  const form = document.getElementById('newSymptomForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('symptomTypeSelect').value;
      const val = document.getElementById('symptomValInput').value.trim();
      const note = document.getElementById('symptomNoteInput').value.trim();

      const newEntry = {
        id: 'sym_' + Date.now(),
        profileId: getActiveProfileId(),
        type: type,
        val: val,
        note: note,
        datetime: new Date().toISOString()
      };

      const symptoms = JSON.parse(localStorage.getItem('pulse_symptoms') || '[]');
      symptoms.unshift(newEntry);
      localStorage.setItem('pulse_symptoms', JSON.stringify(symptoms));

      form.reset();
      showToast('Parametro registrato nel diario', '🩺');
      renderSymptoms();
    });
  }

  const exportPdfBtn = document.getElementById('btnExportSymptomsPdf');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportSymptomsPDF);
}

function renderSymptoms() {
  const list = document.getElementById('symptomsDiaryList');
  if (!list) return;

  const activeProfile = getActiveProfileId();
  const symptoms = JSON.parse(localStorage.getItem('pulse_symptoms') || '[]');
  const profileSymptoms = symptoms.filter(s => !s.profileId || s.profileId === activeProfile);

  if (profileSymptoms.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-text">Nessuna misurazione recente</div><div class="empty-sub">Registra pressione, febbre o sintomi per il medico.</div></div>`;
    return;
  }

  list.innerHTML = profileSymptoms.slice(0, 10).map(s => `
    <div class="glass-card" style="padding: 10px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 14px; font-weight: 700;">${escapeHTML(s.type)}: <span style="color: var(--accent-coral);">${escapeHTML(s.val)}</span></div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
          ${new Date(s.datetime).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ${s.note ? `• ${escapeHTML(s.note)}` : ''}
        </div>
      </div>
      <button class="sheet-close-btn" style="width: 24px; height: 24px; font-size: 10px;" onclick="deleteSymptom('${s.id}')">✕</button>
    </div>
  `).join('');
}

function deleteSymptom(id) {
  let symptoms = JSON.parse(localStorage.getItem('pulse_symptoms') || '[]');
  symptoms = symptoms.filter(s => s.id !== id);
  localStorage.setItem('pulse_symptoms', JSON.stringify(symptoms));
  renderSymptoms();
}

function exportSymptomsPDF() {
  const activeProfile = getActiveProfileId();
  const profile = getProfileData(activeProfile);
  const symptoms = JSON.parse(localStorage.getItem('pulse_symptoms') || '[]').filter(s => !s.profileId || s.profileId === activeProfile);

  let rows = symptoms.map(s => `
    <tr>
      <td style="padding: 6px; border: 1px solid #ddd;">${new Date(s.datetime).toLocaleString('it-IT')}</td>
      <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${escapeHTML(s.type)}</td>
      <td style="padding: 6px; border: 1px solid #ddd; color: #FF2D55;">${escapeHTML(s.val)}</td>
      <td style="padding: 6px; border: 1px solid #ddd;">${escapeHTML(s.note || '-')}</td>
    </tr>
  `).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html><head><title>Diario Parametri Clinici — ${escapeHTML(profile.name)}</title>
    <style>body { font-family: sans-serif; padding: 25px; color: #111; } table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }</style>
    </head><body>
      <h2>Diario Parametri e Sintomi (1 Pagina per Specialista)</h2>
      <div><strong>Paziente:</strong> ${escapeHTML(profile.name)} &bull; <strong>CF:</strong> ${escapeHTML(profile.cf)}</div>
      <table><thead><tr style="background:#f0f0f0;"><th>Data / Ora</th><th>Parametro</th><th>Valore</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload = function() { window.print(); };</script>
    </body></html>
  `);
  win.document.close();
}

// 14. Armadietto Farmaci (Cartella Ricette & Farmaci)
function switchPharmaTab(tab) {
  const btnDocs = document.querySelectorAll('#pharmaSegmentedControl .seg-btn')[0];
  const btnCab = document.querySelectorAll('#pharmaSegmentedControl .seg-btn')[1];
  const docsList = document.getElementById('folderDocsListWrap');
  const cabinetWrap = document.getElementById('pharmaCabinetViewWrap');

  if (tab === 'cabinet') {
    btnDocs.classList.remove('active');
    btnCab.classList.add('active');
    docsList.style.display = 'none';
    cabinetWrap.style.display = 'block';
    renderMedicineCabinetInFolder();
  } else {
    btnCab.classList.remove('active');
    btnDocs.classList.add('active');
    docsList.style.display = 'block';
    cabinetWrap.style.display = 'none';
  }
}

// Aliases and Direct Views
function openPharmacyModal() {
  openPharmacyMode();
}

async function openCabinetView() {
  switchTab('archive');
  await openZoneFolder('pharma');
  switchPharmaTab('cabinet');
}

function openCalendarQuickSheet() {
  switchTab('agenda');
  const calSegBtn = document.getElementById('segAgendaCal');
  if (calSegBtn) calSegBtn.click();
}

function renderMedicineCabinetInFolder() {
  const container = document.getElementById('pharmaCabinetViewWrap');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const cabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const profileCabinet = cabinet.filter(c => !c.profileId || c.profileId === activeProfile);

  const now = new Date();
  const in60Days = new Date(Date.now() + 86400000 * 60);

  let html = `
    <!-- Form Diretto Aggiunta Farmaco (Sempre Pronto) -->
    <div class="glass-card" style="padding: 16px; margin-bottom: 16px; border: 1px solid var(--border-glass);">
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--accent-amber); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <span>💊</span>
        <span>Aggiungi Farmaco all'Armadietto</span>
      </div>
      <form id="addCabinetDirectForm" onsubmit="handleDirectCabinetAdd(event)">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px;">Nome Farmaco / Principio Attivo *</label>
            <input type="text" id="directCabName" class="form-input" placeholder="Es. Tachipirina 500mg, Oki gocce..." required style="padding: 10px 12px; font-size: 13px;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px;">Data di Scadenza *</label>
              <input type="date" id="directCabExpiry" class="form-input" required style="padding: 9px 10px; font-size: 13px;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px;">Quantità / Confezione</label>
              <input type="text" id="directCabQty" class="form-input" placeholder="Es. 1 scatola, 16 cpr" value="1 confezione" style="padding: 9px 10px; font-size: 13px;">
            </div>
          </div>
          <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 11px; font-size: 13px; font-weight: 700;">
            + Aggiungi all'Armadietto
          </button>
        </div>
      </form>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary);">
        Farmaci in Casa (${profileCabinet.length})
      </span>
    </div>
  `;

  if (profileCabinet.length === 0) {
    html += `<div class="empty-state" style="padding: 16px;"><div class="empty-text">Nessun farmaco nell'armadietto</div><div class="empty-sub">Usa il form sopra per registrare le scadenze dei farmaci che hai in casa.</div></div>`;
  } else {
    html += profileCabinet.map(item => {
      const exp = new Date(item.expiryDate);
      let badgeColor = 'var(--accent-teal)';
      let badgeText = 'Valido';
      if (exp < now) {
        badgeColor = 'var(--accent-coral)';
        badgeText = 'SCADUTO';
      } else if (exp <= in60Days) {
        badgeColor = 'var(--accent-amber)';
        badgeText = 'In scadenza';
      }

      const formattedExp = !isNaN(exp.getTime()) ? exp.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : item.expiryDate;

      return `
        <div class="glass-card" style="padding: 12px 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1; padding-right: 8px;">
              <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHTML(item.name)}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px; display: flex; align-items: center; gap: 8px;">
                <span>Disponibilità: <strong>${escapeHTML(item.quantity || '1')}</strong></span>
                <div style="display: inline-flex; align-items: center; gap: 3px; margin-left: 4px;">
                  <button class="btn-secondary-sm" style="padding: 1px 7px; font-size: 11px; min-width: 20px; height: 20px; line-height: 1;" onclick="updateCabinetQtyDelta('${item.id}', -1)" title="Riduci">-</button>
                  <button class="btn-secondary-sm" style="padding: 1px 7px; font-size: 11px; min-width: 20px; height: 20px; line-height: 1;" onclick="updateCabinetQtyDelta('${item.id}', 1)" title="Aumenta">+</button>
                </div>
              </div>
            </div>
            <span style="font-size: 11px; font-weight: 700; background: ${badgeColor}22; color: ${badgeColor}; padding: 3px 8px; border-radius: 99px; white-space: nowrap;">
              ${badgeText}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: var(--text-tertiary); border-top: 1px solid var(--border-subtle); padding-top: 8px;">
            <span>Scadenza: <strong style="color: var(--text-primary);">${formattedExp}</strong></span>
            <button style="background: none; border: none; color: var(--accent-coral); cursor: pointer; font-size: 11px; font-weight: 600;" onclick="deleteCabinetItem('${item.id}')">Elimina</button>
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = html;

  // Imposta data minima a oggi nel date picker se presente
  const expInput = document.getElementById('directCabExpiry');
  if (expInput && !expInput.value) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expInput.value = nextYear.toISOString().split('T')[0];
  }
}

function handleDirectCabinetAdd(event) {
  event.preventDefault();
  const nameInput = document.getElementById('directCabName');
  const expiryInput = document.getElementById('directCabExpiry');
  const qtyInput = document.getElementById('directCabQty');

  const name = nameInput.value.trim();
  const expiry = expiryInput.value;
  const qty = qtyInput.value.trim() || '1 confezione';

  if (!name || !expiry) {
    alert('Inserisci il nome del farmaco e la data di scadenza.');
    return;
  }

  const newItem = {
    id: 'cab_' + Date.now(),
    profileId: getActiveProfileId(),
    name: name,
    expiryDate: expiry,
    quantity: qty,
    notes: ''
  };

  const cabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  cabinet.push(newItem);
  localStorage.setItem('pulse_cabinet', JSON.stringify(cabinet));

  showToast('Farmaco aggiunto all\'armadietto', '💊');
  renderMedicineCabinetInFolder();
  renderBentoWidgets();
}

function updateCabinetQtyDelta(id, delta) {
  let cabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const item = cabinet.find(c => c.id === id);
  if (!item) return;

  // Analizza numero nella quantità
  const match = (item.quantity || '').match(/\d+/);
  if (match) {
    const currentNum = parseInt(match[0], 10);
    const newNum = Math.max(0, currentNum + delta);
    item.quantity = item.quantity.replace(/\d+/, newNum);
  } else {
    item.quantity = delta > 0 ? '2 confezioni' : '0 (esaurito)';
  }

  localStorage.setItem('pulse_cabinet', JSON.stringify(cabinet));
  renderMedicineCabinetInFolder();
  renderBentoWidgets();
}

function openAddCabinetModal() {
  const formWrap = document.getElementById('addCabinetDirectForm');
  if (formWrap) {
    document.getElementById('directCabName').focus();
    return;
  }
}

function deleteCabinetItem(id) {
  let cabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  cabinet = cabinet.filter(c => c.id !== id);
  localStorage.setItem('pulse_cabinet', JSON.stringify(cabinet));
  renderMedicineCabinetInFolder();
  renderBentoWidgets();
}

// 15. Scheda Vista & Lenti
function renderVisionCardInFolder() {
  const container = document.getElementById('eyesVisionCardWrap');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const saved = JSON.parse(localStorage.getItem(`pulse_vision_${activeProfile}`) || '{}');

  container.innerHTML = `
    <div class="glass-card" style="border-color: rgba(0, 122, 255, 0.3); background: linear-gradient(135deg, rgba(0,122,255,0.06) 0%, rgba(0,199,190,0.05) 100%), var(--bg-card);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 700; color: var(--accent-blue); text-transform: uppercase;">👓 Prescrizione Ottica Personale</span>
        <button class="btn-secondary-sm" style="flex: none; padding: 4px 10px; font-size: 11px;" onclick="copyVisionPrescription()">Copia Valori</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div style="background: var(--bg-card-secondary); padding: 10px; border-radius: var(--radius-sm);">
          <div style="font-size: 11px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">OCCHIO DESTRO (OD)</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Sfera: <strong>${saved.odSph || '-'}</strong></div>
          <div style="font-size: 12px; color: var(--text-secondary);">Cilindro: <strong>${saved.odCyl || '-'}</strong></div>
          <div style="font-size: 12px; color: var(--text-secondary);">Asse: <strong>${saved.odAxis || '-'}</strong></div>
        </div>
        <div style="background: var(--bg-card-secondary); padding: 10px; border-radius: var(--radius-sm);">
          <div style="font-size: 11px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">OCCHIO SINISTRO (OS)</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Sfera: <strong>${saved.osSph || '-'}</strong></div>
          <div style="font-size: 12px; color: var(--text-secondary);">Cilindro: <strong>${saved.osCyl || '-'}</strong></div>
          <div style="font-size: 12px; color: var(--text-secondary);">Asse: <strong>${saved.osAxis || '-'}</strong></div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
        <span>DIP: <strong>${saved.dip || '63 mm'}</strong></span>
        <button style="background: none; border: none; color: var(--accent-blue); font-weight: 600; cursor: pointer;" onclick="openEditVisionModal()">Modifica Valori</button>
      </div>
    </div>
  `;
}

function copyVisionPrescription() {
  const activeProfile = getActiveProfileId();
  const saved = JSON.parse(localStorage.getItem(`pulse_vision_${activeProfile}`) || '{}');
  const txt = `PRESCRIZIONE LENTI:\nOD: Sfera ${saved.odSph || '-'}, Cilindro ${saved.odCyl || '-'}, Asse ${saved.odAxis || '-'}\nOS: Sfera ${saved.osSph || '-'}, Cilindro ${saved.osCyl || '-'}, Asse ${saved.osAxis || '-'}\nDIP: ${saved.dip || '-'}`;
  navigator.clipboard.writeText(txt);
  showToast('Prescrizione copiata!', '📋');
}

function openEditVisionModal() {
  const activeProfile = getActiveProfileId();
  const saved = JSON.parse(localStorage.getItem(`pulse_vision_${activeProfile}`) || '{}');

  const odSph = prompt('Occhio Destro - Sfera:', saved.odSph || '-1.50');
  const odCyl = prompt('Occhio Destro - Cilindro:', saved.odCyl || '-0.50');
  const odAxis = prompt('Occhio Destro - Asse:', saved.odAxis || '90°');
  const osSph = prompt('Occhio Sinistro - Sfera:', saved.osSph || '-1.75');
  const osCyl = prompt('Occhio Sinistro - Cilindro:', saved.osCyl || '-0.25');
  const osAxis = prompt('Occhio Sinistro - Asse:', saved.osAxis || '85°');
  const dip = prompt('Distanza Interpupillare (DIP):', saved.dip || '63 mm');

  const updated = { odSph, odCyl, odAxis, osSph, osCyl, osAxis, dip, date: new Date().toISOString().split('T')[0] };
  localStorage.setItem(`pulse_vision_${activeProfile}`, JSON.stringify(updated));
  showToast('Prescrizione aggiornata', '👓');
  renderVisionCardInFolder();
}

// 16. Radar Prevenzione
function initPreventionRadar() {
  const btnCal = document.getElementById('segAgendaCal');
  const btnRadar = document.getElementById('segAgendaRadar');
  const calView = document.getElementById('agendaCalendarView');
  const radarView = document.getElementById('agendaRadarView');

  if (btnCal && btnRadar) {
    btnCal.addEventListener('click', () => {
      btnCal.classList.add('active');
      btnRadar.classList.remove('active');
      calView.style.display = 'block';
      radarView.style.display = 'none';
    });
    btnRadar.addEventListener('click', () => {
      btnRadar.classList.add('active');
      btnCal.classList.remove('active');
      calView.style.display = 'none';
      radarView.style.display = 'block';
      renderPreventionRadar();
    });
  }
}

function renderPreventionRadar() {
  const container = document.getElementById('preventionRadarList');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const radar = JSON.parse(localStorage.getItem('pulse_radar') || '[]');
  const profileRadar = radar.filter(r => !r.profileId || r.profileId === activeProfile);

  const now = new Date();

  container.innerHTML = profileRadar.map(item => {
    const lastDate = new Date(item.lastDate);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + item.months);

    const diffDays = Math.round((nextDate - now) / 86400000);

    let statusColor = 'var(--accent-teal)';
    let statusText = `Tra ${Math.max(0, Math.round(diffDays / 30))} mesi`;
    if (diffDays < 0) {
      statusColor = 'var(--accent-coral)';
      statusText = `SCADUTO da ${Math.abs(diffDays)} gg`;
    } else if (diffDays <= 45) {
      statusColor = 'var(--accent-amber)';
      statusText = `A breve (${diffDays} gg)`;
    }

    const zone = getBodyZone(item.iconId || 'blood');

    return `
      <div class="glass-card" style="margin-bottom: 12px; padding: 14px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="squircle-icon-badge" style="width: 42px; height: 42px; min-width: 42px; border-radius: 13px; background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color};">
              ${zone.svg}
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 700;">${escapeHTML(item.name)}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Ogni ${item.months} mesi • Ultimo: ${lastDate.toLocaleDateString('it-IT')}</div>
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 800; background: ${statusColor}22; color: ${statusColor}; padding: 4px 10px; border-radius: 99px;">
            ${statusText}
          </span>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
          <button class="btn-secondary-sm" style="font-size: 11px;" onclick="markRadarDoneToday('${item.id}')">✓ Fatto oggi</button>
          <button class="btn-secondary-sm" style="font-size: 11px; color: var(--accent-blue);" onclick="bookRadarAppointment('${item.name}')">Prenota in Agenda</button>
        </div>
      </div>
    `;
  }).join('');
}

function markRadarDoneToday(radarId) {
  const radar = JSON.parse(localStorage.getItem('pulse_radar') || '[]');
  const item = radar.find(r => r.id === radarId);
  if (item) {
    item.lastDate = new Date().toISOString().split('T')[0];
    localStorage.setItem('pulse_radar', JSON.stringify(radar));
    showToast('Controllo registrato oggi!', '🎉');
    renderPreventionRadar();
  }
}

function bookRadarAppointment(name) {
  switchTab('agenda');
  document.getElementById('segAgendaCal').click();
  openNewApptModal();
  document.getElementById('apptTitleInput').value = `Controllo ${name}`;
}

// 17. Riassunto Clinico "Nuovo Medico"
function initClinicalSummaryPDF() {
  const btn = document.getElementById('btnClinicalSummaryPdf');
  if (btn) btn.addEventListener('click', generateClinicalSummaryPDF);
}

async function generateClinicalSummaryPDF() {
  const activeProfile = getActiveProfileId();
  const profile = getProfileData(activeProfile);
  const allDocs = await pulseDB.getAllDocuments();
  const docs = allDocs.filter(d => !d.profileId || d.profileId === activeProfile).slice(0, 6);
  const vision = JSON.parse(localStorage.getItem(`pulse_vision_${activeProfile}`) || '{}');
  const thers = JSON.parse(localStorage.getItem('pulse_therapies') || '[]').filter(t => !t.profileId || t.profileId === activeProfile);

  let docsRows = docs.map(d => `
    <tr>
      <td style="padding: 6px; border: 1px solid #ddd;">${d.date ? new Date(d.date).toLocaleDateString('it-IT') : 'N/D'}</td>
      <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${escapeHTML(d.title)}</td>
      <td style="padding: 6px; border: 1px solid #ddd;">${escapeHTML(d.category)}</td>
      <td style="padding: 6px; border: 1px solid #ddd;">${escapeHTML(d.notes || '-')}</td>
    </tr>
  `).join('');

  let thersRows = thers.map(t => `<li><strong>${escapeHTML(t.name)}</strong>: ${t.dosesPerDay} dosi/die (${escapeHTML(t.notes || '')})</li>`).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html><head><title>Riassunto Clinico — ${escapeHTML(profile.name)}</title>
    <style>body { font-family: -apple-system, sans-serif; padding: 30px; color: #111; line-height: 1.5; } h1 { font-size: 20px; border-bottom: 2px solid #FF2D55; padding-bottom: 4px; } .box { background: #f8f8fa; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; } table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }</style>
    </head><body>
      <h1>Riassunto Clinico Personale & Cartella Rapida</h1>
      <div style="font-size: 12px; color: #666; margin-bottom: 16px;">Generato da Pulse • Documento riassuntivo per prima visita medica specialistica</div>

      <div class="box">
        <strong>Paziente:</strong> ${escapeHTML(profile.name)} &bull; <strong>Codice Fiscale:</strong> ${escapeHTML(profile.cf)}<br>
        <strong>Gruppo Sanguigno:</strong> ${escapeHTML(profile.bloodType)} &bull; <strong>Allergie Note:</strong> <span style="color: #FF2D55; font-weight: bold;">${escapeHTML(profile.allergies)}</span><br>
        <strong>Medico di Base Curante:</strong> ${escapeHTML(profile.doctor)} (${escapeHTML(profile.doctorPhone || 'N/D')})
      </div>

      ${thersRows ? `<div class="box"><strong>Terapie e Farmaci in Corso:</strong><ul style="margin: 6px 0 0 16px; padding: 0;">${thersRows}</ul></div>` : ''}

      ${vision.odSph ? `<div class="box"><strong>Prescrizione Ottica:</strong> OD (Sfera ${vision.odSph}, Cil ${vision.odCyl}, Asse ${vision.odAxis}) &bull; OS (Sfera ${vision.osSph}, Cil ${vision.osCyl}, Asse ${vision.osAxis}) &bull; DIP: ${vision.dip}</div>` : ''}

      <div style="font-size: 14px; font-weight: bold; margin-top: 16px;">Ultimi Referti ed Esami Diagnostici</div>
      <table>
        <thead><tr style="background: #eee;"><th style="padding:6px; border:1px solid #ddd;">Data</th><th style="padding:6px; border:1px solid #ddd;">Documento</th><th style="padding:6px; border:1px solid #ddd;">Tipo</th><th style="padding:6px; border:1px solid #ddd;">Esito / Note</th></tr></thead>
        <tbody>${docsRows}</tbody>
      </table>
      <script>window.onload = function() { window.print(); };</script>
    </body></html>
  `);
  win.document.close();
}

// 18. Profile ICE
function getProfileData(profileId) {
  const saved = localStorage.getItem(`pulse_profile_${profileId}`);
  if (saved) return JSON.parse(saved);
  if (profileId === 'me') {
    const old = localStorage.getItem('pulse_profile');
    if (old) return JSON.parse(old);
  }
  return {
    name: 'Utente Pulse',
    cf: '',
    bloodType: '0 Rh+',
    allergies: 'Nessuna',
    doctor: 'Dr. Marco Rossi',
    doctorPhone: '+39 051 1234567',
    doctorWa: '3401234567',
    doctorEmail: 'dr.rossi@medicina.it',
    doctorAddress: 'Via Roma 14, Bologna',
    doctorNotes: 'Riceve su appuntamento • Segreteria attiva 08:30–11:30',
    doctorHours: {
      lun: '09:00 - 12:00',
      mar: '15:00 - 18:00',
      mer: '09:00 - 12:00',
      gio: '15:00 - 18:00',
      ven: '09:00 - 12:00'
    }
  };
}

function initProfile() {
  const editBtn = document.getElementById('editIceBtn');
  const form = document.getElementById('iceForm');

  editBtn.addEventListener('click', () => {
    const activeId = getActiveProfileId();
    const profile = getProfileData(activeId);
    document.getElementById('iceNameInput').value = profile.name || '';
    document.getElementById('iceCfInput').value = profile.cf || '';
    document.getElementById('iceBloodInput').value = profile.bloodType || '0 Rh+';
    document.getElementById('iceAllergiesInput').value = profile.allergies || '';
    document.getElementById('iceDocInput').value = profile.doctor || '';
    document.getElementById('icePhoneInput').value = profile.doctorPhone || '';
    document.getElementById('iceEmailInput').value = profile.doctorEmail || '';
    openModal('editIceModalOverlay');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const activeId = getActiveProfileId();
    const existing = getProfileData(activeId);
    const updated = {
      ...existing,
      name: document.getElementById('iceNameInput').value.trim() || 'Utente Pulse',
      cf: document.getElementById('iceCfInput').value.trim().toUpperCase(),
      bloodType: document.getElementById('iceBloodInput').value,
      allergies: document.getElementById('iceAllergiesInput').value.trim() || 'Nessuna nota',
      doctor: document.getElementById('iceDocInput').value.trim(),
      doctorPhone: document.getElementById('icePhoneInput').value.trim(),
      doctorEmail: document.getElementById('iceEmailInput').value.trim()
    };
    localStorage.setItem(`pulse_profile_${activeId}`, JSON.stringify(updated));

    const profiles = getProfiles();
    const p = profiles.find(item => item.id === activeId);
    if (p) {
      p.name = updated.name.split(' ')[0];
      localStorage.setItem('pulse_profiles_list', JSON.stringify(profiles));
      updateProfilePill();
    }

    closeAllModals();
    renderProfile();
    renderBentoWidgets();
    showToast('Scheda ICE aggiornata', '💳');
  });

  document.getElementById('exportBackupBtn').addEventListener('click', exportFullBackup);
  document.getElementById('importBackupInput').addEventListener('change', importFullBackup);
  document.getElementById('resetDataBtn').addEventListener('click', resetAllData);
}

function renderProfile() {
  const activeId = getActiveProfileId();
  const profile = getProfileData(activeId);

  document.getElementById('profileNameDisplay').innerText = profile.name || 'Mario Rossi';
  document.getElementById('profileCfDisplay').innerText = profile.cf || 'RSSMRA85M01H501Z';
  document.getElementById('profileBloodDisplay').innerText = profile.bloodType || '0 Rh+';
  document.getElementById('profileAllergiesDisplay').innerText = profile.allergies || 'Nessuna';
  document.getElementById('profileDoctorDisplay').innerText = profile.doctor || 'Non indicato';

  const docActions = document.getElementById('doctorActionsContainer');
  let actionsHTML = '';
  actionsHTML += `<button onclick="openDoctorModal()" class="btn-secondary-sm" style="padding: 6px 10px;">📋 Scheda Medico</button>`;
  if (profile.doctorPhone) {
    actionsHTML += `<a href="tel:${profile.doctorPhone}" class="btn-secondary-sm" style="text-decoration: none; padding: 6px 10px;">📞 Chiama</a>`;
  }
  if (profile.doctorEmail) {
    actionsHTML += `<a href="mailto:${profile.doctorEmail}" class="btn-secondary-sm" style="text-decoration: none; padding: 6px 10px;">✉️ Email</a>`;
  }
  docActions.innerHTML = actionsHTML;

  estimateStorage();
}

function copyFiscalCode() {
  const activeId = getActiveProfileId();
  const profile = getProfileData(activeId);
  const cf = profile.cf || document.getElementById('profileCfDisplay').innerText;
  navigator.clipboard.writeText(cf).then(() => {
    showToast('Codice Fiscale copiato!', '📋');
  }).catch(() => {
    showToast('Codice: ' + cf, '📋');
  });
}

async function estimateStorage() {
  const storageLabel = document.getElementById('storageUsageDisplay');
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const est = await navigator.storage.estimate();
    const usedKB = Math.round((est.usage || 0) / 1024);
    if (usedKB > 1024) {
      storageLabel.innerText = `${(usedKB / 1024).toFixed(1)} MB utilizzati`;
    } else {
      storageLabel.innerText = `${usedKB} KB utilizzati`;
    }
  } else {
    storageLabel.innerText = 'Locale protetto su dispositivo';
  }
}

// Quick Hub
const DEFAULT_HUB_LINKS = [
  { id: 'fse', name: 'Fascicolo Sanitario', url: 'https://www.fascicolosanitario.regione.emilia-romagna.it/', iconColor: '#007AFF', letter: 'FSE' },
  { id: 'cup', name: 'CUPWeb Prenotazioni', url: 'https://www.cupweb.it/', iconColor: '#00C7BE', letter: 'CUP' },
  { id: 'miodottore', name: 'MioDottore', url: 'https://www.miodottore.it/', iconColor: '#34C759', letter: 'MD' },
  { id: 'farmacie', name: 'Farmacie di Turno', url: 'https://www.farmaciediturno.org/', iconColor: '#FF9500', letter: 'Rx' },
  { id: 'apple', name: 'Apple Salute', url: 'https://www.apple.com/it/ios/health/', iconColor: '#FF2D55', letter: '❤️' },
  { id: '730', name: 'Spese Sanitarie 730', url: 'https://sistemats1.sanita.finanze.it/', iconColor: '#AF52DE', letter: '730' }
];

function initQuickHub() {
  renderQuickHub();
  const form = document.getElementById('customHubForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('customHubName').value.trim();
    let url = document.getElementById('customHubUrl').value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const customLinks = JSON.parse(localStorage.getItem('pulse_custom_hub') || '[]');
    customLinks.push({
      id: 'custom_' + Date.now(),
      name: name,
      url: url,
      iconColor: '#007AFF',
      letter: name.substring(0, 2).toUpperCase()
    });
    localStorage.setItem('pulse_custom_hub', JSON.stringify(customLinks));
    closeAllModals();
    form.reset();
    renderQuickHub();
    showToast('Collegamento aggiunto', '🔗');
  });
}

function renderQuickHub() {
  const container = document.getElementById('healthHubGrid');
  const customLinks = JSON.parse(localStorage.getItem('pulse_custom_hub') || '[]');
  const allLinks = [...DEFAULT_HUB_LINKS, ...customLinks];

  container.innerHTML = allLinks.map(link => `
    <a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" class="glass-card" style="padding: 14px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; text-align: center; gap: 8px;">
      <div class="squircle-icon-badge" style="width: 44px; height: 44px; min-width: 44px; border-radius: 13px; background: ${link.iconColor}18; border: 1px solid ${link.iconColor}33; color: ${link.iconColor};">
        <span style="font-weight: 800; font-size: 15px;">${link.letter}</span>
      </div>
      <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.2;">${escapeHTML(link.name)}</div>
    </a>
  `).join('') + `
    <div class="glass-card" onclick="openModal('addHubModalOverlay')" style="padding: 14px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border-style: dashed; gap: 8px;">
      <div class="squircle-icon-badge" style="width: 44px; height: 44px; min-width: 44px; border-radius: 13px; background: var(--bg-card-secondary); color: var(--text-secondary);">
        <span style="font-size: 22px;">+</span>
      </div>
      <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">Aggiungi</div>
    </div>
  `;
}

// 19. Backup & Restore
async function exportFullBackup() {
  const docs = await pulseDB.getAllDocuments();
  const backup = {
    pulse_version: '2.5',
    export_date: new Date().toISOString(),
    profiles: getProfiles(),
    appointments: JSON.parse(localStorage.getItem('pulse_appointments') || '[]'),
    custom_hub: JSON.parse(localStorage.getItem('pulse_custom_hub') || '[]'),
    pin_code: localStorage.getItem('pulse_pin_code') || null,
    therapies: JSON.parse(localStorage.getItem('pulse_therapies') || '[]'),
    symptoms: JSON.parse(localStorage.getItem('pulse_symptoms') || '[]'),
    cabinet: JSON.parse(localStorage.getItem('pulse_cabinet') || '[]'),
    radar: JSON.parse(localStorage.getItem('pulse_radar') || '[]'),
    documents: docs
  };

  getProfiles().forEach(p => {
    backup[`profile_${p.id}`] = getProfileData(p.id);
    backup[`vision_${p.id}`] = JSON.parse(localStorage.getItem(`pulse_vision_${p.id}`) || '{}');
  });

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Pulse_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup scaricato con successo', '📦');
}

function importFullBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      // Support legacy backup format
      if (data.aura_version && !data.pulse_version) data.pulse_version = data.aura_version;

      if (data.profiles) localStorage.setItem('pulse_profiles_list', JSON.stringify(data.profiles));
      if (data.appointments) localStorage.setItem('pulse_appointments', JSON.stringify(data.appointments));
      if (data.custom_hub) localStorage.setItem('pulse_custom_hub', JSON.stringify(data.custom_hub));
      if (data.pin_code) localStorage.setItem('pulse_pin_code', data.pin_code);
      if (data.therapies) localStorage.setItem('pulse_therapies', JSON.stringify(data.therapies));
      if (data.symptoms) localStorage.setItem('pulse_symptoms', JSON.stringify(data.symptoms));
      if (data.cabinet) localStorage.setItem('pulse_cabinet', JSON.stringify(data.cabinet));
      if (data.radar) localStorage.setItem('pulse_radar', JSON.stringify(data.radar));

      Object.keys(data).forEach(k => {
        if (k.startsWith('profile_')) {
          const profId = k.replace('profile_', '');
          localStorage.setItem(`pulse_profile_${profId}`, JSON.stringify(data[k]));
        }
        if (k.startsWith('vision_')) {
          const profId = k.replace('vision_', '');
          localStorage.setItem(`pulse_vision_${profId}`, JSON.stringify(data[k]));
        }
      });

      if (data.documents && Array.isArray(data.documents)) {
        await pulseDB.clearAll();
        for (const doc of data.documents) {
          await pulseDB.saveDocument(doc);
        }
      }

      showToast('Backup ripristinato!', '🎉');
      await renderAllViews();
    } catch (err) {
      alert('File di backup non valido.');
    }
  };
  reader.readAsText(file);
}

async function resetAllData() {
  if (confirm('Attenzione: Vuoi cancellare tutti i dati locali e ripristinare i valori demo?')) {
    await pulseDB.clearAll();
    localStorage.clear();
    await initSeedData();
    initProfilesState();
    await renderAllViews();
    showToast('Dati ripristinati allo stato iniziale', '🔄');
  }
}

// Modal helper functions with scroll lock
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeAllModals() {
  cleanupViewerObjectUrl();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  document.body.classList.remove('modal-open');
}

// ----------------------------------------------------
// SCHEDA INTERATTIVA MEDICO DI BASE (iOS Contact Style)
// ----------------------------------------------------
const DAYS_OF_WEEK_MAP = [
  { key: 'lun', label: 'Lunedì' },
  { key: 'mar', label: 'Martedì' },
  { key: 'mer', label: 'Mercoledì' },
  { key: 'gio', label: 'Giovedì' },
  { key: 'ven', label: 'Venerdì' }
];

function initDoctorModal() {
  const btnEdit = document.getElementById('btnEditDoctor');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      const isEditing = document.getElementById('doctorEditForm').style.display !== 'none';
      toggleDoctorEditMode(!isEditing);
    });
  }

  const editForm = document.getElementById('doctorEditForm');
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveDoctorData();
    });
  }
}

function toggleDoctorEditMode(showEdit) {
  const viewSec = document.getElementById('doctorViewSection');
  const editForm = document.getElementById('doctorEditForm');
  const btnEdit = document.getElementById('btnEditDoctor');

  if (showEdit) {
    viewSec.style.display = 'none';
    editForm.style.display = 'block';
    if (btnEdit) btnEdit.innerText = 'Visualizza';
    populateDoctorEditForm();
  } else {
    viewSec.style.display = 'block';
    editForm.style.display = 'none';
    if (btnEdit) btnEdit.innerText = 'Modifica';
  }
}

function openDoctorModal() {
  const activeId = getActiveProfileId();
  const profile = getProfileData(activeId);

  // Popola vista contatti
  const nameEl = document.getElementById('docSheetName');
  if (nameEl) nameEl.innerText = profile.doctor || 'Medico di Medicina Generale';

  const addrLink = document.getElementById('docSheetAddressLink');
  const addrText = document.getElementById('docSheetAddressText');
  const address = profile.doctorAddress || 'Indirizzo non impostato';
  if (addrText) addrText.innerText = address;
  if (addrLink) {
    addrLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  // Azioni Chiamata, WhatsApp, Email
  const phone = profile.doctorPhone || '';
  const wa = profile.doctorWa || profile.doctorPhone || '';
  const email = profile.doctorEmail || '';

  const callBtn = document.getElementById('docCallBtn');
  if (callBtn) {
    callBtn.href = phone ? `tel:${phone.replace(/\s+/g, '')}` : '#';
    callBtn.style.opacity = phone ? '1' : '0.4';
    callBtn.style.pointerEvents = phone ? 'auto' : 'none';
  }

  const waBtn = document.getElementById('docWaBtn');
  if (waBtn) {
    const cleanWa = wa.replace(/[^0-9]/g, '');
    const waNumber = cleanWa.startsWith('39') ? cleanWa : `39${cleanWa}`;
    waBtn.href = cleanWa ? `https://wa.me/${waNumber}` : '#';
    waBtn.style.opacity = cleanWa ? '1' : '0.4';
    waBtn.style.pointerEvents = cleanWa ? 'auto' : 'none';
  }

  const mailBtn = document.getElementById('docMailBtn');
  if (mailBtn) {
    mailBtn.href = email ? `mailto:${email}` : '#';
    mailBtn.style.opacity = email ? '1' : '0.4';
    mailBtn.style.pointerEvents = email ? 'auto' : 'none';
  }

  // Badge live e calcolo apertura
  const status = calculateDoctorOpenStatus(profile);
  const liveBadge = document.getElementById('docLiveBadge');
  if (liveBadge) {
    if (status.isOpen) {
      liveBadge.className = 'doc-live-badge live-open';
      liveBadge.innerText = `● Aperto fino alle ${status.closingTime}`;
    } else {
      liveBadge.className = 'doc-live-badge live-closed';
      liveBadge.innerText = `● Chiuso (Apre ${status.nextOpening})`;
    }
  }

  // Lista Orari Lun-Ven
  const hoursList = document.getElementById('docHoursList');
  if (hoursList) {
    const hours = profile.doctorHours || {
      lun: '09:00 - 12:00',
      mar: '15:00 - 18:00',
      mer: '09:00 - 12:00',
      gio: '15:00 - 18:00',
      ven: '09:00 - 12:00'
    };

    const now = new Date();
    const dayIndex = now.getDay(); // 0 Dom, 1 Lun, 2 Mar, ...
    const dayKeyMap = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
    const currentKey = dayKeyMap[dayIndex];

    let html = '';
    DAYS_OF_WEEK_MAP.forEach(({ key, label }) => {
      const isToday = key === currentKey;
      const slot = hours[key] || 'Chiuso';
      html += `
        <div class="doc-hour-row ${isToday ? 'today' : ''}">
          <span class="doc-hour-day">${label} ${isToday ? '<span style="font-size: 10px; background: rgba(0, 122, 255, 0.15); color: var(--accent-blue); padding: 2px 6px; border-radius: 6px; margin-left: 4px; font-weight: 700;">OGGI</span>' : ''}</span>
          <span class="doc-hour-time">${escapeHTML(slot)}</span>
        </div>
      `;
    });
    hoursList.innerHTML = html;
  }

  // Note
  const notesEl = document.getElementById('docNotesDisplay');
  if (notesEl) {
    notesEl.innerText = profile.doctorNotes || 'Riceve su appuntamento • Segreteria attiva negli orari di studio';
  }

  toggleDoctorEditMode(false);
  openModal('doctorModalOverlay');
}

function populateDoctorEditForm() {
  const activeId = getActiveProfileId();
  const profile = getProfileData(activeId);

  document.getElementById('docEditName').value = profile.doctor || '';
  document.getElementById('docEditPhone').value = profile.doctorPhone || '';
  document.getElementById('docEditWa').value = profile.doctorWa || '';
  document.getElementById('docEditEmail').value = profile.doctorEmail || '';
  document.getElementById('docEditAddress').value = profile.doctorAddress || '';
  document.getElementById('docEditNotes').value = profile.doctorNotes || '';

  const hours = profile.doctorHours || {
    lun: '09:00 - 12:00',
    mar: '15:00 - 18:00',
    mer: '09:00 - 12:00',
    gio: '15:00 - 18:00',
    ven: '09:00 - 12:00'
  };

  const hoursGrid = document.getElementById('docEditHoursGrid');
  if (hoursGrid) {
    let html = '';
    DAYS_OF_WEEK_MAP.forEach(({ key, label }) => {
      const val = hours[key] || '09:00 - 12:00';
      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <span style="font-size: 13px; font-weight: 600; width: 80px;">${label}</span>
          <input type="text" id="docEditHour_${key}" class="form-input" style="padding: 6px 10px; font-size: 13px;" value="${escapeHTML(val)}" placeholder="Es. 09:00 - 12:00 oppure Chiuso">
        </div>
      `;
    });
    hoursGrid.innerHTML = html;
  }
}

function saveDoctorData() {
  const activeId = getActiveProfileId();
  const existing = getProfileData(activeId);

  const updatedHours = {};
  DAYS_OF_WEEK_MAP.forEach(({ key }) => {
    const inputEl = document.getElementById(`docEditHour_${key}`);
    updatedHours[key] = inputEl ? inputEl.value.trim() : '09:00 - 12:00';
  });

  const updated = {
    ...existing,
    doctor: document.getElementById('docEditName').value.trim() || 'Dr. Medico Curante',
    doctorPhone: document.getElementById('docEditPhone').value.trim(),
    doctorWa: document.getElementById('docEditWa').value.trim(),
    doctorEmail: document.getElementById('docEditEmail').value.trim(),
    doctorAddress: document.getElementById('docEditAddress').value.trim(),
    doctorNotes: document.getElementById('docEditNotes').value.trim(),
    doctorHours: updatedHours
  };

  localStorage.setItem(`pulse_profile_${activeId}`, JSON.stringify(updated));

  showToast('Scheda Medico salvata!', '👨‍⚕️');
  openDoctorModal();
  renderBentoWidgets();
  renderProfile();
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
