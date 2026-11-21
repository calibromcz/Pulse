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
  initClinicalSummaryPDF();
  initProfile();
  initDoctorModal();
  initQuickHub();
  initLocalRemindersSystem();
  initGlobalModalsHandler();
  await renderAllViews();
  checkLocalRemindersAndAlerts();
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
      { id: 'me', name: 'Io' }
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
  if (lockBtn) {
    lockBtn.addEventListener('click', triggerManualLock);
  }

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

// 4. Initial Seed Data (Produzione: Pulito di default per nuovi utenti)
async function initSeedData() {
  // Nessun dato demo/fittizio precaricato: il database locale e il localStorage partono puliti
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
      openCalendarQuickSheet();
    });
  }

  const headerFirstAid = document.getElementById('headerFirstAidBtn');
  if (headerFirstAid) {
    headerFirstAid.addEventListener('click', () => {
      openFirstAidModal();
    });
  }

  const desktopFirstAid = document.getElementById('desktopFirstAidBtn');
  if (desktopFirstAid) {
    desktopFirstAid.addEventListener('click', () => {
      openFirstAidModal();
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

  if (tabId === 'archive') {
    const searchInput = document.getElementById('docSearchInput');
    if (searchInput) {
      searchInput.value = '';
      currentSearch = '';
    }
    const filterResults = document.getElementById('archiveFilterResults');
    if (filterResults) filterResults.style.display = 'none';
    const grid = document.getElementById('bodyZonesGrid');
    if (grid) grid.style.display = 'grid';
    renderArchiveGrid();
  }

  if (tabId === 'agenda') {
    renderAgendaVisits();
    renderHealthNotes();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render Master Views
async function renderAllViews() {
  await renderHome();
  await renderArchiveGrid();
  renderAppointments();
  renderAgendaVisits();
  renderHealthNotes();
  renderCalendar();
  renderProfile();
  renderTax730Dashboard();
  renderTherapies();
  renderSymptoms();
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
        <button class="btn-secondary-sm" onclick="openNewApptModal()" aria-label="Aggiungi visita" style="width: 36px; height: 36px; min-width: 36px; border-radius: 10px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; font-weight: 700; color: var(--accent-blue); margin-left: 8px;">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
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

  // 3. Lista Farmaci da Comprare
  const shoppingStatusEl = document.getElementById('widgetShoppingStatus');
  if (shoppingStatusEl) {
    const shoppingList = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]').filter(s => !s.profileId || s.profileId === activeProfile);
    const pendingItems = shoppingList.filter(s => !s.checked);
    if (pendingItems.length > 0) {
      shoppingStatusEl.innerHTML = `<span style="color: var(--accent-teal); font-weight: 700;">● ${pendingItems.length} da comprare</span>`;
    } else {
      shoppingStatusEl.innerText = shoppingList.length > 0 ? 'Tutto acquistato ✓' : 'Lista vuota';
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
    <div class="doc-item-card" onclick="openDocById('${doc.id}')" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px;">
      <div class="doc-left" style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;">
        <div class="squircle-icon-badge" style="background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color}; flex-shrink: 0; width: 42px; height: 42px; min-width: 42px;">
          ${zone.svg}
        </div>
        <div class="doc-info" style="overflow: hidden; flex: 1; min-width: 0;">
          <div class="doc-title" style="font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(doc.title)}</div>
          <div class="doc-sub" style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 2px;">
            <span class="doc-tag ${tagClass}">${escapeHTML(doc.category || 'Referto')}</span>
            ${doc.isPdf ? '<span style="font-size: 10px; font-weight: 800; background: rgba(0, 122, 255, 0.12); color: var(--accent-blue); padding: 1px 5px; border-radius: 4px;">PDF</span>' : ''}
            ${doc.amount ? `<span style="font-weight: 700; color: var(--accent-amber);">€ ${Number(doc.amount).toFixed(2)}</span>` : ''}
            <span>•</span>
            <span>${dateStr}</span>
          </div>
          ${doc.notes ? `
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
              <span>📝</span>
              <span>${escapeHTML(doc.notes)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Azioni Rapide Riga: Nota, Scarica, Elimina (Stop Propagation) -->
      <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;" onclick="event.stopPropagation()">
        <!-- Tasto Nota -->
        <button type="button" class="btn-secondary-sm" onclick="openEditDocNote('${doc.id}')" style="min-width: 36px; min-height: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px;" title="Aggiungi / Modifica Nota">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>

        <!-- Tasto Scarica -->
        <button type="button" class="btn-secondary-sm" onclick="downloadDocById('${doc.id}')" style="min-width: 36px; min-height: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px;" title="Scarica File">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        <!-- Tasto Elimina Corallo Tenue -->
        <button type="button" class="btn-secondary-sm" onclick="deleteDocItem('${doc.id}')" style="min-width: 36px; min-height: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: var(--accent-coral); background: rgba(224, 108, 117, 0.12); border-color: rgba(224, 108, 117, 0.25);" title="Elimina documento">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
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

  if (gridContainer) {
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

  // Render Sezione "Ultimi Documenti nel Dossier" (sotto le 10 cartelle)
  const archiveRecentEl = document.getElementById('archiveRecentDocs');
  if (archiveRecentEl) {
    const recent = [...profileDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
    if (recent.length === 0) {
      archiveRecentEl.innerHTML = `
        <div class="empty-state" style="padding: 16px; margin: 0;">
          <div class="empty-text">Nessun documento nel Dossier</div>
          <div class="empty-sub">Carica o scansiona referti e prescrizioni per organizzarli per zona del corpo.</div>
        </div>
      `;
    } else {
      archiveRecentEl.innerHTML = recent.map(doc => renderDocCardHTML(doc)).join('');
    }
  }
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
  const recentSection = document.getElementById('archiveRecentDocsSection');
  const activeProfile = getActiveProfileId();

  if (!currentSearch && currentFilterCategory === 'Tutti') {
    searchResultContainer.style.display = 'none';
    if (grid) grid.style.display = 'grid';
    if (recentSection) recentSection.style.display = 'block';
    return;
  }

  searchResultContainer.style.display = 'block';
  if (grid) grid.style.display = 'none';
  if (recentSection) recentSection.style.display = 'none';

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
let currentActiveDocId = null;

function cleanupViewerObjectUrl() {
  if (currentViewerObjectUrl) {
    URL.revokeObjectURL(currentViewerObjectUrl);
    currentViewerObjectUrl = null;
  }
}

// Alias garantito richiesto per apertura visualizzatore
async function openDocumentViewer(id) {
  return await openDocById(id);
}

async function openDocById(id) {
  let doc = null;
  try {
    doc = await pulseDB.getDocument(id);
  } catch (err) {
    console.error('Errore recupero documento da DB:', err);
  }

  if (!doc) {
    showToast('Documento non disponibile in locale. Ricaricalo nel Dossier.', '⚠️');
    return;
  }

  currentActiveDocId = doc.id;
  cleanupViewerObjectUrl();

  const titleHeaderEl = document.getElementById('docViewerTitle');
  if (titleHeaderEl) {
    titleHeaderEl.innerText = doc.title || 'Dettaglio Documento';
  }

  let fileUrl = doc.imageData;
  let isBlobReady = false;

  if (doc.imageData && doc.imageData.startsWith('data:')) {
    try {
      const parts = doc.imageData.split(',');
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || (doc.isPdf ? 'application/pdf' : 'image/jpeg');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      currentViewerObjectUrl = URL.createObjectURL(blob);
      fileUrl = currentViewerObjectUrl;
      isBlobReady = true;
    } catch (e) {
      console.warn('Fallback DataURI per anteprima:', e);
      fileUrl = doc.imageData;
      isBlobReady = false;
    }
  } else if (doc.imageData) {
    isBlobReady = true;
  }

  const zone = getBodyZone(doc.bodyZone);
  const viewerContent = document.getElementById('docViewerContent');
  const dateFormatted = doc.date ? new Date(doc.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non indicata';

  if (!fileUrl) {
    viewerContent.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px;">
        <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
        <div class="empty-text">File non disponibile in locale</div>
        <div class="empty-sub">Il file originale non è stato trovato in IndexedDB. Elimina e ricarica questo documento per ripristinare l'anteprima.</div>
        <button type="button" onclick="deleteDocItem('${doc.id}')" class="btn-secondary-sm" style="color: var(--accent-coral); margin-top: 10px;">
          🗑️ Elimina Documento
        </button>
      </div>
    `;
    openModal('docViewerModalOverlay');
    return;
  }

  viewerContent.innerHTML = `
    <!-- Intestazione Documento -->
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        <div class="squircle-icon-badge" style="background: ${zone.bg}; border: 1px solid ${zone.border}; color: ${zone.color}; width: 44px; height: 44px; min-width: 44px;">
          ${zone.svg}
        </div>
        <div style="min-width: 0;">
          <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; line-height: 1.2;">${escapeHTML(doc.title)}</h3>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="doc-tag tag-${(doc.category || 'referto').toLowerCase()}">${escapeHTML(doc.category || 'Referto')}</span>
            ${doc.isPdf ? '<span style="font-size: 10px; font-weight: 800; background: rgba(0, 122, 255, 0.14); color: var(--accent-blue); padding: 1px 6px; border-radius: 4px;">PDF</span>' : ''}
            ${doc.isDeductible730 ? '<span class="doc-tag" style="background: rgba(255,149,0,0.15); color: var(--accent-amber);">Detraibile 730</span>' : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Dettagli: Data, Importo, NRE -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
      <div style="font-size: 13px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-secondary); padding: 8px 12px; border-radius: var(--radius-sm);">
        <span>📅 Data documento:</span>
        <strong style="color: var(--text-primary);">${dateFormatted}</strong>
      </div>

      ${doc.amount ? `
        <div style="background: var(--bg-card-secondary); padding: 8px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: var(--text-secondary);">Importo Spesa 730:</span>
          <strong style="font-size: 15px; color: var(--accent-amber);">€ ${Number(doc.amount).toFixed(2)}</strong>
        </div>
      ` : ''}

      ${doc.nre ? `
        <div style="background: var(--bg-card-secondary); padding: 10px 12px; border-radius: var(--radius-sm); text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 2px;">CODICE RICETTA NRE:</div>
          <div style="font-family: monospace; font-size: 15px; font-weight: 800; letter-spacing: 1px; color: var(--text-primary); margin-bottom: 6px;">${escapeHTML(doc.nre)}</div>
          <div style="background: #fff; padding: 6px; border-radius: 8px;">
            ${generateCode39SVG(doc.nre, 46, false)}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Blocco Note con Tasto Modifica Rapida -->
    <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-glass); padding: 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">NOTE CLINICHE / PROMEMORIA</span>
        <button type="button" class="btn-secondary-sm" onclick="openEditDocNote('${doc.id}')" style="font-size: 11px; padding: 3px 8px; font-weight: 700; color: var(--accent-blue);">
          ✏️ ${doc.notes ? 'Modifica nota' : '+ Aggiungi nota'}
        </button>
      </div>
      <div style="font-size: 13px; line-height: 1.4; color: ${doc.notes ? 'var(--text-primary)' : 'var(--text-tertiary)'}; font-style: ${doc.notes ? 'normal' : 'italic'};">
        ${doc.notes ? escapeHTML(doc.notes) : 'Nessuna nota personale associata.'}
      </div>
    </div>

    <!-- Anteprima File (Immagine nitida centrata o PDF Viewer incorporato) -->
    <div style="background: #000000; border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 14px; position: relative; border: 1px solid var(--border-glass);">
      ${doc.isPdf ? `
        <div style="width: 100%; height: 50vh; min-height: 280px; max-height: 60vh; background: #2A2A2E; position: relative;">
          <iframe src="${fileUrl}#view=FitH" style="width: 100%; height: 100%; border: none;" title="${escapeHTML(doc.title)}"></iframe>
        </div>
        <div style="width: 100%; background: #1C1C1E; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #AEAEB2;">Visualizzazione PDF</span>
          <button type="button" onclick="openDocFullscreen('${doc.id}')" style="background: linear-gradient(135deg, #0A84FF 0%, #007AFF 100%); color: #FFFFFF; border: none; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            <span>↗</span> Apri a schermo intero
          </button>
        </div>
      ` : `
        <div style="padding: 12px; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 220px; max-height: 70vh; background: #000000; cursor: pointer;" onclick="openDocFullscreen('${doc.id}')" title="Tocca per ingrandire a schermo intero">
          <img src="${fileUrl}" alt="${escapeHTML(doc.title)}" style="max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 10px;" />
        </div>
      `}
    </div>

    <!-- Barra Azioni in Basso: Schermo Intero, Scarica, Elimina -->
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button type="button" onclick="openDocFullscreen('${doc.id}')" class="btn-secondary-sm" style="flex: 1; min-width: 130px; padding: 12px; font-weight: 700; color: var(--accent-blue); display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
        <span>Schermo intero</span>
      </button>

      <button type="button" onclick="downloadDocById('${doc.id}')" class="btn-primary" style="flex: 1; min-width: 130px; padding: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-teal) 100%);">
        <span>⬇️</span> Scarica File
      </button>

      <button type="button" onclick="deleteDocItem('${doc.id}')" class="btn-secondary-sm" style="padding: 12px 16px; font-weight: 700; color: var(--accent-coral); background: rgba(224, 108, 117, 0.12); border-color: rgba(224, 108, 117, 0.25);" title="Elimina definitivamente">
        🗑️
      </button>
    </div>
  `;

  openModal('docViewerModalOverlay');
}

function openActiveDocFullscreen() {
  if (currentActiveDocId) {
    openDocFullscreen(currentActiveDocId);
  }
}

async function openDocFullscreen(id) {
  const doc = await pulseDB.getDocument(id);
  if (!doc) {
    showToast('Documento non disponibile per schermo intero', '⚠️');
    return;
  }
  
  if (doc.isPdf) {
    // PDF: Apri in nuova scheda garantito al 100% su iOS Safari e Desktop
    let pdfUrl = doc.imageData;
    if (doc.imageData && doc.imageData.startsWith('data:')) {
      try {
        const parts = doc.imageData.split(',');
        const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        pdfUrl = URL.createObjectURL(blob);
      } catch (e) {
        pdfUrl = doc.imageData;
      }
    }

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // Immagine: Mostra Lightbox Fullscreen edge-to-edge
    let imgUrl = doc.imageData;
    if (currentViewerObjectUrl) {
      imgUrl = currentViewerObjectUrl;
    }
    const lightbox = document.getElementById('imageLightboxOverlay');
    const lightboxImg = document.getElementById('imageLightboxImg');
    if (lightbox && lightboxImg) {
      lightboxImg.src = imgUrl;
      lightbox.classList.add('active');
      document.body.classList.add('modal-open');
    }
  }
}

function closeImageLightbox() {
  const lightbox = document.getElementById('imageLightboxOverlay');
  if (lightbox) {
    lightbox.classList.remove('active');
  }
  // Se nessun altro modale è attivo rimuovi modal-open, altrimenti lascialo
  const anyActive = document.querySelector('.modal-overlay.active');
  if (!anyActive) {
    document.body.classList.remove('modal-open');
  }
}

async function downloadDocById(id) {
  const doc = await pulseDB.getDocument(id);
  if (!doc) {
    showToast('Documento non trovato', '⚠️');
    return;
  }

  let downloadUrl = doc.imageData;
  let revokeNeeded = false;

  if (doc.imageData && doc.imageData.startsWith('data:')) {
    try {
      const parts = doc.imageData.split(',');
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || (doc.isPdf ? 'application/pdf' : 'image/jpeg');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      downloadUrl = URL.createObjectURL(blob);
      revokeNeeded = true;
    } catch (e) {
      downloadUrl = doc.imageData;
    }
  }

  const ext = doc.isPdf ? '.pdf' : (doc.fileName && doc.fileName.includes('.') ? '.' + doc.fileName.split('.').pop() : '.jpg');
  const safeName = (doc.fileName || doc.title || 'documento').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const finalFilename = safeName.endsWith(ext) ? safeName : (safeName + ext);

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (revokeNeeded) {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
  }
  showToast('Download avviato!', '⬇️');
}

async function openEditDocNote(docId) {
  const doc = await pulseDB.getDocument(docId);
  if (!doc) return;

  document.getElementById('editDocNoteId').value = doc.id;
  document.getElementById('editDocNoteDocTitle').innerText = doc.title;
  document.getElementById('editDocNoteInput').value = doc.notes || '';

  openModal('editDocNoteModalOverlay');
  setTimeout(() => {
    const input = document.getElementById('editDocNoteInput');
    if (input) input.focus();
  }, 150);
}

async function handleSaveDocNote(e) {
  e.preventDefault();
  const docId = document.getElementById('editDocNoteId').value;
  const newNote = document.getElementById('editDocNoteInput').value.trim();

  const doc = await pulseDB.getDocument(docId);
  if (!doc) return;

  doc.notes = newNote;
  await pulseDB.saveDocument(doc);
  closeModal('editDocNoteModalOverlay');
  showToast('Nota salvata con successo!', '📝');

  // Aggiorna viste
  await renderAllViews();

  // Se il visualizzatore era aperto su questo documento, aggiornalo
  const viewerOverlay = document.getElementById('docViewerModalOverlay');
  if (viewerOverlay && viewerOverlay.classList.contains('active')) {
    await openDocById(docId);
  }

  // Se la cartella aperta conteneva questo documento, ricarica la cartella
  const folderOverlay = document.getElementById('folderModalOverlay');
  if (folderOverlay && folderOverlay.classList.contains('active') && doc.bodyZone) {
    await openZoneFolder(doc.bodyZone);
  }
}

async function deleteDocItem(id) {
  if (confirm('Sei sicuro di voler eliminare definitivamente questo documento?')) {
    const doc = await pulseDB.getDocument(id);
    const bodyZone = doc ? doc.bodyZone : null;

    await pulseDB.deleteDocument(id);
    closeModal('docViewerModalOverlay');
    showToast('Documento eliminato definitivamente', '🗑️');

    await renderAllViews();

    // Se la cartella è aperta, ricaricala immediatamente
    const folderOverlay = document.getElementById('folderModalOverlay');
    if (folderOverlay && folderOverlay.classList.contains('active') && bodyZone) {
      await openZoneFolder(bodyZone);
    }
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
        isPdf: isPdf,
        fileName: file.name,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg')
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

    let finalImg = rawUploadedImage ? (rawUploadedImage.isPdf ? rawUploadedImage.dataUrl : previewImg.src) : generateDemoPlaceholder(title || 'REFERTO CLINICO', notes || 'Documento registrato su Pulse');

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
      fileName: rawUploadedImage ? rawUploadedImage.fileName : (title || 'documento') + '.jpg',
      mimeType: rawUploadedImage ? rawUploadedImage.mimeType : (rawUploadedImage && rawUploadedImage.isPdf ? 'application/pdf' : 'image/jpeg'),
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

let calQuickItemType = 'Promemoria';

function setCalQuickType(type) {
  calQuickItemType = type;
  document.querySelectorAll('.cal-quick-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

function addQuickCalendarItem() {
  const titleInput = document.getElementById('calQuickItemTitle');
  const timeInput = document.getElementById('calQuickItemTime');
  const title = (titleInput && titleInput.value.trim()) || '';
  if (!title) {
    showToast('Inserisci un titolo o nota per il giorno', '⚠️');
    return;
  }

  const timeVal = (timeInput && timeInput.value) || '';
  const dateStr = calSelectedDate.toISOString().split('T')[0];
  const activeProfile = getActiveProfileId();

  if (calQuickItemType === 'Visita') {
    // Salva come appuntamento
    const dtStr = timeVal ? `${dateStr}T${timeVal}` : `${dateStr}T09:30`;
    const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
    allAppts.push({
      id: 'appt_' + Date.now(),
      profileId: activeProfile,
      title: title,
      datetime: dtStr,
      location: '',
      notes: 'Creata da calendario rapido',
      checklist: []
    });
    localStorage.setItem('pulse_appointments', JSON.stringify(allAppts));
    renderAppointments();
    renderAgendaVisits();
  } else {
    // Salva come nota / promemoria calendario
    let notes = JSON.parse(localStorage.getItem('pulse_calendar_notes') || '[]');
    notes.push({
      id: 'calnote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      profileId: activeProfile,
      date: dateStr,
      time: timeVal,
      type: calQuickItemType, // 'Promemoria' | 'Nota'
      title: title,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('pulse_calendar_notes', JSON.stringify(notes));
  }

  if (titleInput) titleInput.value = '';
  if (timeInput) timeInput.value = '';

  showToast(`${calQuickItemType} aggiunto al giorno!`, '🗓️');
  renderCalendar();
  renderSelectedDayAppointments();
  renderHome();
}

function deleteCalendarNote(id) {
  let notes = JSON.parse(localStorage.getItem('pulse_calendar_notes') || '[]');
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem('pulse_calendar_notes', JSON.stringify(notes));
  showToast('Elemento rimosso', '🗑️');
  renderCalendar();
  renderSelectedDayAppointments();
}

function renderCalendar() {
  const monthTitle = document.getElementById('calMonthTitle');
  const grid = document.getElementById('calDaysGrid');
  if (!grid || !monthTitle) return;
  const activeProfile = getActiveProfileId();

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  monthTitle.innerText = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const profileAppts = allAppts.filter(a => !a.profileId || a.profileId === activeProfile);

  const calNotes = JSON.parse(localStorage.getItem('pulse_calendar_notes') || '[]');
  const profileCalNotes = calNotes.filter(n => !n.profileId || n.profileId === activeProfile);

  const dotsByDate = {}; // { 'YYYY-MM-DD': ['visita', 'promemoria', 'nota'] }
  profileAppts.forEach(a => {
    const dStr = a.datetime.split('T')[0];
    if (!dotsByDate[dStr]) dotsByDate[dStr] = [];
    dotsByDate[dStr].push('visita');
  });

  profileCalNotes.forEach(n => {
    const dStr = n.date;
    if (!dotsByDate[dStr]) dotsByDate[dStr] = [];
    dotsByDate[dStr].push(n.type ? n.type.toLowerCase() : 'nota');
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
    const dotTypes = dotsByDate[fullDateStr] || [];

    let dotsHtml = '';
    if (dotTypes.length > 0) {
      dotsHtml = `<div class="cal-dots-wrap">` +
        dotTypes.slice(0, 3).map(type => `<span class="cal-dot ${type}"></span>`).join('') +
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
  if (!container || !bannerTitle) return;
  const activeProfile = getActiveProfileId();

  const dateStr = calSelectedDate.toISOString().split('T')[0];
  const dateFormatted = calSelectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  bannerTitle.innerText = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const dayAppts = allAppts.filter(a => (!a.profileId || a.profileId === activeProfile) && a.datetime.startsWith(dateStr));

  const calNotes = JSON.parse(localStorage.getItem('pulse_calendar_notes') || '[]');
  const dayNotes = calNotes.filter(n => (!n.profileId || n.profileId === activeProfile) && n.date === dateStr);

  if (dayAppts.length === 0 && dayNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 18px 12px;">
        <div class="empty-text">Nessun impegno o appunto in questa data</div>
        <div class="empty-sub">Usa il modulo sopra per aggiungere un promemoria, una nota o una visita.</div>
      </div>
    `;
  } else {
    let itemsHTML = '';

    // Render Note e Promemoria del Giorno
    if (dayNotes.length > 0) {
      itemsHTML += dayNotes.map(n => {
        const isReminder = n.type === 'Promemoria';
        const badgeColor = isReminder ? 'var(--accent-amber)' : 'var(--accent-blue)';
        const badgeBg = isReminder ? 'rgba(229, 169, 92, 0.15)' : 'rgba(100, 168, 240, 0.15)';
        return `
          <div class="glass-card" style="margin-bottom: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--border-glass);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 99px; background: ${badgeBg}; color: ${badgeColor};">
                ${escapeHTML(n.type || 'Nota')}
              </span>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHTML(n.title)}</div>
                ${n.time ? `<div style="font-size: 11px; color: var(--text-secondary);">⏰ Ore ${escapeHTML(n.time)}</div>` : ''}
              </div>
            </div>
            <button class="btn-secondary-sm" style="padding: 3px 8px; font-size: 11px; color: var(--accent-coral);" onclick="deleteCalendarNote('${n.id}')">
              ✕
            </button>
          </div>
        `;
      }).join('');
    }

    // Render Visite del Giorno
    if (dayAppts.length > 0) {
      itemsHTML += dayAppts.map(a => renderInteractiveApptCard(a)).join('');
    }

    container.innerHTML = itemsHTML;
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

      <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px; align-items: center;">
        <button class="btn-secondary-sm" onclick="exportSingleICS('${a.id}')" title="Aggiungi Promemoria a Calendario iPhone (.ics)" style="display: inline-flex; align-items: center; gap: 4px;">
          <span>🔔</span>
          <span>Salva .ics</span>
        </button>
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
    renderAgendaVisits();
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
    renderAgendaVisits();
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
    renderAgendaVisits();
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
    renderAgendaVisits();
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

  document.getElementById('pharmacyName').innerText = profile.name || 'Il tuo nome';
  document.getElementById('pharmacyCf').innerText = profile.cf || 'Non impostato';

  const barcodeContainer = document.getElementById('pharmacyBarcodeWrap');
  if (profile.cf) {
    barcodeContainer.innerHTML = generateCode39SVG(profile.cf, 60, true);
  } else {
    barcodeContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 12px; padding: 12px 6px;">Imposta il tuo Codice Fiscale nel Profilo per generare il codice a barre della Tessera Sanitaria</div>';
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
          <button style="background: #1C1C1E; color: #FFFFFF; border: none; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.18);" onclick="markRecipeUsed('${r.id}')">
            <span>✓</span> Scansionata · Rimuovi
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
    await renderBentoWidgets();
    if (document.getElementById('recipesModalOverlay').classList.contains('active')) {
      await renderRecipesModalContent();
    }
  }
}

// 11. Potenziamento Cassetto 730
let taxSelectedYear = new Date().getFullYear();

function initTax730() {
  const banner = document.getElementById('homeTax730Banner');
  if (banner) banner.addEventListener('click', openTax730Modal);

  const profileLink = document.getElementById('profileTax730Link');
  if (profileLink) profileLink.addEventListener('click', handleTax730CardClick);

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

function isTax730Active() {
  return new Date() >= new Date('2027-01-01T00:00:00');
}

function handleTax730CardClick() {
  if (!isTax730Active()) {
    showToast('Cassetto 730 attivo dal 1° Gennaio 2027', '🔒');
    return;
  }
  openTax730Modal();
}

async function renderTax730Dashboard() {
  const isUnlocked = isTax730Active();
  const card = document.getElementById('profileTax730Link');
  const lockIcon = document.getElementById('tax730LockIcon');
  const subtitle = document.getElementById('tax730Subtitle');
  const badgeWrap = document.getElementById('tax730BadgeWrap');
  const activeContent = document.getElementById('tax730ActiveContent');
  const lockedContent = document.getElementById('tax730LockedContent');
  const iconBadge = document.getElementById('tax730IconBadge');

  if (card) {
    if (!isUnlocked) {
      card.classList.add('tax-locked');
      if (lockIcon) lockIcon.style.display = 'inline';
      if (subtitle) subtitle.innerText = 'Attivo dal 1° Gennaio 2027 con il nuovo anno fiscale';
      if (badgeWrap) {
        badgeWrap.style.background = 'rgba(142, 142, 147, 0.16)';
        badgeWrap.style.color = 'var(--text-secondary)';
        badgeWrap.innerText = 'Attivo dal 01/01/2027';
      }
      if (activeContent) activeContent.style.display = 'none';
      if (lockedContent) lockedContent.style.display = 'block';
      if (iconBadge) {
        iconBadge.style.opacity = '0.6';
      }
      return;
    } else {
      card.classList.remove('tax-locked');
      if (lockIcon) lockIcon.style.display = 'none';
      if (subtitle) subtitle.innerText = 'Dossier spese, franchigia e rimborso 19%';
      if (activeContent) activeContent.style.display = 'flex';
      if (lockedContent) lockedContent.style.display = 'none';
    }
  }

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
  if (!isTax730Active()) {
    showToast('Cassetto 730 attivo dal 1° Gennaio 2027', '🔒');
    return;
  }
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
  openRecipesModal();
}

async function openRecipesModal() {
  await renderRecipesModalContent();
  openModal('recipesModalOverlay');
}

async function renderRecipesModalContent() {
  const activeProfile = getActiveProfileId();
  const allDocs = await pulseDB.getAllDocuments();
  const profileDocs = allDocs.filter(d => (!d.profileId || d.profileId === activeProfile) && (d.category === 'Ricetta' || d.nre));

  const activeRecipes = profileDocs.filter(d => !d.isUsedRx);
  const usedRecipes = profileDocs.filter(d => d.isUsedRx);

  const activeContainer = document.getElementById('activeRecipesList');
  const usedContainer = document.getElementById('usedRecipesList');

  if (activeContainer) {
    if (activeRecipes.length === 0) {
      activeContainer.innerHTML = `
        <div class="empty-state" style="padding: 18px 12px;">
          <div class="empty-text">Nessuna ricetta attiva da ritirare</div>
          <div class="empty-sub">Compila il modulo in alto per aggiungere subito una ricetta o prescrizione.</div>
        </div>
      `;
    } else {
      activeContainer.innerHTML = activeRecipes.map(r => `
        <div class="glass-card" style="margin-bottom: 10px; padding: 12px 14px; border: 1px solid var(--border-glass);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">${escapeHTML(r.title)}</div>
              ${r.nre ? `<div style="font-family: monospace; font-size: 13px; font-weight: 800; color: var(--accent-green); margin-top: 3px;">NRE: ${escapeHTML(r.nre)}</div>` : ''}
              ${r.notes ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${escapeHTML(r.notes)}</div>` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
              <button class="btn-secondary-sm" style="font-size: 11px; padding: 4px 10px; background: rgba(52, 199, 89, 0.15); color: var(--accent-green); border-color: rgba(52, 199, 89, 0.3);" onclick="markRecipeUsed('${r.id}')">
                ✓ Segna ritirata
              </button>
              <button class="btn-secondary-sm" style="font-size: 10px; padding: 2px 6px; color: var(--accent-coral);" onclick="deleteRecipeDoc('${r.id}')">
                Elimina
              </button>
            </div>
          </div>
          ${r.dataUrl ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
              <button class="btn-secondary-sm" style="font-size: 11px; padding: 3px 8px;" onclick="openDocById('${r.id}')">
                📄 Visualizza Allegato
              </button>
            </div>
          ` : ''}
        </div>
      `).join('');
    }
  }

  if (usedContainer) {
    if (usedRecipes.length === 0) {
      usedContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">Nessuna ricetta archiviata.</div>`;
    } else {
      usedContainer.innerHTML = usedRecipes.map(r => `
        <div class="glass-card" style="margin-bottom: 8px; padding: 10px 14px; opacity: 0.75; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; font-weight: 700; text-decoration: line-through;">${escapeHTML(r.title)}</div>
            ${r.nre ? `<div style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">NRE: ${escapeHTML(r.nre)}</div>` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-secondary-sm" style="font-size: 10px; padding: 3px 8px;" onclick="restoreRecipeToActive('${r.id}')">
              Ripristina
            </button>
            <button class="btn-secondary-sm" style="font-size: 10px; padding: 3px 8px; color: var(--accent-coral);" onclick="deleteRecipeDoc('${r.id}')">
              Elimina
            </button>
          </div>
        </div>
      `).join('');
    }
  }
}

async function handleSaveRecipe(e) {
  e.preventDefault();
  const titleInput = document.getElementById('recipeTitleInput');
  const nreInput = document.getElementById('recipeNreInput');
  const notesInput = document.getElementById('recipeNotesInput');
  const fileInput = document.getElementById('recipeFileInput');

  const title = (titleInput && titleInput.value.trim()) || '';
  if (!title) return;

  const nre = (nreInput && nreInput.value.trim().toUpperCase()) || '';
  const notes = (notesInput && notesInput.value.trim()) || '';
  const activeProfile = getActiveProfileId();

  let dataUrl = null;
  let fileType = null;
  let fileName = null;

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    fileName = file.name;
    fileType = file.type;
    dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    });
  }

  const newDoc = {
    id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    profileId: activeProfile,
    title: title,
    category: 'Ricetta',
    bodyZone: 'pharma',
    date: new Date().toISOString().split('T')[0],
    nre: nre,
    notes: notes,
    dataUrl: dataUrl,
    fileType: fileType,
    fileName: fileName,
    isUsedRx: false,
    createdAt: Date.now()
  };

  await pulseDB.saveDocument(newDoc);

  // Reset form
  if (titleInput) titleInput.value = '';
  if (nreInput) nreInput.value = '';
  if (notesInput) notesInput.value = '';
  if (fileInput) fileInput.value = '';

  showToast('Ricetta salvata con successo!', '📋');
  await renderRecipesModalContent();
  await renderBentoWidgets();
  await renderArchiveGrid();
}

async function restoreRecipeToActive(docId) {
  const doc = await pulseDB.getDocument(docId);
  if (doc) {
    doc.isUsedRx = false;
    await pulseDB.saveDocument(doc);
    showToast('Ricetta ripristinata tra le attive', '🔄');
    await renderRecipesModalContent();
    await renderBentoWidgets();
  }
}

async function deleteRecipeDoc(docId) {
  if (confirm('Eliminare definitivamente questa ricetta?')) {
    await pulseDB.deleteDocument(docId);
    showToast('Ricetta eliminata', '🗑️');
    await renderRecipesModalContent();
    await renderBentoWidgets();
    await renderArchiveGrid();
  }
}

let currentCabinetFilter = 'all';

async function openCabinetView() {
  openModal('dedicatedCabinetModalOverlay');
  renderDedicatedCabinet();
}

function switchCabinetFilter(filter) {
  currentCabinetFilter = filter;
  ['cabFilterAll', 'cabFilterExpiring', 'cabFilterExpired'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });

  if (filter === 'all') {
    const btn = document.getElementById('cabFilterAll');
    if (btn) btn.classList.add('active');
  } else if (filter === 'expiring') {
    const btn = document.getElementById('cabFilterExpiring');
    if (btn) btn.classList.add('active');
  } else if (filter === 'expired') {
    const btn = document.getElementById('cabFilterExpired');
    if (btn) btn.classList.add('active');
  }

  renderDedicatedCabinet();
}

function handleDedicatedCabinetAdd(e) {
  e.preventDefault();
  const nameInput = document.getElementById('dedicatedCabName');
  const catInput = document.getElementById('dedicatedCabCategory');
  const expiryInput = document.getElementById('dedicatedCabExpiry');
  const boxesInput = document.getElementById('dedicatedCabBoxes');
  const pillsInput = document.getElementById('dedicatedCabPills');
  const reminderToggle = document.getElementById('dedicatedCabReminderToggle');

  const name = nameInput.value.trim();
  const category = (catInput && catInput.value) || 'Generale';
  const expiry = expiryInput.value;
  const boxes = parseInt(boxesInput ? boxesInput.value : '1', 10) || 1;
  const pills = parseInt(pillsInput ? pillsInput.value : '0', 10) || 0;
  const wantReminder = reminderToggle ? reminderToggle.checked : true;

  if (!name || !expiry) {
    alert('Inserisci il nome del farmaco e la data di scadenza.');
    return;
  }

  // Costruisci stringa descrittiva quantità (es. "1 scatola · 16 compresse")
  let qtyParts = [];
  if (boxes > 0) {
    qtyParts.push(`${boxes} ${boxes === 1 ? 'scatola' : 'scatole'}`);
  }
  if (pills > 0) {
    qtyParts.push(`${pills} ${pills === 1 ? 'compressa' : 'compresse'}`);
  }
  const qtyStr = qtyParts.length > 0 ? qtyParts.join(' · ') : '1 confezione';

  const newItem = {
    id: 'cab_' + Date.now(),
    profileId: getActiveProfileId(),
    name: name,
    category: category,
    expiryDate: expiry,
    boxes: boxes,
    pills: pills,
    quantity: qtyStr,
    hasReminder: wantReminder,
    notes: ''
  };

  const cabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  cabinet.push(newItem);
  localStorage.setItem('pulse_cabinet', JSON.stringify(cabinet));

  // Reset form
  nameInput.value = '';
  if (catInput) catInput.value = 'Generale';
  expiryInput.value = '';
  if (boxesInput) boxesInput.value = '1';
  if (pillsInput) pillsInput.value = '';

  showToast('Farmaco aggiunto all\'armadietto', '💊');

  // Se toggle promemoria attivo, genera subito .ics
  if (wantReminder) {
    exportCabinetItemICS(newItem.id, false);
  }

  renderDedicatedCabinet();
  renderMedicineCabinetInFolder();
  renderBentoWidgets();
  checkLocalRemindersAndAlerts();
}

function renderDedicatedCabinet() {
  const container = document.getElementById('dedicatedCabinetList');
  const subtitleEl = document.getElementById('dedicatedCabinetSubtitle');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const allCabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const profileCabinet = allCabinet.filter(c => !c.profileId || c.profileId === activeProfile);

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const in60Days = new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0];

  // Ordina per scadenza più vicina
  profileCabinet.sort((a, b) => (a.expiryDate || '9999-99-99').localeCompare(b.expiryDate || '9999-99-99'));

  let expiredCount = 0;
  let expiringCount = 0;
  profileCabinet.forEach(item => {
    if (item.expiryDate) {
      if (item.expiryDate < todayIso) {
        expiredCount++;
      } else if (item.expiryDate <= in60Days) {
        expiringCount++;
      }
    }
  });

  if (subtitleEl) {
    subtitleEl.innerText = `${profileCabinet.length} ${profileCabinet.length === 1 ? 'farmaco' : 'farmaci'} · ${expiringCount + expiredCount} avvisi scadenza`;
  }

  // Filtra
  let displayList = profileCabinet;
  if (currentCabinetFilter === 'expiring') {
    displayList = profileCabinet.filter(item => item.expiryDate && item.expiryDate >= todayIso && item.expiryDate <= in60Days);
  } else if (currentCabinetFilter === 'expired') {
    displayList = profileCabinet.filter(item => item.expiryDate && item.expiryDate < todayIso);
  }

  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px; margin: 0;">
        <div class="empty-text">Nessun farmaco in questo elenco</div>
        <div class="empty-sub">Aggiungi i tuoi medicinali usando il form in alto per monitorare scorte e scadenze.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = displayList.map(item => {
    let statusClass = 'status-ok';
    let statusText = 'Scadenza regolare';
    let statusColor = 'var(--accent-teal)';
    let statusBg = 'rgba(0, 199, 190, 0.12)';
    let borderStyle = '1px solid var(--border-glass)';

    if (item.expiryDate) {
      if (item.expiryDate < todayIso) {
        statusClass = 'status-expired';
        statusText = 'SCADUTO';
        statusColor = 'var(--accent-coral)';
        statusBg = 'rgba(224, 108, 117, 0.18)';
        borderStyle = '1px solid rgba(224, 108, 117, 0.45)';
      } else if (item.expiryDate <= in60Days) {
        statusClass = 'status-expiring';
        statusText = 'In scadenza';
        statusColor = 'var(--accent-amber)';
        statusBg = 'rgba(255, 149, 0, 0.16)';
        borderStyle = '1px solid rgba(255, 149, 0, 0.4)';
      }
    }

    const catBadge = item.category || 'Generale';
    const isExhausted = (item.quantity && (item.quantity.includes('0 ') || item.quantity === '0' || item.quantity.includes('esaurit')));

    return `
      <div class="glass-card" style="padding: 12px 14px; border: ${borderStyle};">
        <!-- Riga Superiore: Nome + Badge Categoria a Sinistra, Semaforo Scadenza a Destra -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 15px; font-weight: 800; color: var(--text-primary);">${escapeHTML(item.name)}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: rgba(0, 122, 255, 0.10); color: var(--accent-blue); border: 1px solid rgba(0, 122, 255, 0.2);">
                ${escapeHTML(catBadge)}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">
              Scadenza: <strong>${item.expiryDate || 'Non indicata'}</strong>
            </div>
          </div>
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; color: ${statusColor}; background: ${statusBg}; flex: none;">
            ● ${statusText}
          </span>
        </div>

        <!-- Riga Inferiore: Scatole e Compresse/Pillole con controlli rapidi -/+, Campanella .ics e Cestino -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle); gap: 6px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="updateCabinetQtyDelta('${item.id}', -1)" class="btn-secondary-sm" style="width: 26px; height: 26px; min-width: 26px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;" title="Riduci quantità">-</button>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-align: center;">
              ${escapeHTML(item.quantity || '1 cnf')}
            </span>
            <button onclick="updateCabinetQtyDelta('${item.id}', 1)" class="btn-secondary-sm" style="width: 26px; height: 26px; min-width: 26px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;" title="Aumenta quantità">+</button>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            ${isExhausted ? `
              <button onclick="addItemToShoppingList('${escapeHTML(item.name).replace(/'/g, "\\'")}')" class="btn-secondary-sm" style="color: var(--accent-teal); font-size: 11px; padding: 4px 8px; border-color: rgba(0, 199, 190, 0.35); background: rgba(0, 199, 190, 0.10); font-weight: 700;" title="Aggiungi alla lista della spesa in farmacia">
                🛒 In Lista
              </button>
            ` : ''}
            <button onclick="exportCabinetItemICS('${item.id}', true)" class="btn-secondary-sm" title="Aggiungi Promemoria Scadenza a Calendario iPhone (.ics)" style="padding: 5px 9px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; color: var(--accent-amber);">
              <span>🔔</span>
              <span>.ics</span>
            </button>
            <button onclick="deleteCabinetItem('${item.id}')" class="btn-secondary-sm" style="padding: 5px 8px; font-size: 11px; color: var(--accent-coral);" title="Elimina farmaco">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function exportCabinetItemICS(itemId, showFeedback = true) {
  const allCabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const item = allCabinet.find(c => c.id === itemId);
  if (!item || !item.expiryDate) {
    if (showFeedback) showToast('Nessuna data di scadenza impostata', '⚠️');
    return;
  }

  const expDate = new Date(item.expiryDate);
  expDate.setHours(9, 0, 0, 0); // ore 09:00
  const endDate = new Date(expDate.getTime() + 30 * 60 * 1000); // 30 min
  const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulse Health App//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:cab_${item.id}@pulse.health.local`, `DTSTAMP:${formatICSDate(new Date())}`, `DTSTART:${formatICSDate(expDate)}`, `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:Scadenza Farmaco: ${item.name}`,
    `DESCRIPTION:Il medicinale ${item.name} (${item.quantity || 'in armadietto'}) scade il ${item.expiryDate}. Controlla o rinnova la confezione con Pulse.`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-P30D', 'ACTION:DISPLAY', 'DESCRIPTION:Promemoria: Farmaco in Scadenza tra 30 giorni (Pulse)', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Promemoria Urgente: Farmaco in Scadenza tra 7 giorni (Pulse)', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Scadenza_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  if (showFeedback) {
    showToast('Promemoria scadenza .ics generato (allarme 30gg prima)!', '🔔');
  }
}

function openCalendarQuickSheet() {
  openModal('quickCalendarModalOverlay');
  renderCalendar();
}

// ----------------------------------------------------
// 12. GESTIONE LISTA FARMACI DA COMPRARE (Shopping List Farmacia)
// ----------------------------------------------------
function openShoppingListModal() {
  renderShoppingList();
  openModal('shoppingListModalOverlay');
  setTimeout(() => {
    const input = document.getElementById('shoppingItemInput');
    if (input) input.focus();
  }, 150);
}

function renderShoppingList() {
  const container = document.getElementById('shoppingItemsList');
  const countEl = document.getElementById('shoppingItemsCount');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const allItems = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]');
  const profileItems = allItems.filter(i => !i.profileId || i.profileId === activeProfile);

  const pending = profileItems.filter(i => !i.checked);
  const checked = profileItems.filter(i => i.checked);

  if (countEl) {
    countEl.innerText = `${profileItems.length} ${profileItems.length === 1 ? 'prodotto' : 'prodotti'} (${pending.length} da comprare)`;
  }

  if (profileItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 12px; margin: 0;">
        <div class="empty-icon" style="font-size: 28px; margin-bottom: 6px;">🛒</div>
        <div class="empty-text">Lista della spesa vuota</div>
        <div class="empty-sub">Aggiungi i farmaci e parafarmaci da acquistare alla prossima visita in farmacia.</div>
      </div>
    `;
    return;
  }

  // Mostra prima quelli da comprare, poi quelli spuntati che scivolano in fondo
  const sorted = [...pending, ...checked];

  container.innerHTML = sorted.map(item => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 12px; background: ${item.checked ? 'var(--bg-card-secondary)' : 'var(--bg-glass-card)'}; border: 1px solid var(--border-glass); transition: all 0.25s ease; gap: 8px;">
      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; min-width: 0; margin: 0;">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleShoppingItem('${item.id}')" style="width: 24px; height: 24px; min-width: 24px; accent-color: var(--accent-teal); cursor: pointer; flex-shrink: 0; border-radius: 50%;">
        <span style="font-size: 15px; font-weight: ${item.checked ? '500' : '700'}; color: var(--text-primary); text-decoration: ${item.checked ? 'line-through' : 'none'}; opacity: ${item.checked ? '0.55' : '1'}; word-break: break-word; line-height: 1.3; transition: all 0.2s ease;">
          ${escapeHTML(item.text)}
        </span>
      </label>
      <button type="button" onclick="deleteShoppingItem('${item.id}')" class="btn-secondary-sm" style="width: 36px; height: 36px; min-width: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--accent-coral); background: rgba(224, 108, 117, 0.10); border-color: rgba(224, 108, 117, 0.20); border-radius: 10px; flex-shrink: 0;" title="Elimina prodotto">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function handleShoppingItemAdd(e) {
  e.preventDefault();
  const input = document.getElementById('shoppingItemInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const activeProfile = getActiveProfileId();
  const allItems = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]');

  const newItem = {
    id: 'shop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    profileId: activeProfile,
    text: text,
    checked: false,
    createdAt: new Date().toISOString()
  };

  allItems.unshift(newItem);
  localStorage.setItem('pulse_shopping_list', JSON.stringify(allItems));

  input.value = '';
  renderShoppingList();
  renderBentoWidgets();
  showToast('Aggiunto alla lista farmaci!', '🛍️');
}

function toggleShoppingItem(itemId) {
  const allItems = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]');
  const item = allItems.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    localStorage.setItem('pulse_shopping_list', JSON.stringify(allItems));
    renderShoppingList();
    renderBentoWidgets();
  }
}

function deleteShoppingItem(itemId) {
  let allItems = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]');
  allItems = allItems.filter(i => i.id !== itemId);
  localStorage.setItem('pulse_shopping_list', JSON.stringify(allItems));
  renderShoppingList();
  renderBentoWidgets();
}

function clearCheckedShoppingItems() {
  const activeProfile = getActiveProfileId();
  let allItems = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]');
  const countBefore = allItems.length;
  allItems = allItems.filter(i => (i.profileId && i.profileId !== activeProfile) || !i.checked);
  
  if (allItems.length === countBefore) {
    showToast('Nessun farmaco spuntato da rimuovere', 'ℹ️');
    return;
  }

  localStorage.setItem('pulse_shopping_list', JSON.stringify(allItems));
  renderShoppingList();
  renderBentoWidgets();
  showToast('Farmaci acquistati rimossi!', '✓');
}

function addItemToShoppingList(productName) {
  if (!productName) return;
  const activeProfile = getActiveProfileId();
  const allItems = JSON.parse(localStorage.getItem('pulse_shopping_list') || '[]');

  // Controlla se è già in lista e non spuntato
  const existing = allItems.find(i => (!i.profileId || i.profileId === activeProfile) && i.text.toLowerCase() === productName.toLowerCase() && !i.checked);
  if (existing) {
    showToast(`"${productName}" è già presente nella lista spesa!`, '🛒');
    openShoppingListModal();
    return;
  }

  const newItem = {
    id: 'shop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    profileId: activeProfile,
    text: productName,
    checked: false,
    createdAt: new Date().toISOString()
  };

  allItems.unshift(newItem);
  localStorage.setItem('pulse_shopping_list', JSON.stringify(allItems));

  renderBentoWidgets();
  showToast(`"${productName}" aggiunto alla Lista Farmaci!`, '🛒');
  openShoppingListModal();
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
  renderDedicatedCabinet();
  renderMedicineCabinetInFolder();
  renderBentoWidgets();
  checkLocalRemindersAndAlerts();
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
  renderDedicatedCabinet();
  renderMedicineCabinetInFolder();
  renderBentoWidgets();
  checkLocalRemindersAndAlerts();
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

// 16. Agenda SubTabs (Visite | Diario)
function switchAgendaSubTab(subTab) {
  const btnVisits = document.getElementById('segAgendaVisits');
  const btnNotes = document.getElementById('segAgendaNotes');
  const visitsView = document.getElementById('agendaVisitsView');
  const notesView = document.getElementById('agendaNotesView');

  if (btnVisits) btnVisits.classList.remove('active');
  if (btnNotes) btnNotes.classList.remove('active');

  if (visitsView) visitsView.style.display = 'none';
  if (notesView) notesView.style.display = 'none';

  if (subTab === 'notes') {
    if (btnNotes) btnNotes.classList.add('active');
    if (notesView) notesView.style.display = 'block';
    renderHealthNotes();
  } else {
    // Default: 'visits'
    if (btnVisits) btnVisits.classList.add('active');
    if (visitsView) visitsView.style.display = 'block';
    renderAgendaVisits();
  }
}

let pastVisitsExpanded = false;
function togglePastVisits() {
  pastVisitsExpanded = !pastVisitsExpanded;
  const list = document.getElementById('agendaPastVisitsList');
  const arrow = document.getElementById('pastVisitsArrow');
  if (list) list.style.display = pastVisitsExpanded ? 'block' : 'none';
  if (arrow) arrow.innerText = pastVisitsExpanded ? '▴' : '▾';
}

function toggleVisitCardDetails(cardId) {
  const el = document.getElementById(cardId);
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
  const arrow = document.getElementById(`arrow_${cardId}`);
  if (arrow) arrow.innerText = isHidden ? '▴' : '▾';
}

function renderAgendaVisits() {
  const timelineContainer = document.getElementById('agendaVisitsTimelineList');
  const pastContainer = document.getElementById('agendaPastVisitsList');
  if (!timelineContainer) return;

  const activeProfile = getActiveProfileId();
  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const profileAppts = allAppts.filter(a => !a.profileId || a.profileId === activeProfile);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const upcoming = [];
  const past = [];

  profileAppts.forEach(a => {
    const apptDate = new Date(a.datetime);
    if (apptDate < now && a.datetime.split('T')[0] !== todayStr) {
      past.push(a);
    } else {
      upcoming.push(a);
    }
  });

  upcoming.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  past.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  if (upcoming.length === 0) {
    timelineContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px;">
        <div class="empty-text">Nessun appuntamento futuro</div>
        <div class="empty-sub">Pianifica le tue prossime visite mediche per ricevere promemoria.</div>
        <button class="btn-primary" style="margin: 12px auto 0; width: auto; padding: 8px 18px;" onclick="openNewApptModal()">
          + Aggiungi Visita
        </button>
      </div>
    `;
  } else {
    const thisWeek = [];
    const thisMonth = [];
    const later = [];

    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    const monthFromNow = new Date(now.getTime() + 30 * 86400000);

    upcoming.forEach(a => {
      const dt = new Date(a.datetime);
      if (dt <= weekFromNow) {
        thisWeek.push(a);
      } else if (dt <= monthFromNow) {
        thisMonth.push(a);
      } else {
        later.push(a);
      }
    });

    let html = '';
    if (thisWeek.length > 0) {
      html += `<div class="timeline-section-title"><span>⚡</span> Questa settimana (${thisWeek.length})</div>`;
      html += thisWeek.map(a => renderAgendaVisitCardHTML(a, 'urgent')).join('');
    }
    if (thisMonth.length > 0) {
      html += `<div class="timeline-section-title" style="margin-top: 20px;"><span>🗓️</span> Questo mese (${thisMonth.length})</div>`;
      html += thisMonth.map(a => renderAgendaVisitCardHTML(a, 'soon')).join('');
    }
    if (later.length > 0) {
      html += `<div class="timeline-section-title" style="margin-top: 20px;"><span>⏳</span> Più avanti (${later.length})</div>`;
      html += later.map(a => renderAgendaVisitCardHTML(a, 'later')).join('');
    }

    timelineContainer.innerHTML = html;
  }

  if (pastContainer) {
    if (past.length === 0) {
      pastContainer.innerHTML = `<div style="font-size: 13px; color: var(--text-secondary); text-align: center; padding: 12px;">Nessuna visita passata archiviata.</div>`;
    } else {
      pastContainer.innerHTML = past.map(a => renderAgendaVisitCardHTML(a, 'past')).join('');
    }
  }
}

function renderAgendaVisitCardHTML(a, timeBadgeType) {
  const dt = new Date(a.datetime);
  const now = new Date();
  const diffDays = Math.ceil((dt - now) / 86400000);

  let badgeLabel = '';
  let badgeClass = 'timeline-badge later';
  if (timeBadgeType === 'past') {
    badgeLabel = 'Conclusa';
    badgeClass = 'timeline-badge later';
  } else if (diffDays <= 0) {
    badgeLabel = 'Oggi';
    badgeClass = 'timeline-badge urgent';
  } else if (diffDays === 1) {
    badgeLabel = 'Domani';
    badgeClass = 'timeline-badge urgent';
  } else if (diffDays <= 7) {
    badgeLabel = `Tra ${diffDays} gg`;
    badgeClass = 'timeline-badge urgent';
  } else if (diffDays <= 30) {
    badgeLabel = `Tra ${Math.round(diffDays / 7)} sett`;
    badgeClass = 'timeline-badge soon';
  } else {
    badgeLabel = dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    badgeClass = 'timeline-badge later';
  }

  const dateFormatted = dt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const timeFormatted = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const checklist = a.checklist || [];
  const cardDetailsId = `visitDetails_${a.id}`;

  return `
    <div class="glass-card" style="margin-bottom: 12px; padding: 14px 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
            <span class="${badgeClass}">${badgeLabel}</span>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">${dateFormatted} • Ore ${timeFormatted}</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${escapeHTML(a.title)}</div>
          ${a.location ? `
            <a href="https://maps.google.com/?q=${encodeURIComponent(a.location)}" target="_blank" rel="noopener" style="font-size: 13px; color: var(--accent-blue); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;">
              📍 ${escapeHTML(a.location)} ›
            </a>
          ` : ''}
        </div>
        <button class="btn-secondary-sm" style="flex: none; padding: 4px 8px; font-size: 12px;" onclick="toggleVisitCardDetails('${cardDetailsId}')">
          <span id="arrow_${cardDetailsId}">▾</span> Dettagli
        </button>
      </div>

      <!-- Sezione Espandibile: Note di preparazione & Domande checklist -->
      <div id="${cardDetailsId}" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
        ${a.notes ? `
          <div style="font-size: 12px; background: var(--bg-card-secondary); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 10px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 2px;">Note di Preparazione</div>
            ${escapeHTML(a.notes)}
          </div>
        ` : ''}

        <div class="checklist-container" style="background: var(--bg-card-secondary); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 10px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent-blue); margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>🩺 Domande per il Medico</span>
            <span style="color: var(--text-secondary);">${checklist.filter(c => c.done).length}/${checklist.length}</span>
          </div>
          ${checklist.map((item, idx) => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; cursor: pointer; ${item.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}" onclick="toggleChecklistItem('${a.id}', ${idx})">
              <span style="width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--accent-blue); display: flex; align-items: center; justify-content: center; font-size: 11px; background: ${item.done ? 'var(--accent-blue)' : 'transparent'}; color: #fff;">${item.done ? '✓' : ''}</span>
              <span>${escapeHTML(item.text)}</span>
            </div>
          `).join('')}
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <input type="text" id="checkInput_${a.id}" class="form-input" style="padding: 6px 10px; font-size: 12px;" placeholder="Aggiungi domanda per la visita..." onkeydown="if(event.key==='Enter') addChecklistItem('${a.id}')">
            <button class="btn-secondary-sm" style="flex: none; padding: 6px 12px;" onclick="addChecklistItem('${a.id}')">+</button>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-secondary-sm" onclick="exportSingleICS('${a.id}')">📅 Esporta .ics</button>
          ${a.docId ? `<button class="btn-secondary-sm" onclick="openDocById('${a.docId}')">📄 Documento Dossier</button>` : ''}
          <button class="btn-secondary-sm" style="color: var(--accent-coral); margin-left: auto;" onclick="deleteAppt('${a.id}')">Elimina</button>
        </div>
      </div>
    </div>
  `;
}

// 16.2 Diario Appunti Salute (Stile Apple Notes)
function renderHealthNotes() {
  const container = document.getElementById('healthNotesList');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const allNotes = JSON.parse(localStorage.getItem('pulse_notes') || '[]');
  const profileNotes = allNotes.filter(n => !n.profileId || n.profileId === activeProfile);
  profileNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (profileNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px;">
        <div class="empty-text">Nessun appunto nel diario</div>
        <div class="empty-sub">Annota sintomi, reazioni a farmaci o promemoria prima della visita con il medico.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = profileNotes.map(n => {
    const dt = new Date(n.date);
    const dateStr = dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const tagClass = 'tag-' + (n.tag || 'nota').toLowerCase();

    return `
      <div class="glass-card" style="margin-bottom: 10px; padding: 12px 16px; border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="health-note-tag-pill ${tagClass}">${escapeHTML(n.tag || 'Nota')}</span>
          <span style="font-size: 11px; color: var(--text-secondary);">${dateStr}</span>
        </div>
        ${n.title ? `<div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${escapeHTML(n.title)}</div>` : ''}
        <div style="font-size: 13px; color: var(--text-primary); line-height: 1.45; white-space: pre-wrap;">${escapeHTML(n.text)}</div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; border-top: 1px solid var(--border-subtle); padding-top: 6px;">
          <button class="btn-secondary-sm" style="font-size: 11px; padding: 3px 8px;" onclick="editHealthNote('${n.id}')">Modifica</button>
          <button class="btn-secondary-sm" style="font-size: 11px; padding: 3px 8px; color: var(--accent-coral);" onclick="deleteHealthNote('${n.id}')">Elimina</button>
        </div>
      </div>
    `;
  }).join('');
}

function handleSaveHealthNote(e) {
  e.preventDefault();
  const idInput = document.getElementById('noteEditId');
  const titleInput = document.getElementById('noteTitleInput');
  const tagSelect = document.getElementById('noteTagSelect');
  const textInput = document.getElementById('noteTextInput');

  const text = textInput.value.trim();
  if (!text) return;

  const activeProfile = getActiveProfileId();
  let notes = JSON.parse(localStorage.getItem('pulse_notes') || '[]');
  const editId = idInput.value;

  if (editId) {
    const existing = notes.find(n => n.id === editId);
    if (existing) {
      existing.title = titleInput.value.trim();
      existing.tag = tagSelect.value;
      existing.text = text;
      existing.updatedAt = new Date().toISOString();
      showToast('Appunto aggiornato!', '📝');
    }
  } else {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      profileId: activeProfile,
      title: titleInput.value.trim(),
      tag: tagSelect.value,
      text: text,
      date: new Date().toISOString()
    };
    notes.unshift(newNote);
    showToast('Appunto salvato nel diario!', '📝');
  }

  localStorage.setItem('pulse_notes', JSON.stringify(notes));
  cancelEditHealthNote();
  renderHealthNotes();
}

function editHealthNote(id) {
  const notes = JSON.parse(localStorage.getItem('pulse_notes') || '[]');
  const note = notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById('noteEditId').value = note.id;
  document.getElementById('noteTitleInput').value = note.title || '';
  document.getElementById('noteTagSelect').value = note.tag || 'Nota';
  document.getElementById('noteTextInput').value = note.text || '';
  document.getElementById('btnSaveHealthNote').innerText = 'Aggiorna';
  document.getElementById('noteCancelBtnWrap').style.display = 'inline-block';
  document.getElementById('noteTextInput').focus();
}

function cancelEditHealthNote() {
  document.getElementById('noteEditId').value = '';
  document.getElementById('noteTitleInput').value = '';
  document.getElementById('noteTagSelect').value = 'Nota';
  document.getElementById('noteTextInput').value = '';
  document.getElementById('btnSaveHealthNote').innerText = 'Salva Appunto';
  document.getElementById('noteCancelBtnWrap').style.display = 'none';
}

function deleteHealthNote(id) {
  if (confirm('Eliminare questo appunto dal diario?')) {
    let notes = JSON.parse(localStorage.getItem('pulse_notes') || '[]');
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('pulse_notes', JSON.stringify(notes));
    showToast('Appunto eliminato', '🗑️');
    renderHealthNotes();
  }
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
    name: '',
    cf: '',
    bloodType: '0 Rh+',
    allergies: '',
    doctor: '',
    doctorPhone: '',
    doctorWa: '',
    doctorEmail: '',
    doctorAddress: '',
    doctorNotes: '',
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

  document.getElementById('profileNameDisplay').innerText = profile.name || 'Il tuo nome';
  document.getElementById('profileCfDisplay').innerText = profile.cf || 'Non impostato';
  document.getElementById('profileBloodDisplay').innerText = profile.bloodType || '0 Rh+';
  document.getElementById('profileAllergiesDisplay').innerText = profile.allergies || 'Nessuna indicata';
  document.getElementById('profileDoctorDisplay').innerText = profile.doctor || 'Non configurato';

  // 2 Pulsanti Rapidi a Destra del Medico (34x34) WhatsApp & Telefono
  const docQuickBtns = document.getElementById('doctorQuickButtonsRight');
  if (docQuickBtns) {
    const hasPhone = !!(profile.doctorPhone || profile.doctorWa);
    const hasWa = !!(profile.doctorWa || profile.doctorPhone);
    docQuickBtns.innerHTML = `
      <button class="quick-doc-btn whatsapp" onclick="openDoctorWhatsApp()" title="Invia WhatsApp al Medico" style="opacity: ${hasWa ? '1' : '0.45'};">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.336 11.893-11.893a11.821 11.821 0 00-3.48-8.414z"/>
        </svg>
      </button>
      <button class="quick-doc-btn phone" onclick="openDoctorPhone()" title="Chiama il Medico" style="opacity: ${hasPhone ? '1' : '0.45'};">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </button>
    `;
  }

  const docActions = document.getElementById('doctorActionsContainer');
  if (docActions) {
    let actionsHTML = '';
    actionsHTML += `<button onclick="openDoctorModal()" class="btn-secondary-sm" style="padding: 6px 10px;">📋 Scheda Medico</button>`;
    if (profile.doctorPhone) {
      actionsHTML += `<a href="tel:${profile.doctorPhone}" class="btn-secondary-sm" style="text-decoration: none; padding: 6px 10px;">📞 Chiama</a>`;
    }
    if (profile.doctorEmail) {
      actionsHTML += `<a href="mailto:${profile.doctorEmail}" class="btn-secondary-sm" style="text-decoration: none; padding: 6px 10px;">✉️ Email</a>`;
    }
    docActions.innerHTML = actionsHTML;
  }

  estimateStorage();
  renderQuickHub();
}

function openDoctorWhatsApp() {
  const activeId = getActiveProfileId();
  const profile = getProfileData(activeId);
  const rawNum = profile.doctorWa || profile.doctorPhone;
  if (!rawNum) {
    showToast('Numero medico non impostato', '⚠️');
    openDoctorModal();
    return;
  }
  const cleanNum = rawNum.replace(/[^0-9+]/g, '');
  window.open(`https://wa.me/${cleanNum.startsWith('+') ? cleanNum.slice(1) : (cleanNum.startsWith('3') ? '39' + cleanNum : cleanNum)}`, '_blank');
}

function openDoctorPhone() {
  const activeId = getActiveProfileId();
  const profile = getProfileData(activeId);
  const rawNum = profile.doctorPhone || profile.doctorWa;
  if (!rawNum) {
    showToast('Numero telefono non impostato', '⚠️');
    openDoctorModal();
    return;
  }
  window.location.href = `tel:${rawNum.replace(/[^0-9+]/g, '')}`;
}

function openNearestPharmacyMap() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    window.location.href = 'maps://?q=Farmacia';
  } else {
    window.open('https://www.google.com/maps/search/farmacia+piu+vicina/', '_blank');
  }
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
  { id: 'fse', name: 'Fascicolo Sanitario', webUrl: 'https://www.fascicolo-sanitario.it/', androidPackage: 'it.lepida.ersalute', iosScheme: null, iconColor: '#007AFF', letter: 'FSE', iconKey: 'folder' },
  { id: 'cie', name: 'CieID (CIE)', webUrl: 'https://www.cartaidentita.interno.gov.it/', androidPackage: 'it.ipzs.cieid', iosScheme: null, iconColor: '#003366', letter: 'CIE', iconKey: 'shield', emoji: '🪪' },
  { id: 'io', name: 'App IO', webUrl: 'https://io.italia.it/', androidPackage: 'it.pagopa.io.app', iosScheme: 'ioitalia://', iconColor: '#0066CC', letter: 'IO', iconKey: 'phone', emoji: '🇮🇹' },
  { id: 'cup', name: 'CUPWeb Prenotazioni', webUrl: 'https://www.cupweb.it/', androidPackage: null, iosScheme: null, iconColor: '#00C7BE', letter: 'CUP', iconKey: 'calendar' },
  { id: 'miodottore', name: 'MioDottore', webUrl: 'https://www.miodottore.it/', androidPackage: 'it.docplanner', iosScheme: null, iconColor: '#34C759', letter: 'MD', iconKey: 'hospital' },
  { id: 'farmacie', name: 'Farmacie di Turno', webUrl: 'https://www.farmaciediturno.org/', androidPackage: null, iosScheme: null, iconColor: '#FF9500', letter: 'Rx', iconKey: 'pharmacy' },
  { id: '730', name: 'Spese Sanitarie 730', webUrl: 'https://sistemats1.sanita.finanze.it/', androidPackage: null, iosScheme: null, iconColor: '#AF52DE', letter: '730', iconKey: 'shield' }
];

const HUB_ICONS_CONFIG = [
  { key: 'globe', label: 'Web', emoji: '🌐', color: '#007AFF' },
  { key: 'hospital', label: 'Ospedale', emoji: '🏥', color: '#34C759' },
  { key: 'folder', label: 'Dossier', emoji: '📁', color: '#AF52DE' },
  { key: 'heart', label: 'Salute', emoji: '❤️', color: '#FF2D55' },
  { key: 'pharmacy', label: 'Farmacia', emoji: '💊', color: '#FF9500' },
  { key: 'calendar', label: 'Visite', emoji: '📅', color: '#00C7BE' },
  { key: 'shield', label: 'Polizza', emoji: '🛡️', color: '#5856D6' },
  { key: 'phone', label: 'App', emoji: '📱', color: '#64A8F0' }
];

let selectedHubIconKey = 'globe';

function initQuickHub() {
  renderQuickHub();
  renderHubIconSelector();
}

function getProfileHubLinks(profileId) {
  const key = `pulse_hub_links_${profileId}`;
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        let modified = false;

        // 1. Rimuovi la vecchia scheda di default 'apple' (Apple Salute) se presente
        if (parsed.some(l => l.id === 'apple')) {
          parsed = parsed.filter(l => l.id !== 'apple');
          modified = true;
        }

        // 2. Se manca 'cie' nei default, inserisci 'cie'
        if (!parsed.some(l => l.id === 'cie')) {
          const cieDef = DEFAULT_HUB_LINKS.find(d => d.id === 'cie');
          if (cieDef) {
            const fseIdx = parsed.findIndex(l => l.id === 'fse');
            if (fseIdx !== -1) {
              parsed.splice(fseIdx + 1, 0, { ...cieDef });
            } else {
              parsed.unshift({ ...cieDef });
            }
            modified = true;
          }
        }

        // 3. Se manca 'io' nei default, inserisci 'io'
        if (!parsed.some(l => l.id === 'io')) {
          const ioDef = DEFAULT_HUB_LINKS.find(d => d.id === 'io');
          if (ioDef) {
            const cieIdx = parsed.findIndex(l => l.id === 'cie');
            if (cieIdx !== -1) {
              parsed.splice(cieIdx + 1, 0, { ...ioDef });
            } else {
              parsed.push({ ...ioDef });
            }
            modified = true;
          }
        }

        // 4. Aggiorna webUrl, androidPackage e iosScheme sui default esistenti
        parsed.forEach(l => {
          const def = DEFAULT_HUB_LINKS.find(d => d.id === l.id);
          if (def) {
            if (l.webUrl !== def.webUrl) { l.webUrl = def.webUrl; modified = true; }
            if (l.url !== def.webUrl) { l.url = def.webUrl; modified = true; }
            if (l.androidPackage !== def.androidPackage) { l.androidPackage = def.androidPackage; modified = true; }
            if (l.iosScheme !== def.iosScheme) { l.iosScheme = def.iosScheme; modified = true; }
            if (def.emoji && l.emoji !== def.emoji) { l.emoji = def.emoji; modified = true; }
          } else {
            // Scheda custom: assicurati che webUrl sia popolato
            if (!l.webUrl && l.url) { l.webUrl = l.url; modified = true; }
          }
        });

        if (modified) {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Errore lettura pulse_hub_links:', e);
    }
  }

  // Se non inizializzato, unifica DEFAULT_HUB_LINKS + eventuali custom salvati in precedenza
  const legacyCustom = JSON.parse(localStorage.getItem('pulse_custom_hub') || '[]');
  const profileLegacy = legacyCustom.filter(l => !l.profileId || l.profileId === profileId);
  const initialLinks = DEFAULT_HUB_LINKS.map(d => ({ ...d, url: d.webUrl }));
  profileLegacy.forEach(l => {
    if (!initialLinks.some(i => i.id === l.id)) {
      initialLinks.push({ ...l, webUrl: l.webUrl || l.url });
    }
  });
  localStorage.setItem(key, JSON.stringify(initialLinks));
  return initialLinks;
}

function saveProfileHubLinks(profileId, links) {
  const key = `pulse_hub_links_${profileId}`;
  localStorage.setItem(key, JSON.stringify(links));
}

function openHealthPortal(portalId, event) {
  if (event) {
    event.preventDefault();
  }

  const activeProfile = getActiveProfileId();
  const allLinks = getProfileHubLinks(activeProfile);
  const portal = allLinks.find(l => l.id === portalId) || DEFAULT_HUB_LINKS.find(l => l.id === portalId);
  const targetUrl = (portal && (portal.webUrl || portal.url)) || '';
  if (!targetUrl) return;

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

  // 1. Su Android (Android Intent con fallback automatico)
  if (isAndroid && portal && portal.androidPackage) {
    try {
      const urlObj = new URL(targetUrl);
      const hostAndPath = urlObj.host + urlObj.pathname + (urlObj.search || '');
      const intentUrl = `intent://${hostAndPath}#Intent;scheme=https;package=${portal.androidPackage};S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`;
      window.location.href = intentUrl;
      return;
    } catch (e) {
      console.warn('Errore costruzione Android Intent URI:', e);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // 2. Su iPhone / iOS (Universal Link & URL Scheme)
  if (isIOS) {
    if (portal && portal.iosScheme) {
      let isHidden = false;
      const onVisibilityChange = () => {
        if (document.hidden || document.visibilityState === 'hidden') {
          isHidden = true;
        }
      };
      const onPageHide = () => {
        isHidden = true;
      };

      document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
      window.addEventListener('pagehide', onPageHide, { once: true });

      // Tentativo apertura diretta con URL scheme
      window.location.href = portal.iosScheme;

      // Fallback a webUrl se l'app non è installata
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
        if (!isHidden && (!document.hidden && document.visibilityState !== 'hidden')) {
          window.location.href = targetUrl;
        }
      }, 1200);
      return;
    }

    // Per app con Universal Links (FSE, CieID) o siti web
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // 3. Su Desktop / PC o fallback
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function renderHubIconSelector() {
  const grid = document.getElementById('hubIconSelectorGrid');
  if (!grid) return;

  grid.innerHTML = HUB_ICONS_CONFIG.map(item => {
    const isSelected = item.key === selectedHubIconKey;
    return `
      <div onclick="selectHubIcon('${item.key}')" class="glass-card" style="padding: 10px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: ${isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-glass)'}; background: ${isSelected ? 'rgba(0, 122, 255, 0.12)' : 'var(--bg-card-secondary)'}; border-radius: 12px; transition: all 0.2s ease;">
        <span style="font-size: 22px; margin-bottom: 2px;">${item.emoji}</span>
        <span style="font-size: 11px; font-weight: 700; color: ${isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)'};">${item.label}</span>
      </div>
    `;
  }).join('');
}

function selectHubIcon(iconKey) {
  selectedHubIconKey = iconKey;
  const hiddenInput = document.getElementById('hubPortalSelectedIcon');
  if (hiddenInput) hiddenInput.value = iconKey;
  renderHubIconSelector();
}

function openAddHubModal() {
  selectedHubIconKey = 'globe';
  const nameInput = document.getElementById('hubPortalNameInput');
  const urlInput = document.getElementById('hubPortalUrlInput');
  if (nameInput) nameInput.value = '';
  if (urlInput) urlInput.value = '';
  renderHubIconSelector();
  openModal('addHubModalOverlay');
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 150);
}

function handleAddHubPortal(e) {
  e.preventDefault();
  const name = document.getElementById('hubPortalNameInput').value.trim();
  let url = document.getElementById('hubPortalUrlInput').value.trim();
  if (!name || !url) return;

  // Supporto sia indirizzi web sia URL Scheme di app (es. ioitalia://, whatsapp://, mailto:, tel:)
  const hasScheme = /^[a-zA-Z0-9_\-\+]+:\/\//i.test(url) || /^(mailto|tel|sms):/i.test(url);
  if (!hasScheme) {
    url = 'https://' + url;
  }

  const activeProfile = getActiveProfileId();
  const links = getProfileHubLinks(activeProfile);
  const iconConfig = HUB_ICONS_CONFIG.find(c => c.key === selectedHubIconKey) || HUB_ICONS_CONFIG[0];

  links.push({
    id: 'custom_' + Date.now(),
    profileId: activeProfile,
    name: name,
    url: url,
    webUrl: url,
    androidPackage: null,
    iosScheme: url.includes('://') && !url.startsWith('http') ? url : null,
    iconKey: iconConfig.key,
    emoji: iconConfig.emoji,
    iconColor: iconConfig.color,
    letter: iconConfig.emoji || name.substring(0, 2).toUpperCase()
  });

  saveProfileHubLinks(activeProfile, links);
  closeModal('addHubModalOverlay');
  renderQuickHub();
  showToast(`"${name}" aggiunto ai Portali Salute!`, '🔗');
}

function deleteCustomHubLink(linkId, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (confirm('Rimuovere questo portale dalla lista?')) {
    const activeProfile = getActiveProfileId();
    let links = getProfileHubLinks(activeProfile);
    links = links.filter(l => l.id !== linkId);
    saveProfileHubLinks(activeProfile, links);
    renderQuickHub();
    showToast('Portale rimosso', '🗑️');
  }
}

function renderQuickHub() {
  const container = document.getElementById('healthHubGrid');
  if (!container) return;

  const activeProfile = getActiveProfileId();
  const allLinks = getProfileHubLinks(activeProfile);

  container.innerHTML = allLinks.map(link => {
    const displayBadge = link.emoji ? `<span style="font-size: 20px;">${link.emoji}</span>` : `<span style="font-weight: 800; font-size: 15px;">${link.letter}</span>`;
    const targetUrl = link.webUrl || link.url || '#';
    
    return `
      <div style="position: relative;">
        <a href="${escapeHTML(targetUrl)}" onclick="openHealthPortal('${link.id}', event)" target="_blank" rel="noopener noreferrer" class="glass-card" style="padding: 18px 10px 14px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; text-align: center; gap: 8px; border-radius: var(--radius-md); height: 100%; box-sizing: border-box;">
          <div class="squircle-icon-badge" style="width: 44px; height: 44px; min-width: 44px; border-radius: 13px; background: ${link.iconColor}18; border: 1px solid ${link.iconColor}33; color: ${link.iconColor};">
            ${displayBadge}
          </div>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.25; word-break: break-word;">${escapeHTML(link.name)}</div>
        </a>
        <button type="button" onclick="deleteCustomHubLink('${link.id}', event)" class="hub-card-delete-btn" aria-label="Elimina ${escapeHTML(link.name)}" title="Rimuovi ${escapeHTML(link.name)}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('') + `
    <div class="glass-card" onclick="openAddHubModal()" style="padding: 14px 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-style: dashed; border-radius: var(--radius-md); min-height: 98px;" aria-label="Aggiungi portale" title="Aggiungi portale o app">
      <div class="squircle-icon-badge" style="width: 44px; height: 44px; min-width: 44px; border-radius: 13px; background: rgba(224, 108, 117, 0.12); color: var(--accent-coral); border: 1px solid rgba(224, 108, 117, 0.28);">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
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
    notes: JSON.parse(localStorage.getItem('pulse_notes') || '[]'),
    calendar_notes: JSON.parse(localStorage.getItem('pulse_calendar_notes') || '[]'),
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
      if (data.notes) localStorage.setItem('pulse_notes', JSON.stringify(data.notes));
      if (data.calendar_notes) localStorage.setItem('pulse_calendar_notes', JSON.stringify(data.calendar_notes));
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
  const confirm1 = confirm('ATTENZIONE: Sei sicuro di voler cancellare TUTTI i dati salvati su questo dispositivo (documenti, visite, farmaci, profilo)?');
  if (!confirm1) return;

  const confirm2 = confirm('Conferma definitiva: Questa operazione è IRREVERSIBILE. L\'app verrà completamente svuotata e riavviata allo stato iniziale di fabbrica.');
  if (!confirm2) return;

  try {
    await pulseDB.clearAll();
    localStorage.clear();
    sessionStorage.clear();
    showToast('Tutti i dati locali sono stati eliminati', '🗑️');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  } catch (err) {
    console.error('Errore durante la cancellazione dei dati:', err);
    localStorage.clear();
    window.location.reload();
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

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.remove('active');
  }
  const anyActive = document.querySelector('.modal-overlay.active');
  if (!anyActive) {
    document.body.classList.remove('modal-open');
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

// ----------------------------------------------------
// 18. MANUALE DI PRIMO SOCCORSO (100% OFFLINE)
// ----------------------------------------------------
const FIRST_AID_DATA = [
  {
    id: 'heimlich',
    title: 'Soffocamento (Heimlich)',
    subtitle: 'Ostruzione vie aeree',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 15v7M8 22h8"/>
    </svg>`,
    dos: [
      'Incoraggia la persona a tossire energicamente se respira ancora.',
      'Se non riesce a parlare o tossire, posizionati dietro e dai 5 colpi interscapolari (tra le scapole) con il palmo.',
      'Se l\'ostruzione persiste, esegui la manovra di Heimlich: cingi la vita, poni il pugno sopra l\'ombelico e comprimi con forza verso l\'interno e verso l\'alto.',
      'Alterna 5 colpi dorsali a 5 compressioni addominali finché l\'oggetto non viene espulso.'
    ],
    donts: [
      'NON tentare di estrarre l\'oggetto alla cieca con le dita se non è chiaramente visibile (rischi di spingerlo più a fondo).',
      'NON dare acqua o cibo durante l\'ostruzione.'
    ],
    emergencyCall: 'Se la persona perde conoscenza, adagiala a terra, chiama subito il 112 e inizia le manovre di RCP (massaggio cardiaco).'
  },
  {
    id: 'burns',
    title: 'Ustioni & Scottature',
    subtitle: 'Calore o liquidi bollenti',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2c1 3 4 5 4 9a6 6 0 1 1-12 0c0-4 3-6 4-9 1 3 3 5 4 0z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Raffredda subito l\'area con acqua corrente fresca (non gelata) per almeno 10-15 minuti continui.',
      'Rimuovi anelli, bracciali o indumenti non attaccati alla pelle prima che la parte si gonfi.',
      'Copri la scottatura con garze sterili o con una pellicola trasparente pulita senza stringere.',
      'Mantieni l\'area pulita e al riparo da sfregamenti.'
    ],
    donts: [
      'NON applicare mai ghiaccio diretto (può causare necrosi tissutale da congelamento).',
      'NON rompere le bolle o vesciche (proteggono dalle infezioni).',
      'NON applicare olio, burro, dentifricio o pomate su ustioni fresche.'
    ],
    emergencyCall: 'Chiama il 112 se l\'ustione è estesa (più del palmo della mano), colpisce viso, mani o articolazioni, o se la pelle appare bianca/nera (3° grado).'
  },
  {
    id: 'cuts',
    title: 'Tagli & Emorragie',
    subtitle: 'Ferite e sanguinamenti',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" fill="currentColor" fill-opacity="0.16"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
    </svg>`,
    dos: [
      'Lava le mani e applica una pressione diretta e costante sulla ferita con una garza o un panno pulito per almeno 5-10 minuti.',
      'Se il sanguinamento è su un arto, sollevalo al di sopra del livello del cuore se non ci sono fratture.',
      'Pulisci la ferita con acqua corrente o fisiologica e disinfetta delicatamente i bordi.',
      'Applica una medicazione compressiva pulita.'
    ],
    donts: [
      'NON rimuovere la prima garza anche se si impregna di sangue: aggiungine altre sopra continuando a premere.',
      'NON estrarre oggetti conficcati in profondità (tampona attorno all\'oggetto).',
      'NON usare lacci emostatici artigianali a meno che tu non abbia un addestramento specifico.'
    ],
    emergencyCall: 'Chiama il 112 se il sangue zampilla o non si arresta dopo 10 minuti di pressione continua, o se la persona avverte debolezza estrema o sviene.'
  },
  {
    id: 'fainting',
    title: 'Svenimento',
    subtitle: 'Perdita di coscienza breve',
    iconColor: '#64A8F0',
    iconBg: 'rgba(100, 168, 240, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" fill="currentColor" fill-opacity="0.16"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>`,
    dos: [
      'Stendi la persona sulla schiena e solleva le gambe di circa 30 cm (posizione antishock) per favorire l\'afflusso di sangue al cervello.',
      'Allenta colletti, cinture e indumenti stretti per facilitare la respirazione.',
      'Assicurati che ci sia ricircolo d\'aria fresca e allontana la folla.',
      'Rassicurala al risveglio e lasciala sdraiata ancora per qualche minuto prima di farla alzare gradualmente.'
    ],
    donts: [
      'NON farla alzare subito in piedi, anche se dice di sentirsi meglio.',
      'NON somministrare bevande o cibo finché non è perfettamente cosciente e orientata.',
      'NON schiaffeggiare o bagnare violentemente il viso con acqua fredda.'
    ],
    emergencyCall: 'Chiama il 112 se la persona non riprende conoscenza entro 1-2 minuti, se ha battuto violentemente la testa cadendo o ha convulsioni.'
  },
  {
    id: 'allergy',
    title: 'Reazione Allergica',
    subtitle: 'Orticaria o anafilassi',
    iconColor: '#A98AE0',
    iconBg: 'rgba(169, 138, 224, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 3v10"/>
    </svg>`,
    dos: [
      'Identifica e allontana immediatamente il presunto allergene (alimento, pianta, farmaco o puntura).',
      'Se il soggetto ha un autoiniettore di adrenalina prescritto (es. Fastjekt), aiutalo a usarlo immediatamente sulla coscia.',
      'Mantieni la persona calma, seduta se fatica a respirare o distesa con gambe alzate se avverte vertigini.',
      'Monitora costantemente respiro e livello di coscienza.'
    ],
    donts: [
      'NON sottovalutare sintomi anche lievi se compaiono formicolio in bocca o tosse improvvisa.',
      'NON dare da bere o mangiare se ci sono difficoltà a deglutire o gonfiore a labbra/gola.'
    ],
    emergencyCall: 'Chiama immediatamente il 112 al primo segno di difficoltà respiratoria, gonfiore di lingua o gola, voce roca o collasso (anafilassi grave).'
  },
  {
    id: 'bites',
    title: 'Punture & Morsi',
    subtitle: 'Insetti, api, zecche',
    iconColor: '#5EC282',
    iconBg: 'rgba(94, 194, 130, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="6" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
    </svg>`,
    dos: [
      'Per punture d\'ape: rimuovi subito il pungiglione raschiando con una tessera rigida (senza schiacciarlo).',
      'Applica impacchi freddi o ghiaccio avvolto in un panno per ridurre gonfiore e dolore.',
      'Per morsi di zecca: afferrala con una pinzetta sottile alla base della cute e tira verso l\'alto delicatamente senza ruotarla.',
      'Disinfetta accuratamente la zona e monitora l\'eventuale comparsa di aloni rossi nei giorni successivi.'
    ],
    donts: [
      'NON schiacciare il pungiglione con le dita (espelleresti altro veleno nel tessuto).',
      'NON soffocare la zecca con alcol, olio, acetone o fiammiferi prima di estrarla.',
      'NON grattare vigorosamente la puntura per non provocare sovrainfezioni.'
    ],
    emergencyCall: 'Chiama il 112 se la puntura è in bocca o gola, se compaiono difficoltà a respirare o se la persona è allergica nota al veleno d\'api.'
  },
  {
    id: 'heatstroke',
    title: 'Colpo di Calore',
    subtitle: 'Disidratazione e ipertermia',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>`,
    dos: [
      'Sposta subito la persona in un ambiente fresco, ombreggiato e ben ventilato.',
      'Falla sdraiare con le gambe leggermente sollevate e rimuovi gli indumenti pesanti o in eccesso.',
      'Raffredda il corpo con panni bagnati con acqua fresca su fronte, collo, ascelle e inguine.',
      'Se è cosciente e non vomita, offri piccoli sorsi di acqua fresca (non ghiacciata) o soluzioni reidratanti.'
    ],
    donts: [
      'NON immergere la persona in acqua ghiacciata (può provocare shock termico o arresto).',
      'NON somministrare farmaci antipiretici (tachipirina o aspirina non sono efficaci per il colpo di calore).',
      'NON dare alcol o bevande zuccherate/caffeinate.'
    ],
    emergencyCall: 'Chiama il 112 se la temperatura corporea è superiore a 39-40 °C, se la persona è confusa, delira o perde conoscenza.'
  },
  {
    id: 'headtrauma',
    title: 'Trauma Cranico',
    subtitle: 'Botte alla testa e allarmi',
    iconColor: '#A98AE0',
    iconBg: 'rgba(169, 138, 224, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5.5 3.5 7V20a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-3c2-1.5 3.5-4 3.5-7a8 8 0 0 0-8-8z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Fai riposare la persona immobile tenendo testa e collo allineati.',
      'Applica una borsa del ghiaccio avvolta in un panno sul bernoccolo o contusione per ridurre il rigonfiamento.',
      'Se c\'è una ferita che sanguina superficialmente, applica una leggera pressione con una garza pulita.',
      'Tienila sotto osservazione costante nelle 24-48 ore successive per verificare la presenza di segnali di allarme.'
    ],
    donts: [
      'NON muovere il collo o la colonna vertebrale se il trauma è stato violento (es. caduta da alto o incidente).',
      'NON somministrare sedativi o antidolorifici forti prima della visita medica.',
      'NON premere con forza se sospetti una frattura cranica.'
    ],
    emergencyCall: 'Chiama subito il 112 in presenza di: perdita di coscienza anche brevissima, vomito ripetuto, sonnolenza anomala, pupille asimmetriche o fuoriuscita di liquido da naso/orecchie.'
  },
  {
    id: 'cpr',
    title: 'RCP Base',
    subtitle: 'Arresto cardiaco e massaggio',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19.5 12.5L12 20.5L4.5 12.5C2.5 10.2 2.8 6.8 5.2 4.8C7.5 2.8 11 3.5 12 6C13 3.5 16.5 2.8 18.8 4.8C21.2 6.8 21.5 10.2 19.5 12.5Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 9v6M9 12h6"/>
    </svg>`,
    dos: [
      'Verifica la sicurezza ambientale e scuoti delicatamente le spalle chiamando la persona ad alta voce.',
      'Se non risponde e non respira normalmente (o ha respiro agonico/gasping), chiama subito il 112 mettendo il vivavoce.',
      'Posiziona le mani intrecciate al centro del torace, braccia tese e perpendicolari.',
      'Esegui compressioni toraciche continue a ritmo di 100-120 al minuto (profondità 5-6 cm).',
      'Chiedi a un passante di recuperare il Defibrillatore (DAE) più vicino e accendilo appena disponibile.'
    ],
    donts: [
      'NON interrompere il massaggio cardiaco se non quando il DAE lo richiede o all\'arrivo del personale del 112.',
      'NON piegare le braccia durante la compressione (usa il peso del busto).',
      'NON avere paura di fare male: l\'arresto cardiaco senza massaggio è fatale.'
    ],
    emergencyCall: 'Chiama SUBITO il 112 e mantieni il vivavoce attivo: l\'operatore ti guiderà passo dopo passo al secondo durante tutta la manovra.'
  },
  {
    id: 'nosebleed',
    title: 'Sangue dal Naso (Epistassi)',
    subtitle: 'Compressione e postura',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2C8 7 8 11 8 14a4 4 0 0 0 8 0c0-3 0-7-4-12z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 18v3M9 21h6"/>
    </svg>`,
    dos: [
      'Siediti comodo con il busto e la testa leggermente inclinati in avanti.',
      'Stringi con decisione le due narici con pollice e indice per almeno 10 minuti continui senza rilasciare.',
      'Respira con la bocca ed espelli eventuale sangue che scende in gola (non deglutire).',
      'Applica una borsa del ghiaccio o un panno freddo sulla radice del naso o sulla fronte per favorire la vasocostrizione.'
    ],
    donts: [
      'NON reclinare la testa all\'indietro (il sangue scenderebbe nell\'esofago o nelle vie aeree, causando nausea o soffocamento).',
      'NON inserire cotone idrofilo o fazzoletti asciutti nelle narici che strappano il coagulo alla rimozione.',
      'NON soffiarti il naso o fare sforzi intensi per alcune ore dopo l\'arresto dell\'emorragia.'
    ],
    emergencyCall: 'Chiama il 112 o recati al Pronto Soccorso se l\'emorragia non si ferma dopo 20 minuti di compressione continua, in caso di trauma facciale violento o se la persona assume anticoagulanti.'
  },
  {
    id: 'fractures',
    title: 'Distorsioni & Fratture',
    subtitle: 'Immobilizzazione e ghiaccio',
    iconColor: '#64A8F0',
    iconBg: 'rgba(100, 168, 240, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 10c.7-.7 1.6-1 2.5-1a3.5 3.5 0 0 1 0 7c-.9 0-1.8-.3-2.5-1l-10-10C6.3 4.3 5.4 4 4.5 4a3.5 3.5 0 0 0 0 7c.9 0 1.8.3 2.5 1l10 10z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Immobilizza immediatamente l\'arto nella posizione in cui si trova, evitando qualsiasi movimento.',
      'Applica ghiaccio avvolto in un panno asciutto per 15-20 minuti alla volta per contenere gonfiore ed ematoma.',
      'Mantieni l\'arto in scarico e, se possibile, leggermente sollevato rispetto al cuore.',
      'In caso di frattura esposta, copri la ferita con una garza sterile senza toccare l\'osso sporgente.'
    ],
    donts: [
      'NON forzare il movimento dell\'arto o provare ad appoggiarvi peso sopra.',
      'NON tentare in nessun caso di riallineare o raddrizzare l\'osso o l\'articolazione deformata.',
      'NON applicare il ghiaccio a contatto diretto con la pelle nuda per evitare ustioni da freddo.'
    ],
    emergencyCall: 'Chiama subito il 112 in caso di frattura esposta, se l\'arto diventa freddo/pallido/insensibile o in caso di traumi a femore, bacino o colonna vertebrale.'
  },
  {
    id: 'seizure',
    title: 'Crisi Epilettica / Convulsioni',
    subtitle: 'Protezione e sicurezza',
    iconColor: '#AF52DE',
    iconBg: 'rgba(175, 82, 222, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Mantieni la calma e allontana subito qualsiasi oggetto spigoloso o pericoloso nelle vicinanze.',
      'Proteggi la testa posizionando sotto di essa qualcosa di morbido (es. giacca, cuscino, maglione ripiegato).',
      'Allenta colletti, cravatte o cinture strette e togli gli occhiali se presenti.',
      'Cronometra con precisione la durata della crisi dall\'inizio alla fine.',
      'Al termine delle convulsioni, poni delicatamente la persona in Posizione Laterale di Sicurezza (PLS) per mantenere libere le vie aeree.'
    ],
    donts: [
      'NON bloccare o trattenere la persona con la forza durante le convulsioni.',
      'NON mettere NULLA in bocca (né dita, né fazzoletti, né oggetti rigidi): la lingua non può essere ingoiata e rischi di provocare soffocamento o lesioni.',
      'NON somministrare liquidi, farmaci o cibo finché non è completamente vigile e orientata.'
    ],
    emergencyCall: 'Chiama subito il 112 se la crisi dura più di 5 minuti, se si ripete a breve distanza, se la persona non riprende conoscenza o se è la prima crisi della sua vita.'
  },
  {
    id: 'poisoning',
    title: 'Avvelenamento / Ingestione Sostanze',
    subtitle: 'Detersivi, farmaci, tossici',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2l7 4v6c0 5.55-3.84 10.74-7 12-3.16-1.26-7-6.45-7-12V6l7-4z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 8v5M12 16h.01"/>
    </svg>`,
    dos: [
      'Chiama SUBITO il Centro Antiveleni (02 66101029) o il 112 prima di compiere qualsiasi manovra.',
      'Recupera e tieni a portata di mano la confezione o l\'etichetta del prodotto/farmaco ingerito per riferire composizione esatta e quantità.',
      'Se la sostanza è sulla pelle o negli occhi, sciacqua immediatamente con abbondante acqua corrente tiepida per almeno 15 minuti.',
      'Se il soggetto ha inalato vapori tossici, arieggia la stanza e portalo subito all\'aria aperta.'
    ],
    donts: [
      'NON indurre in nessun caso il vomito (le sostanze caustiche come candeggina o acidi brucerebbero l\'esofago una seconda volta).',
      'NON somministrare latte, acqua, aceto o rimedi fai-da-te: il latte non è un antidoto e può accelerare l\'assorbimento di tossici liposolubili.',
      'NON attendere la comparsa dei sintomi per allertare il Centro Antiveleni o il 112.'
    ],
    emergencyCall: 'Chiama subito il 112 o il Centro Antiveleni di Niguarda (02 66101029) e segui tassativamente le istruzioni fornite dal tossicologo medico.'
  },
  {
    id: 'hypoglycemia',
    title: 'Ipoglicemia (Calo Zuccheri)',
    subtitle: 'Tremore, sudorazione, debolezza',
    iconColor: '#FF9500',
    iconBg: 'rgba(255, 149, 0, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 6v6l4 2"/>
    </svg>`,
    dos: [
      'Se la persona è cosciente e in grado di deglutire, somministra subito 15g di zuccheri semplici a rapido assorbimento: un bicchiere d\'acqua con 2-3 bustine di zucchero, un succo di frutta o 3-4 caramelle.',
      'Fai riposare la persona seduta o distesa e attendi 15 minuti.',
      'Se i sintomi migliorano, fai seguire uno snack con carboidrati complessi (es. 2-3 fette biscottate, cracker o pane) per stabilizzare la glicemia.',
      'Se la persona è diabetica, controlla la glicemia con il glucometro se disponibile.'
    ],
    donts: [
      'NON somministrare liquidi o cibo per bocca se la persona è confusa, sonnolenta o incosciente (rischio gravissimo di soffocamento/ab ingestis).',
      'NON dare cibi ricchi di grassi (come cioccolato o biscotti farciti) come prima scelta: i grassi rallentano l\'assorbimento degli zuccheri.',
      'NON lasciare la persona sola finché i sintomi non sono completamente risolti.'
    ],
    emergencyCall: 'Chiama subito il 112 se la persona perde conoscenza, ha convulsioni o se dopo 15 minuti dall\'assunzione di zucchero i sintomi non migliorano.'
  },
  {
    id: 'panic_attack',
    title: 'Attacco di Panico & Iperventilazione',
    subtitle: 'Tachicardia, fame d\'aria, ansia',
    iconColor: '#00C7BE',
    iconBg: 'rgba(0, 199, 190, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M8 12s1.5 2 4 2 4-2 4-2"/>
      <circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/>
    </svg>`,
    dos: [
      'Accompagna la persona in un ambiente tranquillo, silenzioso e all\'aria aperta o ben ventilato.',
      'Parla con tono calmo, rassicurante e sicuro, ricordandole che si tratta di una crisi passeggera e che non è in pericolo di vita.',
      'Guida il suo respiro: fai inspirare lentamente con il naso per 4 secondi, trattenere per 2 secondi ed espirare lentamente con la bocca per 6 secondi.',
      'Invitala a concentrarsi su stimoli esterni concreti (es. appoggiare i piedi a terra, descrivere 3 oggetti visibili).'
    ],
    donts: [
      'NON minimizzare i suoi sintomi con frasi come "non hai niente" o "stai calmo": aumentano la sensazione di isolamento e allarme.',
      'NON far respirare la persona all\'interno di sacchetti di plastica (rischio di asfissia).',
      'NON affollarsi intorno alla persona né trasmetterle agitazione o fretta.'
    ],
    emergencyCall: 'Chiama il 112 se il dolore toracico è costrittivo e irradiato a braccio o mandibola, o se è la prima volta che si manifesta un episodio simile senza diagnosi precedente.'
  },
  {
    id: 'eye_foreign_body',
    title: 'Corpo Estraneo nell\'Occhio',
    subtitle: 'Polvere, ciglia, schegge',
    iconColor: '#32ADE6',
    iconBg: 'rgba(50, 173, 230, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="currentColor" fill-opacity="0.16"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`,
    dos: [
      'Lavati accuratamente le mani prima di toccare il contorno occhi.',
      'Irriga abbondantemente l\'occhio aperto con soluzione fisiologica sterile o un getto delicato di acqua corrente tiepida per diversi minuti.',
      'Sbatti ripetutamente le palpebre mentre l\'occhio è immerso in acqua tiepida pulita per favorire la naturale espulsione lacrimale.',
      'Se il corpo estraneo (es. ciglia) galleggia sulla sclera bianca, rimuovilo con un angolo umido di garza sterile.'
    ],
    donts: [
      'NON strofinare l\'occhio per nessun motivo (graffieresti la cornea provocando abrasioni o ulcerazioni permanenti).',
      'NON usare pinzette, aghi, stuzzicadenti o batuffoli di cotone asciutti sull\'occhio.',
      'NON tentare di rimuovere corpi estranei conficcati o incastrati nella cornea o nell\'iride.'
    ],
    emergencyCall: 'Recati subito al Pronto Soccorso Oculistico o chiama il 112 se il corpo estraneo è una scheggia di metallo/vetro conficcata, se c\'è sangue o se la vista è offuscata.'
  },
  {
    id: 'hypothermia',
    title: 'Ipotermia / Colpo di Freddo',
    subtitle: 'Bassa temperatura, brividi intensi',
    iconColor: '#64A8F0',
    iconBg: 'rgba(100, 168, 240, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/>
    </svg>`,
    dos: [
      'Sposta la persona in un ambiente caldo, asciutto e riparato dal vento.',
      'Rimuovi con delicatezza tutti gli indumenti bagnati o umidi tagliandoli se necessario per evitare movimenti bruschi.',
      'Copri la persona con coperte calde e asciutte, isolandola anche dal pavimento e coprendole la testa (lasciando libero il viso).',
      'Se è cosciente e collaborante, offri bevande tiepide dolci (es. the zuccherato o brodo).'
    ],
    donts: [
      'NON applicare fonti di calore diretto intenso (borse d\'acqua bollente, stufe o bagni caldi): provocherebbero shock e arresto cardiaco per vasodilatazione periferica.',
      'NON massaggiare o strofinare braccia e gambe intorpidite.',
      'NON somministrare alcolici (l\'alcol causa vasodilatazione e accelera la dispersione termica vitale).'
    ],
    emergencyCall: 'Chiama SUBITO il 112 se la persona smette di tremare ma è confusa, rallentata, ha polso flebile o perde conoscenza.'
  },
  {
    id: 'electrocution',
    title: 'Scossa Elettrica & Folgorazione',
    subtitle: 'Corrente domestica o industriale',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'STACCA IMMEDIATAMENTE l\'interruttore generale della corrente (salvavita) prima di toccare la vittima.',
      'Se non puoi staccare la corrente, allontana la fonte o la persona usando un oggetto asciutto e non conduttore (es. manico di scopa in legno, plastica spessa).',
      'Una volta interrotto il contatto elettrico, verifica subito coscienza e respiro.',
      'Se non respira, chiama il 112 e inizia immediatamente il Massaggio Cardiaco (RCP).',
      'Se respira ed è cosciente, ponila in posizione comoda e copri le eventuali ustioni da entrata/uscita con teli sterili.'
    ],
    donts: [
      'NON toccare MAI la persona a mani nude finché è in contatto con la corrente elettrica (rimarresti folgorato anche tu).',
      'NON avvicinarsi in presenza di cavi dell\'alta tensione caduti a terra (mantenere almeno 15 metri di distanza).',
      'NON applicare oli o unguenti sulle bruciature elettriche.'
    ],
    emergencyCall: 'Chiama SUBITO il 112 per qualsiasi folgorazione: la corrente può causare aritmie cardiache gravi e danni interni anche a distanza di ore.'
  }
,
{
    id: 'chest_pain',
    title: 'Dolore Toracico & Infarto',
    subtitle: 'Sospetta sindrome coronarica acuta',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Fai sedere o semisedere la persona con le spalle rialzate (posizione semiseduta a 45 gradi con ginocchia flesse).',
      'Allenta cravatta, colletto, cintura e abiti costrittivi per favorire la respirazione diaframmatica.',
      'Mantieni la calma assoluta, rassicura la persona e falla respirare lentamente evitando sforzi o agitazione.',
      'Chiama IMMEDIATAMENTE il 112 specificando dolore toracico oppressivo, irradiazione (braccio sx, collo, mandibola) e sudorazione fredda.',
      'Se ha prescritto nitrati sublinguali (es. carvasin/trinitrina) e la pressione non è bassa, aiutala ad assumerli.'
    ],
    donts: [
      'NON far camminare o muovere la persona nemmeno di un metro.',
      'NON somministrare cibo, bevande, caffè o stimolanti.',
      'NON aspettare che il dolore passi da solo sperando sia un semplice reflusso gastrico.'
    ],
    emergencyCall: 'Chiama SUBITO il 112 in vivavoce. Se la persona diventa incosciente e non respira normalmente, inizia immediatamente il Massaggio Cardiaco (RCP).'
  },
  {
    id: 'stroke',
    title: 'Sospetto Ictus (Test FAST)',
    subtitle: 'Faccia, Braccia, Linguaggio, Tempo',
    iconColor: '#AF52DE',
    iconBg: 'rgba(175, 82, 222, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 12L2.5 7.5M12 12v9"/>
    </svg>`,
    dos: [
      'F - Face (Faccia): chiedi di sorridere e controlla se un angolo della bocca o una parte del viso cade o resta paralizzata.',
      'A - Arms (Braccia): chiedi di sollevare entrambe le braccia ad occhi chiusi per 10 secondi e osserva se un braccio ricade verso il basso.',
      'S - Speech (Linguaggio): chiedi di ripetere una frase semplice e valuta se le parole sono impastate, incomprensibili o prive di senso.',
      'T - Time (Tempo): se noti anche un solo segno positivo, chiama SUBITO il 112 indicando con precisione l\'orario esatto in cui sono comparsi i sintomi.',
      'Adagia la persona su un fianco in Posizione Laterale di Sicurezza (se non cosciente) o semiseduta con testa leggermente sollevata.'
    ],
    donts: [
      'NON dare da bere, da mangiare né farmaci (aspirina o antipertensivi) per via del rischio elevato di disfagia e soffocamento.',
      'NON far rialzare la persona.',
      'NON attendere per verificare se i sintomi migliorano spontaneamente: ogni minuto perso distrugge milioni di neuroni.'
    ],
    emergencyCall: 'Chiama IMMEDIATAMENTE il 112: comunica che sospetti un Ictus e riferisci l\'ora di esordio (fondamentale per la trombolisi entro le 4.5 ore).'
  },
  {
    id: 'anaphylaxis',
    title: 'Shock Anafilattico & Adrenalina',
    subtitle: 'Reazione allergica grave sistemica',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Riconosci i segnali d\'allarme: gonfiore a labbra, lingua o gola, difficoltà respiratoria grave, sibilo, orticaria diffusa e calo di pressione.',
      'Se la persona ha un autoiniettore di Adrenalina (es. Fastjekt, Jext, Emerade), usalo SUBITO nella parte antero-laterale della coscia (anche attraverso i vestiti).',
      'Mantieni premuto l\'iniettore saldamente contro la coscia per 5-10 secondi, quindi massaggia il punto di iniezione per 10 secondi.',
      'Fai sdraiare la persona con le gambe sollevate se ha vertigini o ipotensione, oppure semiseduta se fa fatica a respirare.',
      'Chiama il 112 specificando che è in corso uno shock anafilattico e che è stata somministrata adrenalina.'
    ],
    donts: [
      'NON far alzare in piedi o camminare la persona (il rapido svuotamento venoso può indurre arresto cardiaco improvviso).',
      'NON esitare a somministrare l\'adrenalina: il ritardo è il fattore di mortalità principale.',
      'NON somministrare liquidi o cibo per bocca.'
    ],
    emergencyCall: 'Chiama IMMEDIATAMENTE il 112 dopo la somministrazione: l\'effetto dell\'adrenalina può svanire dopo 10-15 minuti e potrebbe rendersi necessaria una seconda dose.'
  },
  {
    id: 'pediatric_choking',
    title: 'Disostruzione Bambino & Lattante',
    subtitle: 'Manovre pediatriche vie aeree',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="7" r="4" fill="currentColor" fill-opacity="0.16"/>
      <path d="M5.5 21v-3a6.5 6.5 0 0 1 13 0v3"/>
    </svg>`,
    dos: [
      'NEL LATTANTE (< 1 ANNO): Poni il bimbo a pancia in giù lungo il tuo avambraccio, con la testa più in basso del tronco sostenendogli la mandibola con le dita.',
      'Applica 5 pacche interscapolari vigorose tra le scapole con via di fuga laterale.',
      'Ruota il lattante a pancia in su e pratica 5 compressioni toraciche lente e profonde al centro dello sterno con due dita.',
      'NEL BAMBINO (> 1 ANNO): Inginocchiati dietro al bimbo e alterna 5 colpi dorsali a 5 compressioni subombelicali (Manovra di Heimlich per bambini).',
      'Alterna i cicli di 5 colpi e 5 compressioni finché l\'oggetto estraneo non viene espulso.'
    ],
    donts: [
      'NON scuotere violentemente il bambino.',
      'NON eseguire manovre alla cieca inserendo dita nella cavità orale se non vedi chiaramente il corpo estraneo affiorante.',
      'NON praticare compressioni addominali nel lattante sotto 1 anno (rischio grave di lesioni a fegato e milza).'
    ],
    emergencyCall: 'Se il bambino o lattante perde conoscenza, adagialo su un piano rigido, chiama subito il 112 in vivavoce e inizia la rianimazione cardiopolmonare pediatrica (5 ventilazioni iniziali + 30:2).'
  },
  {
    id: 'asthma_attack',
    title: 'Crisi d\'Asma Acuta',
    subtitle: 'Difficoltà respiratoria e sibilo espiratorio',
    iconColor: '#64A8F0',
    iconBg: 'rgba(100, 168, 240, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 12h12M6 8h12M6 16h8" stroke-width="2"/>
      <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Fai sedere la persona con il busto proteso leggermente in avanti, appoggiando le braccia su un tavolo o sulle ginocchia.',
      'Aiutala ad assumere SUBITO il suo inalatore broncodilatatore ad azione rapida (es. Ventolin / Salbutamolo, preferibilmente tramite distanziatore): 2-4 erogazioni distanziate di 1 minuto.',
      'Rassicura e mantieni la calma: incoraggia respirazioni lente a labbra socchiuse.',
      'Allontana la persona da allergeni, fumo, polvere, correnti d\'aria fredda o animali.'
    ],
    donts: [
      'NON far sdraiare la persona supina (la posizione orizzontale peggiora gravemente l\'insufficienza respiratoria).',
      'NON costringerla a bere o mangiare durante l\'attacco.',
      'NON lasciare sola la persona.'
    ],
    emergencyCall: 'Chiama il 112 se non risponde all\'inalatore dopo 5 minuti, se le labbra diventano bluastre/cianotiche, se non riesce a pronunciare frasi intere o se compaiono rientramenti al collo/sterno.'
  },
  {
    id: 'drowning',
    title: 'Annegamento & Ipossia in Acqua',
    subtitle: 'Soccorso in acqua e primo intervento a riva',
    iconColor: '#00C7BE',
    iconBg: 'rgba(0, 199, 190, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Estrai la persona dall\'acqua garantendo prima di tutto la tua sicurezza (usa salvagente o corda se possibile).',
      'Adagiala supina su un terreno solido e valuta immediatamente coscienza e respiro per 10 secondi.',
      'Se non respira: chiama subito il 112 e inizia con 5 INSUFFLAZIONI di soccorso (perché l\'arresto da annegamento è ipossico).',
      'Continua alternando 30 compressioni toraciche e 2 insufflazioni fino alla ripresa o all\'arrivo dell\'ambulanza.',
      'Se riprende a respirare, ponila in Posizione Laterale di Sicurezza e coprila per contrastare l\'ipotermia.'
    ],
    donts: [
      'NON perdere tempo tentando di svuotare l\'acqua dai polmoni con manovre di Heimlich o sollevamenti strani.',
      'NON tuffarti per salvare un annegato senza un supporto galleggiante se non sei un bagnino brevettato (il panico della vittima può trascinarti sotto).',
      'NON sottovalutare l\'annegamento secondario: anche se la persona sembra stare bene, deve essere valutata in ospedale.'
    ],
    emergencyCall: 'Chiama il 112 in qualsiasi caso di annegamento o quasi-annegamento con inalazione di acqua: l\'edema polmonare ritardato può manifestarsi anche dopo 24 ore.'
  },
  {
    id: 'co_poisoning',
    title: 'Monossido di Carbonio (CO)',
    subtitle: 'Stufe, caldaie, bracieri, gas inodore',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Spalanca immediatamente tutte le finestre e porte dell\'ambiente per creare forte ventilazione d\'aria fresca.',
      'Evacua subito tutte le persone e gli animali presenti all\'esterno all\'aria aperta.',
      'Spegni immediatamente l\'apparecchio incriminato (stufa, caldaia, braciere, generatore a motore) solo se puoi farlo senza esporti a pericoli.',
      'In caso di persone prive di sensi all\'aperto, verifica il respiro e, se assente, inizia la RCP 30:2.'
    ],
    donts: [
      'NON accendere luci, fiammiferi, interruttori o cellulari nella stanza (rischio esplosione in presenza di fughe di gas associate).',
      'NON rientrare mai nell\'edificio prima che i Vigili del Fuoco abbiano bonificato e verificato i livelli di CO.',
      'NON sottovalutare sintomi lievi come cefalea frontale, nausea, vertigini e sonnolenza condivisi da più persone nella stessa stanza.'
    ],
    emergencyCall: 'Chiama SUBITO il 112 e i Vigili del Fuoco (115): segnala sospetta intossicazione da monossido. Le vittime necessitano spesso di ossigenoterapia iperbarica tempestiva.'
  },
  {
    id: 'severe_bleeding',
    title: 'Emorragia Massiva & Laccio',
    subtitle: 'Sanguinamento arterioso a getto',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a5 5 0 0 0-5 5c0 4 5 10 5 10s5-6 5-10a5 5 0 0 0-5-5z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Applica una pressione diretta fortissima sulla ferita con entrambe le mani usando garze, teli o una maglietta pulita, caricando il peso del busto.',
      'Se il sanguinamento massivo è su un arto (braccio o gamba) e non si arresta con la compressione diretta, applica un laccio emostatico (Tourniquet omologato) 5-7 cm sopra la ferita (mai sull\'articolazione).',
      'Stringi la bacchetta del tourniquet fino al completo arresto del flusso ematico e bloccala nell\'apposito fermo.',
      'Annota l\'orario esatto di applicazione del laccio (es. "T 14:35") sulla fronte del paziente o sulla cinghia del laccio con un pennarello.',
      'Copri la persona con una coperta termica per prevenire l\'ipotermia da shock emorragico.'
    ],
    donts: [
      'NON allentare né rimuovere mai il laccio emostatico una volta posizionato (deve essere rimosso solo dal chirurgo in ospedale).',
      'NON usare fili di ferro, spaghi o lacci stretti non idonei che tagliano cute e muscoli.',
      'NON ritardare la compressione: un\'emorragia arteriosa massiva può essere fatale in meno di 3 minuti.'
    ],
    emergencyCall: 'Chiama IMMEDIATAMENTE il 112 specificando "emorragia massiva arteriosa" e comunica l\'ora in cui hai applicato il laccio emostatico.'
  },
  {
    id: 'traumatic_amputation',
    title: 'Amputazione Traumatica',
    subtitle: 'Gestione ferita e salvataggio moncone',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.16"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
    dos: [
      'SUL PAZIENTE: Arresta immediatamente l\'emorragia con compressione diretta o laccio emostatico (tourniquet) sopra la ferita.',
      'SUL MONCONE AMPUTATO: Avvolgi la parte amputata in una garza sterile asciutta o in un telo pulito.',
      'Inserisci il moncone avvolto all\'interno di un sacchetto di plastica impermeabile sigillato.',
      'Immergi il sacchetto sigillato in un secondo contenitore con acqua e cubetti di ghiaccio (temperatura fredda intorno a 4 °C).',
      'Consegna il contenitore con il moncone direttamente all\'équipe dell\'ambulanza del 112.'
    ],
    donts: [
      'NON mettere mai il moncone a contatto diretto con il ghiaccio o con l\'acqua (il congelamento brucerebbe i tessuti e impedirebbe il reimpianto).',
      'NON lavare o disinfettare con sostanze chimiche aggressive il moncone.',
      'NON abbandonare la ricerca della parte amputata prima dell\'arrivo dei soccorsi.'
    ],
    emergencyCall: 'Chiama SUBITO il 112: segnala amputazione per attivare il trasporto d\'urgenza verso un centro di chirurgia ricostruttiva e microchirurgia della mano.'
  },
  {
    id: 'dental_avulsion',
    title: 'Dente Avulso da Trauma',
    subtitle: 'Come salvare un dente permanente caduto',
    iconColor: '#64A8F0',
    iconBg: 'rgba(100, 168, 240, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2C8 2 6 5 6 9c0 6 3 13 6 13s6-7 6-13c0-4-2-7-6-7z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Recupera subito il dente prendendolo ESCLUSIVAMENTE per la corona (la parte bianca visibile), senza mai toccare la radice.',
      'Se è sporco di terra, sciacqualo molto delicatamente per 10 secondi sotto acqua corrente fredda o soluzione fisiologica.',
      'Se possibile, reinserisci delicatamente il dente nel suo alveolo gengivale e fai stringere una garza pulita tra i denti.',
      'Se non puoi reinserirlo, conservalo in un bicchiere di latte fresco intero, soluzione salina sterile, o nella saliva del paziente.',
      'Raggiungi un dentista o un pronto soccorso odontoiatrico entro 60 minuti dal trauma.'
    ],
    donts: [
      'NON toccare o strofinare mai la radice del dente (distruggeresti le cellule del legamento parodontale necessarie al reimpianto).',
      'NON conservare il dente asciutto in un fazzoletto di carta.',
      'NON tentare di reinserire denti da latte nei bambini piccoli (rischi di danneggiare il dente definitivo sottostante).'
    ],
    emergencyCall: 'Contatta d\'urgenza un dentista o recati al Pronto Soccorso Ospedaliero: se reimpiantato entro 30-60 minuti, il dente ha oltre l\'85% di probabilità di attecchire.'
  },
  {
    id: 'chemical_burn',
    title: 'Ustioni Chimiche & Caustici',
    subtitle: 'Acidi, candeggina, soda caustica, solventi',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2v7.31L4.69 18.5A2 2 0 0 0 6.42 21h11.16a2 2 0 0 0 1.73-2.5L14 9.31V2" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Sciacqua IMMEDIATAMENTE la zona colpita con abbondante acqua corrente tiepida o fredda per almeno 20-30 minuti continui.',
      'Se la sostanza è in polvere, spazzolala via delicatamente prima di bagnare con l\'acqua.',
      'Rimuovi con cautela indumenti, scarpe e gioielli contaminati dalla sostanza chimica continuando a irrigare.',
      'Se la sostanza è finita negli occhi, tieni aperte le palpebre e lava continuamente dall\'interno verso l\'esterno dell\'occhio.',
      'Conserva l\'etichetta o il flacone del prodotto per mostrarlo ai soccorritori o al Centro Antiveleni.'
    ],
    donts: [
      'NON tentare di neutralizzare l\'acido con una base o viceversa (la reazione termica esotermica aggraverebbe l\'ustione tissutale).',
      'NON applicare pomate, oli o unguenti sulla ferita chimica.',
      'NON strofinare l\'occhio o la pelle contaminata.'
    ],
    emergencyCall: 'Chiama il 112 e il Centro Antiveleni (es. Niguarda 02 66101029 o Bologna 051 6478955) tenendo a portata di mano il contenitore della sostanza.'
  },
  {
    id: 'jellyfish_sting',
    title: 'Puntura di Medusa & Tracina',
    subtitle: 'Contatto urticante marino e spine velenose',
    iconColor: '#00C7BE',
    iconBg: 'rgba(0, 199, 190, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a8 8 0 0 0-8 8c0 3 2 5 2 7h12c0-2 2-4 2-7a8 8 0 0 0-8-8z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M9 17v5M12 17v5M15 17v5"/>
    </svg>`,
    dos: [
      'PER LA MEDUSA: Sciacqua la parte colpita ESCLUSIVAMENTE con abbondante acqua di mare tiepida (mai acqua dolce).',
      'Rimuovi con delicatezza eventuali tentacoli o residui attaccati alla cute usando il bordo di una carta di credito o una pinzetta.',
      'Applica un gel astringente a base di cloruro d\'alluminio al 5% se disponibile.',
      'PER LA TRACINA (pesce ragno): Immergi subito il piede in acqua molto calda (la massima tollerabile, circa 40-45 °C) per almeno 30-60 minuti: la tossina della tracina è termolabile e si disattiva con il calore.'
    ],
    donts: [
      'NON usare acqua dolce, alcol, aceto o ammoniaca sulla medusa (stimolerebbero le cellule urticanti rimaste a scaricare altro veleno).',
      'NON strofinare con la sabbia o con un asciugamano.',
      'NON mettere ghiaccio sulla puntura di tracina (il freddo prolunga il dolore atroce).'
    ],
    emergencyCall: 'Chiama il 112 se compaiono difficoltà respiratorie, sudorazione profusa, vertigini, nausea o se la vittima manifesta reazione allergica generalizzata.'
  },
  {
    id: 'viper_bite',
    title: 'Morso di Vipera',
    subtitle: 'Due fori distanziati di 6-8 mm, gonfiore',
    iconColor: '#E06C75',
    iconBg: 'rgba(224, 108, 117, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3v4M16 3v4M4 11h16a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`,
    dos: [
      'Fai stendere la persona a terra e falla rimanere ASSOLUTAMENTE immobile: il movimento accelera la circolazione linfatica del veleno.',
      'Mantieni la calma e rassicura la vittima: il veleno di vipera agisce molto lentamente nell\'arco di diverse ore.',
      'Rimuovi subito anelli, bracciali o scarpe dall\'arto colpito prima che sopraggiunga l\'edema.',
      'Lava la ferita delicatamente con acqua e sapone o acqua ossigenata (non con alcol).',
      'Applica una fasciatura compressiva elastica moderata (come per una distorsione) su tutto l\'arto partendo dalla ferita verso la radice.'
    ],
    donts: [
      'NON incidere o tagliare la ferita con lame o bisturi.',
      'NON tentare di succhiare il veleno con la bocca.',
      'NON applicare lacci emostatici arteriosi stretti (rischio di necrosi e gangrena dell\'arto).',
      'NON somministrare siero antiofidico fai-da-te (può causare shock anafilattico fatale, va usato solo in ospedale).'
    ],
    emergencyCall: 'Chiama SUBITO il 112 per il soccorso organizzato (anche elisoccorso se in montagna). Comunica l\'ora del morso e la comparsa di sintomi.'
  },
  {
    id: 'animal_bite',
    title: 'Morso di Cane o Gatto',
    subtitle: 'Rischio infezione profonda e tetano',
    iconColor: '#E5A95C',
    iconBg: 'rgba(229, 169, 92, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.16"/>
      <path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0"/>
    </svg>`,
    dos: [
      'Lava immediatamente e accuratamente la ferita sotto abbondante acqua corrente tiepida e sapone per almeno 10-15 minuti.',
      'Disinfetta a fondo con un disinfettante iodato o clorexidina (i morsi di gatto iniettano batteri come Pasteurella molto in profondità).',
      'Applica una garza sterile e comprimi se è presente sanguinamento.',
      'Verifica la data dell\'ultimo vaccino antitetanico (deve essere stato fatto entro gli ultimi 10 anni, o 5 in caso di ferita a rischio).',
      'Raccogli informazioni sullo stato vaccinale dell\'animale (soprattutto per la rabbia se all\'estero o fauna selvatica).'
    ],
    donts: [
      'NON chiudere la ferita ermeticamente con cerotti a nastro senza aver consultato un medico (rischio ascesso anaerobico profondo).',
      'NON trascurare graffi o morsi apparentemente superficiali di felini.',
      'NON provocare o inseguire l\'animale feritore.'
    ],
    emergencyCall: 'Recati al Pronto Soccorso o dal medico se il morso è profondo, vicino a tendini o articolazioni, sul volto o se l\'animale mostrava comportamenti anomali.'
  },
  {
    id: 'tick_bite',
    title: 'Puntura di Zecca',
    subtitle: 'Rimozione corretta e prevenzione Lyme',
    iconColor: '#30D158',
    iconBg: 'rgba(48, 209, 88, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 7V3M8 12H3M16 12h5M9 16l-3 4M15 16l3 4M9 8L6 4M15 8l3-4"/>
    </svg>`,
    dos: [
      'Usa una pinzetta sottile a punte piatte, afferrando la zecca il più vicino possibile alla superficie della cute.',
      'Tira delicatamente verso l\'alto con un movimento costante e continuo senza strappare o torcere bruscamente.',
      'Disinfetta l\'area cutanea con acqua ossigenata o disinfettante incolore SOLO DOPO aver rimosso la zecca.',
      'Segna sul calendario la data esatta della rimozione.',
      'Osserva la zona per 30-40 giorni: consulta il medico se compare una macchia rossa a cerchio concentrico in espansione (eritema migrante) o febbre.'
    ],
    donts: [
      'NON cospargere MAI la zecca con alcol, olio, acetone, vaselina, smalto o bruciarla con un fiammifero (il soffocamento induce il rigurgito del patogeno Borrelia nel circolo sanguigno).',
      'NON schiacciare il corpo della zecca tra le dita.',
      'NON assumere antibiotici preventivi senza espressa indicazione del medico.'
    ],
    emergencyCall: 'Contatta il tuo Medico di Base o la Guardia Medica se la testa della zecca resta conficcata nella cute o alla comparsa di eritema a bersaglio o febbre.'
  },
  {
    id: 'hyperglycemia',
    title: 'Crisi Iperglicemica',
    subtitle: 'Zuccheri alti nel sangue & chetoacidosi',
    iconColor: '#AF52DE',
    iconBg: 'rgba(175, 82, 222, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-width="2"/>
    </svg>`,
    dos: [
      'Riconosci i segnali: sete insaziabile, minzione frequente, respiro profondo e affannoso con alito fruttato (odore di mela marcia/acetone), sonnolenza.',
      'Se disponibile, esegui subito un controllo della glicemia capillare con il glucometro.',
      'Se la persona è cosciente e orientata, incoraggiala a bere acqua a temperatura ambiente per contrastare la disidratazione.',
      'Se diabetica con piano terapeutico noto, verifica se deve assumere il bolo correttivo di insulina rapida concordato con il diabetologo.'
    ],
    donts: [
      'NON somministrare MAI zucchero, succhi di frutta o dolci se il dubbio è tra ipo e iperglicemia e la glicemia risulta alta (> 250-300 mg/dl).',
      'NON somministrare insulina a una persona che non conosci o senza dosaggio prescritto.',
      'NON dare da bere a una persona confusa, soporosa o priva di sensi.'
    ],
    emergencyCall: 'Chiama il 112 se la glicemia supera i 350-400 mg/dl, se compaiono vomito persistente, stato confusionale, disidratazione severa o perdita di coscienza.'
  },
  {
    id: 'recovery_position',
    title: 'Posizione Laterale (PLS)',
    subtitle: 'Persona incosciente che respira',
    iconColor: '#30D158',
    iconBg: 'rgba(48, 209, 88, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 18h16M4 14h16M4 10h16M4 6h16" stroke-width="2"/>
    </svg>`,
    dos: [
      'Inginocchiati a fianco della persona distesa supina; stendi le sue gambe e togli occhiali o oggetti ingombranti dalle tasche.',
      'Braccio vicino a te: piegalo ad angolo retto con il gomito flesso e il palmo rivolto verso l\'alto.',
      'Braccio opposto: portalo sul petto appoggiando il dorso della sua mano contro la guancia opposta.',
      'Gamba opposta: con l\'altra mano afferra la gamba opposta sopra il ginocchio e piegala sollevando il piede da terra.',
      'Tira il ginocchio piegato verso di te facendola ruotare su un fianco; inclina delicatamente la testa all\'indietro e apri la bocca verso il basso per drenare secrezioni.',
      'Controlla costantemente il respiro ogni minuto.'
    ],
    donts: [
      'NON usare la PLS in caso di trauma cranico, caduta dall\'alto o sospetto danno alla colonna vertebrale a meno che le vie aeree non siano ostruite da vomito.',
      'NON mettere cuscini sotto la testa che fletterebbero il collo in avanti ostruendo la trachea.',
      'NON allontanarti dalla persona.'
    ],
    emergencyCall: 'Chiama subito il 112 non appena hai posizionato la persona in PLS e mantieniti pronto a iniziare il massaggio cardiaco se il respiro dovesse arrestarsi.'
  },
  {
    id: 'first_aid_kit',
    title: 'Kit di Primo Soccorso Ideale',
    subtitle: 'Composizione cassetta domestica e auto',
    iconColor: '#30D158',
    iconBg: 'rgba(48, 209, 88, 0.14)',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" fill="currentColor" fill-opacity="0.16"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M12 11v6M9 14h6"/>
    </svg>`,
    dos: [
      'MATERIALE MEDICAZIONE: Garze sterili (10x10 cm), bende elastiche orlate, cerotti assortiti resistenti all\'acqua, cerotto a nastro in rotolo.',
      'STRUMENTI & PROTEZIONE: Forbici da medicazione con punte arrotondate (tipo Lister), pinzetta sterile per schegge/zecche, 2 paia di guanti monouso in nitrile.',
      'IGIENE & LAVAGGIO: Flaconcini di soluzione fisiologica sterile per lavaggi oculari e ferite, disinfettante incolore non alcolico (clorexidina o iodopovidone).',
      'TERMOTERAPIA: Buste di ghiaccio istantaneo monouso, coperta termica isotermica (oro/argento), termometro digitale.',
      'MANUTENZIONE: Controlla scadenze dei disinfettanti e reintegra il materiale consumato ogni 6 mesi.'
    ],
    donts: [
      'NON conservare la cassetta in luoghi umidi o esposti a sole diretto (es. bagni caldi o cruscotto auto esposto).',
      'NON tenere farmaci soggetti a prescrizione o scaduti all\'interno della cassetta di emergenza comune.',
      'NON chiudere la cassetta con lucchetti o chiavi inaccessibili agli altri membri della famiglia.'
    ],
    emergencyCall: 'Il Kit serve per il primo soccorso rapido: per qualsiasi situazione grave o con perdita di coscienza, chiama subito il 112 prima di agire.'
  }

];

function openFirstAidModal() {
  openModal('firstAidModalOverlay');
  showFirstAidIndex();
}

function showFirstAidIndex() {
  const indexView = document.getElementById('firstAidIndexView');
  const detailView = document.getElementById('firstAidDetailView');
  const searchWrap = document.getElementById('firstAidSearchWrap');
  const headerTitle = document.getElementById('firstAidHeaderTitle');
  const searchInput = document.getElementById('firstAidSearchInput');

  if (indexView) indexView.style.display = 'block';
  if (detailView) detailView.style.display = 'none';
  if (searchWrap) searchWrap.style.display = 'block';
  if (headerTitle) headerTitle.innerText = 'Primo Soccorso';
  if (searchInput) searchInput.value = '';

  renderFirstAidCards(FIRST_AID_DATA);
}

function renderFirstAidCards(items) {
  const grid = document.getElementById('firstAidCardsGrid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--text-secondary); font-size: 13px;">
        Nessuna guida trovata con questa parola chiave.
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="first-aid-card" onclick="openFirstAidDetail('${item.id}')">
      <div>
        <div class="squircle-icon-badge" style="width: 40px; height: 40px; min-width: 40px; border-radius: 12px; background: ${item.iconBg}; color: ${item.iconColor}; border: 1px solid ${item.iconColor}33;">
          ${item.iconSvg}
        </div>
        <div class="first-aid-card-title">${escapeHTML(item.title)}</div>
        <div class="first-aid-card-sub">${escapeHTML(item.subtitle)}</div>
      </div>
      <div style="margin-top: 10px; font-size: 12px; font-weight: 700; color: ${item.iconColor}; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
        <span>Leggi guida</span>
        <span>›</span>
      </div>
    </div>
  `).join('');
}

function filterFirstAidTopics(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderFirstAidCards(FIRST_AID_DATA);
    return;
  }
  const filtered = FIRST_AID_DATA.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.subtitle.toLowerCase().includes(q) ||
    item.dos.some(d => d.toLowerCase().includes(q)) ||
    item.donts.some(d => d.toLowerCase().includes(q))
  );
  renderFirstAidCards(filtered);
}

function openFirstAidDetail(id) {
  const item = FIRST_AID_DATA.find(i => i.id === id);
  if (!item) return;

  const indexView = document.getElementById('firstAidIndexView');
  const detailView = document.getElementById('firstAidDetailView');
  const searchWrap = document.getElementById('firstAidSearchWrap');
  const headerTitle = document.getElementById('firstAidHeaderTitle');
  const detailContent = document.getElementById('firstAidDetailContent');

  if (indexView) indexView.style.display = 'none';
  if (detailView) detailView.style.display = 'block';
  if (searchWrap) searchWrap.style.display = 'none';
  if (headerTitle) headerTitle.innerText = item.title;

  detailContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div class="squircle-icon-badge" style="width: 46px; height: 46px; min-width: 46px; border-radius: 14px; background: ${item.iconBg}; color: ${item.iconColor}; border: 1px solid ${item.iconColor}33;">
        ${item.iconSvg}
      </div>
      <div>
        <div style="font-size: 18px; font-weight: 800; color: var(--text-primary);">${escapeHTML(item.title)}</div>
        <div style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(item.subtitle)}</div>
      </div>
    </div>

    <!-- Blocco 1: Cosa fare subito (Verde soft) -->
    <div class="fa-action-box do">
      <div class="fa-box-title">
        <span>✓</span>
        <span>Cosa fare subito</span>
      </div>
      <div>
        ${item.dos.map((step, idx) => `
          <div class="fa-step-item">
            <span class="fa-step-num">${idx + 1}.</span>
            <span>${escapeHTML(step)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Blocco 2: Cosa NON fare (Corallo soft) -->
    <div class="fa-action-box dont">
      <div class="fa-box-title">
        <span>✕</span>
        <span>Cosa NON fare (Errori comuni)</span>
      </div>
      <div>
        ${item.donts.map(dont => `
          <div class="fa-step-item">
            <span class="fa-step-num" style="color: var(--accent-coral); font-weight: 900;">•</span>
            <span>${escapeHTML(dont)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Blocco 3: Quando chiamare subito il 112 -->
    <div class="fa-action-box emergency">
      <div class="fa-box-title">
        <span>🚨</span>
        <span>Quando chiamare subito il 112</span>
      </div>
      <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1.5;">
        ${escapeHTML(item.emergencyCall)}
      </div>
      <div style="margin-top: 10px;">
        <a href="tel:112" class="emergency-call-pill" style="font-size: 13px; padding: 7px 16px;">
          <span>📞 Chiama 112 Ora</span>
        </a>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 19. "COME TI SENTI OGGI?" (DATABASE RIMEDI, NLP ENGINE & MATCHING)
// ----------------------------------------------------
const FEELING_REMEDIES_DB = [
  {
    id: 'chest_discomfort',
    title: 'Petto & Sterno',
    emoji: '🫀',
    keywords: ['sterno', 'petto', 'torace', 'costole', 'peso petto', 'dolore petto', 'oppressione', 'intercostale'],
    cabinetKeywords: ['tachipirina', 'paracetamolo', 'ibuprofene', 'moment', 'gaviscon', 'maalox', 'riopan'],
    remedies: [
      'Interrompi qualsiasi sforzo fisico e siediti in posizione comoda semiseduta appoggiando la schiena.',
      'Allenta indumenti stretti, colletti o cinture e respira lentamente e profondamente.',
      'Valuta se il dolore peggiora con la tosse, con la pressione delle dita sul costato (tipico dolore muscolo-scheletrico/intercostale) o dopo i pasti (reflusso gastroesofageo).',
      'ATTENZIONE: Se il dolore è oppressivo a morsa, irradia a braccio sinistro, spalla, mandibola o si accompagna a sudorazione fredda, vertigini o fiato corto, chiama subito il 112.'
    ],
    pharmacyNote: 'Non sottovalutare mai i dolori toracici: chiedi sempre consiglio al tuo Medico o al 112 prima di assumere farmaci.'
  },
  {
    id: 'dizziness',
    title: 'Vertigini & Giramenti di Testa',
    emoji: '💫',
    keywords: ['vertigini', 'giramenti', 'testa che gira', 'sbandamento', 'instabilita', 'equilibrio', 'vuoto'],
    cabinetKeywords: ['magnesio', 'potassio', 'polase', 'microser', 'vertiserc', 'tachipirina'],
    remedies: [
      'Siediti o sdraiati immediatamente con gli occhi aperti fissando un punto fermo davanti a te per evitare cadute o svenimenti.',
      'Bevi un abbondante bicchiere d\'acqua con un pizzico di sale o limone: un calo pressorio o disidratazione è tra le cause più frequenti.',
      'Evita cambi repentini di posizione (alzarsi di scatto dal letto o dalla sedia); rialzati sempre lentamente.',
      'Se le vertigini sono legate a cervicale o tensione nucale, applica calore secco sul collo.'
    ],
    pharmacyNote: 'Se accompagnate da nausea intensa, acufeni o febbre, contatta il medico per una valutazione vestibolare o pressoria.'
  },
  {
    id: 'headache',
    title: 'Mal di testa & Emicrania',
    emoji: '🤕',
    keywords: ['testa', 'cefalea', 'emicrania', 'pulsante', 'frontale', 'tempie', 'dolore testa'],
    cabinetKeywords: ['tachipirina', 'paracetamolo', 'ibuprofene', 'moment', 'oki', 'brufen', 'aspirina', 'ketoprofene', 'novalgina', 'voltaren'],
    remedies: [
      'Bevi subito un abbondante bicchiere d\'acqua fresca: la disidratazione è la causa scatenante più comune.',
      'Applica una compressa fresca o ghiaccio avvolto in un panno sulla fronte o alla base del collo.',
      'Fai una pausa di almeno 15-20 minuti lontano da smartphone, monitor e schermi luminosi, preferibilmente al buio o con luce soffusa.',
      'Bevi una tisana tiepida a base di zenzero fresco, melissa o menta piperita per allentare la tensione vascolare.'
    ],
    pharmacyNote: 'Eventuale analgesico o antinfiammatorio da banco (FANS o paracetamolo): chiedi sempre consiglio al farmacista o al medico.'
  },
  {
    id: 'stomach',
    title: 'Stomaco & Acidità / Reflusso',
    emoji: '🍵',
    keywords: ['stomaco', 'nausea', 'acidita', 'acidità', 'reflusso', 'bruciore stomaco', 'digestione', 'pesantezza', 'pirosi', 'gastrite'],
    cabinetKeywords: ['gaviscon', 'maalox', 'biochetasi', 'fermenti', 'pantoprazolo', 'omeprazolo', 'riopan', 'buscopan', 'citrosodina', 'geffer'],
    remedies: [
      'Bevi a piccoli sorsi una tisana tiepida di camomilla, alloro, finocchio o zenzero per calmare gli spasmi gastrici.',
      'Rimani in posizione eretta o semiseduta; evita di sdraiarti subito dopo aver mangiato per contrastare la risalita acida.',
      'Consuma una piccola porzione di cibo asciutto e leggero (es. fette biscottate integrali o cracker senza sale) che assorbe l\'eccesso di succhi gastrici.',
      'Applica una borsa dell\'acqua calda sull\'addome se avverti crampi o tensione da freddo.'
    ],
    pharmacyNote: 'Eventuale antiacido o barriera protettiva da banco (es. alginati o citrati): chiedi consiglio al farmacista.'
  },
  {
    id: 'nausea',
    title: 'Nausea & Conati',
    emoji: '🤢',
    keywords: ['nausea', 'vomito', 'conati', 'stomaco sottosopra', 'senso di vomito', 'disgusto', 'mal d\'auto'],
    cabinetKeywords: ['biochetasi', 'plasil', 'travelgum', 'zenzero', 'geffer', 'peridon'],
    remedies: [
      'Sgranocchia una piccola quantità di zenzero fresco candito o bevi una tisana tiepida allo zenzero e limone.',
      'Evita cibi liquidi abbondanti; preferisci piccoli morsi di pane tostato o grissini secchi.',
      'Respira aria fresca e profonda alla finestra con inspirazioni dal naso ed espirazioni lente dalla bocca.',
      'Applica una leggera digitopressione sul punto P6 (tre dita sotto la piega del polso, al centro dell\'avambraccio).'
    ],
    pharmacyNote: 'Reidratati a piccoli sorsi per prevenire la disidratazione; chiedi consiglio per antiemetici o sali reidratanti.'
  },
  {
    id: 'sore_throat',
    title: 'Mal di gola & Bruciore',
    emoji: '🧣',
    keywords: ['gola', 'bruciore', 'faringe', 'deglutire', 'abbassamento voce', 'laringe', 'placche'],
    cabinetKeywords: ['benagol', 'tantum', 'froben', 'sciroppo', 'borocillina', 'neoborocillina', 'flurbiprofene', 'golamir', 'paracetamolo', 'oki'],
    remedies: [
      'Fai gargarismi con un bicchiere di acqua tiepida e mezzo cucchiaino di sale o bicarbonato 3 volte al giorno.',
      'Consuma un cucchiaino di miele (preferibilmente eucalipto o timo) sciolto in acqua tiepida o tisana lenitiva.',
      'Mantieni idratata la mucosa bevendo liquidi a temperatura ambiente ed evitando bevande troppo calde o gassate.',
      'Usa un umidificatore o posiziona vaschette d\'acqua sui termosifoni per evitare che l\'aria secca irriti ulteriormente la faringe.'
    ],
    pharmacyNote: 'Eventuale spray o pastiglie lenitive da banco a base di flurbiprofene o propoli: chiedi consiglio al farmacista.'
  },
  {
    id: 'fever',
    title: 'Febbre & Brividi',
    emoji: '🌡️',
    keywords: ['febbre', 'temperatura', 'brividi', 'caldo', 'alterazione', 'linee', 'termometro', 'febbre alta'],
    cabinetKeywords: ['tachipirina', 'paracetamolo', 'efferalgan', 'aspirina', 'ibuprofene', 'termo', 'termometro'],
    remedies: [
      'Riposa completamente a letto in un ambiente ben aerato con temperatura intorno ai 20 °C.',
      'Bevi abbondanti liquidi (acqua, spremute d\'arancia, brodo vegetale leggero o tisane) per prevenire la disidratazione da sudorazione.',
      'Indossa abiti leggeri in cotone traspirante: coprirsi eccessivamente intrappola il calore corporeo.',
      'Applica spugnature di acqua tiepida (non ghiacciata) su fronte, tempie e polsi se la temperatura causa fastidio elevato.'
    ],
    pharmacyNote: 'Eventuale antipiretico da banco (preferibilmente paracetamolo a dosaggio adeguato al peso): chiedi consiglio al farmacista.'
  },
  {
    id: 'fatigue',
    title: 'Stanchezza & Spostatezza',
    emoji: '⚡',
    keywords: ['stanchezza', 'astenia', 'spossatezza', 'sonnolenza', 'energie', 'affaticamento', 'fiacchezza', 'debilitato'],
    cabinetKeywords: ['magnesio', 'potassio', 'supradyn', 'polase', 'vitamina', 'carnitina', 'multivitaminico', 'b12', 'ferro'],
    remedies: [
      'Reidrata l\'organismo con un bicchiere d\'acqua con spremuta di mezzo limone per un apporto immediato di minerali ed elettroliti.',
      'Fai una camminata all\'aria aperta di 15 minuti alla luce del sole per stimolare la produzione naturale di serotonina e vitamina D.',
      'Consuma un piccolo snack nutriente a base di frutta fresca e una manciata di mandorle o noci ricche di magnesio.',
      'Pianifica una sessione di riposo rigenerante (power nap) di non più di 20 minuti nel primo pomeriggio.'
    ],
    pharmacyNote: 'Eventuale integratore di magnesio, potassio o vitamine del gruppo B per colmare carenze nutrizionali stagionali.'
  },
  {
    id: 'insomnia',
    title: 'Insonnia & Difficoltà a Dormire',
    emoji: '🌙',
    keywords: ['insonnia', 'sonno', 'dormire', 'risvegli', 'notte', 'agitazione', 'agitato', 'non dormo', 'veglia'],
    cabinetKeywords: ['melatonina', 'valeriana', 'sedivitax', 'passiflora', 'biancospino', 'magnesio', 'armonia', 'novanight'],
    remedies: [
      'Spegni smartphone, tablet e schermi TV almeno 45 minuti prima di coricarti per consentire il picco naturale di melatonina.',
      'Bevi una tisana rilassante a base di camomilla, tiglio, passiflora, melissa o valeriana a temperatura tiepida.',
      'Mantieni la camera da letto buia, silenziosa e fresca (temperatura ideale 18-19 °C).',
      'Pratica 5 minuti di respirazione guidata (es. tecnica 4-7-8: inspira per 4 sec, trattieni per 7 sec, espira per 8 sec).'
    ],
    pharmacyNote: 'Eventuale integratore di melatonina pura o fitoterapici da banco: chiedi consiglio sui corretti orari di assunzione.'
  },
  {
    id: 'cold',
    title: 'Raffreddore & Naso Chiuso',
    emoji: '🤧',
    keywords: ['raffreddore', 'naso', 'mucose', 'starnuti', 'catarro', 'congestione', 'chiuso', 'muco', 'scolo'],
    cabinetKeywords: ['rinazina', 'actifed', 'fluimucil', 'fisiologica', 'aerosol', 'paracetamolo', 'zerinol', 'vichy', 'narhinel'],
    remedies: [
      'Esegui lavaggi nasali frequenti con soluzione fisiologica o ipertonica sterile per liberare le cavità nasali e rimuovere il muco in eccesso.',
      'Fai suffumigi (fumenti) con vapore caldo e poche gocce di olio essenziale di eucalipto, menta o tea tree oil.',
      'Dormi con un cuscino extra sotto la testa per mantenere sollevate le vie respiratorie e facilitare il drenaggio durante la notte.',
      'Bevi tisane calde con limone e miele per fluidificare le secrezioni.'
    ],
    pharmacyNote: 'Spray nasale salino o decongestionante da banco (da non usare per più di 4-5 giorni consecutivi): chiedi consiglio al farmacista.'
  },
  {
    id: 'cough_dry',
    title: 'Tosse Secca & Stizzosa',
    emoji: '💨',
    keywords: ['tosse secca', 'tosse stizzosa', 'prurito gola', 'colpi di tosse', 'tosse notturna', 'tossetta'],
    cabinetKeywords: ['bisolvon', 'sekisan', 'grintuss', 'sinecod', 'sciroppo tosse', 'miele', 'flurbiprofene'],
    remedies: [
      'Assumi un cucchiaio di miele puro (o sciolto in latte/tisana tiepida): forma un film protettivo sulla mucosa faringea.',
      'Idratati costantemente a piccoli sorsi per evitare la secchezza dell\'albero bronchiale.',
      'Umidifica l\'aria della stanza ed evita sbalzi di temperatura e fumo passivo.',
      'Fai inalazioni con soluzione fisiologica sterile tramite nebulizzatore o aerosol.'
    ],
    pharmacyNote: 'Eventuale sciroppo sedativo della tosse da banco o a base di piantaggine e altea: chiedi consiglio al farmacista.'
  },
  {
    id: 'cough_productive',
    title: 'Tosse Grassa & Catarro',
    emoji: '🫁',
    keywords: ['tosse grassa', 'catarro', 'bronchi', 'espettorato', 'muco petto', 'tosse con catarro'],
    cabinetKeywords: ['fluimucil', 'bronchenolo', 'fluifort', 'bisolvon', 'acetylcisteina', 'sciroppo', 'aerosol'],
    remedies: [
      'Bevi almeno 2 litri d\'acqua al giorno: la corretta idratazione è il miglior fluidificante naturale per il muco bronchiale.',
      'Fai fumenti caldi con bicarbonato o lavaggi nasali profondi per favorire l\'espettorazione naturale.',
      'Non sopprimere la tosse grassa: è un meccanismo difensivo fisiologico per liberare le vie aeree.',
      'Mantieni una posizione leggermente inclinata durante il sonno.'
    ],
    pharmacyNote: 'Eventuale mucolitico o fluidificante da banco (es. N-acetilcisteina o carbocisteina): chiedi consiglio al farmacista.'
  },
  {
    id: 'neck_pain',
    title: 'Cervicale & Collo Bloccato',
    emoji: '💆',
    keywords: ['cervicale', 'collo', 'spalle', 'trapezio', 'rigidita', 'rigidità', 'torcicollo', 'dolore collo'],
    cabinetKeywords: ['voltaren', 'flector', 'arnica', 'fasce', 'termoriscaldanti', 'thermacare', 'oki', 'ibuprofene', 'muscoril', 'artrosilene'],
    remedies: [
      'Applica calore secco sulla zona cervicale (cuscino con noccioli di ciliegio, borsa dell\'acqua calda o fascia termica) per decontrarre la muscolatura.',
      'Esegui movimenti lenti e controllati di flessione ed estensione del capo, senza scatti e fermandoti alla soglia del dolore.',
      'Regola l\'altezza dello schermo del computer in modo che il terzo superiore sia esattamente all\'altezza dei tuoi occhi.',
      'Fai un automassaggio delicato con olio d\'arnica o di iperico lungo la fascia dei trapezi e alla base della nuca.'
    ],
    pharmacyNote: 'Cerotto autoriscaldante o gel antinfiammatorio locale da banco: chiedi consiglio al farmacista.'
  },
  {
    id: 'back_pain',
    title: 'Mal di Schiena & Lombalgia',
    emoji: '🧍',
    keywords: ['schiena', 'lombare', 'lombalgia', 'colpo della strega', 'remi', 'dolore schiena', 'rachide'],
    cabinetKeywords: ['voltaren', 'flector', 'dicloreum', 'oki', 'brufen', 'ibuprofene', 'thermacare', 'arnica', 'artrosilene'],
    remedies: [
      'Riposa in posizione antalgica (es. sdraiato sul fianco con cuscino tra le ginocchia o supino con cuscini sotto le ginocchia).',
      'Applica impacchi caldi locali per sciogliere le contratture paravertebrali dopo la fase acuta iniziale.',
      'Evita il riposo a letto prolungato oltre le 48 ore: fare brevi camminate su terreno piano aiuta il recupero.',
      'Evita di sollevare carichi pesanti e piegati sempre flettendo le ginocchia e non la schiena.'
    ],
    pharmacyNote: 'Eventuale antinfiammatorio FANS topico o sistemico da banco: chiedi consiglio al medico o al farmacista.'
  },
  {
    id: 'anxiety',
    title: 'Ansia, Tachicardia & Tensione',
    emoji: '🧘',
    keywords: ['ansia', 'stress', 'panico', 'tachicardia', 'agitazione', 'tensione', 'nervosismo', 'palpitazioni', 'batticuore'],
    cabinetKeywords: ['valeriana', 'passiflora', 'biancospino', 'magnesio', 'rescue', 'sedivitax', 'ansiolitico'],
    remedies: [
      'Siediti comodo e appoggia una mano sulla pancia: esegui respirazioni diaframmatiche lente e profonde (inspira per 4 sec, espira per 6 sec).',
      'Bevi un bicchiere d\'acqua fresca a piccoli sorsi e rinfresca polsi e nuca con acqua corrente per attivare il nervo vago.',
      'Fai una pausa da ambienti rumorosi o compiti complessi per 10 minuti camminando con passo calmo.',
      'Bevi una tisana di melissa, biancospino o lavanda, piante note per il supporto al rilassamento e al benessere mentale.'
    ],
    pharmacyNote: 'Preparati fitoterapici o magnesio biodisponibile: chiedi consiglio per gestire picchi di stress passeggeri.'
  },
  {
    id: 'muscle_pain',
    title: 'Dolori Muscolari & Contratture',
    emoji: '🏃',
    keywords: ['muscolo', 'muscoli', 'contrattura', 'strappo', 'indolenzimento', 'gambe', 'polpacci', 'crampi'],
    cabinetKeywords: ['arnica', 'voltaren', 'flector', 'dicloreum', 'oki', 'ibuprofene', 'magnesio', 'fastum', 'artrosilene'],
    remedies: [
      'Riposa il gruppo muscolare dolente evitando sforzi, sollevamento pesi o movimenti bruschi.',
      'Se il dolore è acuto da trauma recente (prime 24h), applica ghiaccio protetto; se è una contrattura, applica impacchi caldi.',
      'Bevi abbondante acqua e assumi cibi ricchi di potassio e magnesio (come banane, mandorle e spinaci).',
      'Esegui stretching leggerissimo e progressivo senza mai forzare la contrazione del muscolo infiammato.'
    ],
    pharmacyNote: 'Gel o cerotto antinfiammatorio a base di FANS o estratto d\'arnica pura: chiedi consiglio al farmacista.'
  },
  {
    id: 'allergy_seasonal',
    title: 'Allergia Stagionale & Rinite',
    emoji: '🌸',
    keywords: ['allergia', 'pollini', 'occhi rossi', 'starnuto', 'prurito', 'graminacee', 'rinite', 'istamina'],
    cabinetKeywords: ['antistaminico', 'cetirizina', 'loratadina', 'ebastina', 'collirio', 'flixonase', 'fexofenadina'],
    remedies: [
      'Sciacqua viso e occhi con acqua fredda dopo essere rientrato dall\'esterno per eliminare i pollini depositati sulla cute e sulle ciglia.',
      'Usa gocce oculari rinfrescanti a base di eufrasia o camomilla o soluzione salina sterile monodose per detergere la congiuntiva.',
      'Cambia gli abiti usati all\'aperto e lavati i capelli prima di coricarti per non impollinare il cuscino.',
      'Tieni chiuse le finestre nelle ore più calde e ventose della giornata, quando la concentrazione di pollini nell\'aria è massima.'
    ],
    pharmacyNote: 'Eventuale antistaminico orale o spray nasale prescritto: chiedi indicazione al medico curante o al farmacista.'
  },
  {
    id: 'eye_irritation',
    title: 'Occhi Rossi & Congiuntivite',
    emoji: '👁️',
    keywords: ['occhi', 'occhio', 'congiuntivite', 'bruciore occhi', 'occhi rossi', 'lacrimazione', 'secchezza oculare', 'sabbia occhi'],
    cabinetKeywords: ['collirio', 'lacrime', 'artificiali', 'iridina', 'eufrasia', 'tobral', 'pensulvit', 'fisiologica'],
    remedies: [
      'Instilla gocce di soluzione salina sterile o lacrime artificiali a base di acido ialuronico ed eufrasia per rinfrescare e detergere il film lacrimale.',
      'Applica impacchi freddi con garze sterili imbevute di camomilla o tè nero tiepido sugli occhi chiusi per 10 minuti.',
      'Sospendi immediatamente l\'uso delle lenti a contatto fino alla completa risoluzione dell\'irritazione.',
      'Evita di strofinare gli occhi con le mani per non diffondere batteri o provocare micro-abrasioni corneali.'
    ],
    pharmacyNote: 'Collirio lenitivo o decongestionante da banco; se presente secrezione giallastra purulenta, consulta il medico.'
  },
  {
    id: 'ear_pain',
    title: 'Mal d\'Orecchio & Otite',
    emoji: '👂',
    keywords: ['orecchio', 'orecchi', 'otite', 'dolore orecchio', 'fitta orecchio', 'tappato', 'acufene', 'cerume'],
    cabinetKeywords: ['otopax', 'gocce orecchio', 'paracetamolo', 'tachipirina', 'ibuprofene', 'cerulisina', 'anauran'],
    remedies: [
      'Mantieni l\'orecchio rigorosamente asciutto evitando infiltrazioni d\'acqua durante la doccia.',
      'Applica un panno caldo e asciutto contro l\'orecchio per alleviare la tensione dolorosa con il calore.',
      'Dormi con la testa leggermente sollevata per ridurre la pressione nell\'orecchio medio.',
      'Non inserire cotton fioc o oggetti nel condotto uditivo.'
    ],
    pharmacyNote: 'Paracetamolo o ibuprofene per lenire il dolore; contatta il medico o l\'otorino per valutare la membrana timpanica.'
  },
  {
    id: 'low_blood_pressure',
    title: 'Pressione Bassa & Calo Pressorio',
    emoji: '📉',
    keywords: ['pressione bassa', 'ipotensione', 'calo pressorio', 'vista annebbiata', 'debolezza improvvisa', 'mancamento'],
    cabinetKeywords: ['polase', 'magnesio', 'potassio', 'liquorizia', 'carnitina', 'pressione'],
    remedies: [
      'Sdraiati immediatamente con le gambe sollevate a 45 gradi su un cuscino (posizione trendelenburg) per favorire il ritorno venoso al cervello.',
      'Bevi un abbondante bicchiere d\'acqua con un pizzico di sale o mastica un bastoncino di pura liquirizia.',
      'Evita bagni o docce troppo calde che provocano vasodilatazione periferica immediata.',
      'Fai movimenti di pompaggio delle caviglie e contrai i polpacci prima di rialzarti in piedi.'
    ],
    pharmacyNote: 'Integratori idrosalini con magnesio e potassio: chiedi consiglio al farmacista per i periodi estivi caldi.'
  },
  {
    id: 'cystitis',
    title: 'Cistite & Bruciore Urinario',
    emoji: '💧',
    keywords: ['cistite', 'bruciore pipi', 'urina', 'vescica', 'minzione frequente', 'pesantezza basso ventre'],
    cabinetKeywords: ['monuril', 'd-mannosio', 'cistiflux', 'mirtillo', 'fermenti', 'buscopan', 'tachipirina'],
    remedies: [
      'Bevi subito grandi quantità d\'acqua (almeno 2-2.5 litri distribuiti nella giornata) per diluire e drenare i batteri dalla vescica.',
      'Assumi integratori naturali a base di D-Mannosio e mirtillo rosso americano (Cranberry) che impediscono l\'adesione di E. coli.',
      'Evita cibi piccanti, alcolici, caffè, cioccolato e spezie che irritano l\'urotelio vescicale.',
      'Usa detergenti intimi delicati a pH fisiologico e indossa biancheria intima in puro cotone traspirante.'
    ],
    pharmacyNote: 'Se i sintomi persistono con febbre o dolore ai reni, contatta subito il medico per un\'urinocoltura e terapia mirata.'
  },
  {
    id: 'diarrhea',
    title: 'Diarrea & Disturbi Intestinali',
    emoji: '🚽',
    keywords: ['diarrea', 'scariche', 'dissenteria', 'crampi pancia', 'virus intestinale', 'gastroenterite'],
    cabinetKeywords: ['imodium', 'dissenten', 'fermenti', 'enterogermina', 'yovis', 'codex', 'idravita', 'biochetasi'],
    remedies: [
      'Reidrata costantemente l\'organismo bevendo a piccoli sorsi soluzioni reidratanti orali, tè leggero con limone o brodo vegetale.',
      'Assumi fermenti lattici probiotici vivi ad alta concentrazione per ricolonizzare la flora batterica intestinale compromessa.',
      'Segui una dieta astringente: riso bollito con la sua acqua di cottura, carote lesse, mela grattugiata, banane e fette biscottate.',
      'Evita latte, latticini, cibi grassi, fritti e bevande fredde o zuccherate.'
    ],
    pharmacyNote: 'Soluzioni elettrolitiche reidratanti e probiotici: chiedi consiglio al farmacista prima di assumere bloccanti della motilità.'
  },
  {
    id: 'constipation',
    title: 'Stitichezza & Intestino Pigro',
    emoji: '🌾',
    keywords: ['stitichezza', 'stipsi', 'intestino pigro', 'gonfiore', 'evacuazione difficile', 'stitico'],
    cabinetKeywords: ['lattulosio', 'macrogol', 'supposte glicerina', 'microclismi', 'psillio', 'magnesio', 'lassativo'],
    remedies: [
      'Bevi un bicchiere di acqua tiepida a digiuno al mattino appena sveglio per stimolare il riflesso gastrocolico.',
      'Aumenta l\'apporto di fibre solubili nella dieta (semi di lino, kiwi maturi, prugne secche ammollate, crusca d\'avena).',
      'Cammina per almeno 20-30 minuti al giorno per promuovere la peristalsi intestinale naturale.',
      'Massaggia delicatamente l\'addome con movimenti circolari in senso orario attorno all\'ombelico.'
    ],
    pharmacyNote: 'Integratori di fibre di psillio o osmotici delicati (macrogol): chiedi consiglio al farmacista evitando lassativi irritanti.'
  },
  {
    id: 'insect_bite',
    title: 'Puntura di Zanzara o Insetto',
    emoji: '🦟',
    keywords: ['zanzara', 'puntura insetto', 'vespa', 'ape', 'ponfo', 'prurito puntura', 'gonfiore puntura'],
    cabinetKeywords: ['polaramin', 'after-bite', 'arnica', 'cortisone', 'lenitivo', 'ammoniaca', 'fenistil'],
    remedies: [
      'Applica subito un cubetto di ghiaccio protetto da un fazzoletto sul punto della puntura per 10 minuti per placare prurito e gonfiore.',
      'Lava delicatamente la zona con acqua fredda e sapone neutro senza strofinare.',
      'Applica una noce di gel d\'aloe vera pura, crema all\'arnica o un roll-on lenitivo.',
      'Evita di grattare il ponfo con le unghie per non provocare sovrainfezioni batteriche cutanee.'
    ],
    pharmacyNote: 'Gel antistaminico o crema idrocortisone a basso dosaggio da banco per prurito intenso: chiedi consiglio al farmacista.'
  },
  {
    id: 'sunburn',
    title: 'Scottatura Solare & Eritema',
    emoji: '☀️',
    keywords: ['scottatura solare', 'eritema', 'bruciatura sole', 'pelle rossa', 'ustione sole', 'doposole'],
    cabinetKeywords: ['doposole', 'foille', 'connettivina', 'aloe', 'pantene', 'bepanthenol'],
    remedies: [
      'Fai impacchi freschi con teli morbidi bagnati in acqua fredda per estrarre il calore dalla pelle infiammata.',
      'Applica generose dosi di gel purissimo di aloe vera o creme a base di acido ialuronico ed estratti di calendula.',
      'Bevi abbondante acqua per reidratare la cute dall\'interno.',
      'Indossa abiti morbidissimi e larghi in cotone naturale evitando sfregamenti e non esporti nuovamente al sole fino a completa guarigione.'
    ],
    pharmacyNote: 'Creme rigeneranti con acido ialuronico o emulsioni lenitive specifiche: chiedi consiglio al farmacista.'
  },
  {
    id: 'canker_sore',
    title: 'Afte & Afte in Bocca',
    emoji: '👄',
    keywords: ['afta', 'afte', 'bocca', 'lingua', 'bruciore bocca', 'gengive', 'ferite bocca', 'ulcere bocca'],
    cabinetKeywords: ['aftamed', 'alovex', 'curasept', 'collutorio', 'buccogel', 'tachipirina'],
    remedies: [
      'Applica un gel protettivo bioadesivo specifico per afte a base di acido ialuronico che isola la lesione dal cibo e dai liquidi.',
      'Fai sciacqui con acqua tiepida e mezzo cucchiaino di sale o bicarbonato dopo ogni pasto.',
      'Evita temporaneamente cibi acidi, piccanti, salati, agrumi, pomodori crudi, frutta secca o croste dure.',
      'Mantieni un\'igiene orale impeccabile usando uno spazzolino a setole ultra-morbide.'
    ],
    pharmacyNote: 'Spray o gel orali barriera con acido ialuronico ad alto peso molecolare: chiedi consiglio al farmacista.'
  }
];

let _currentActiveFeelingSymptom = null;

function normalizeFeelingText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFeelingQuery(queryText) {
  const norm = normalizeFeelingText(queryText);
  if (!norm) return { matches: [], isRedFlag: false, queryText: '' };

  // Controllo Red Flag di Sicurezza (Dolore toracico + vertigini/fiato corto/svenimento o dolore improvviso acuto)
  const hasChest = /(sterno|petto|torace|cuore|braccio sinistro|cardiaco|costato)/i.test(norm);
  const hasDizzinessOrBreath = /(vertigin|girament|gira la testa|fiato|respiro|mancanza d aria|sveniment|svenuto|sudor|sudorazion)/i.test(norm);
  const hasSuddenSevere = /(forte|acuto|improvviso|atroce|morsa|schiaccia|oppressivo|collasso)/i.test(norm);
  const isRedFlag = (hasChest && (hasDizzinessOrBreath || hasSuddenSevere)) || (hasChest && norm.includes('male'));

  const matched = [];
  FEELING_REMEDIES_DB.forEach(topic => {
    const normTitle = normalizeFeelingText(topic.title);
    if (norm.includes(normTitle)) {
      matched.push(topic);
      return;
    }
    const hit = topic.keywords.some(kw => {
      const normKw = normalizeFeelingText(kw);
      if (normKw.length <= 3) {
        const re = new RegExp('\\b' + normKw + '\\b', 'i');
        return re.test(norm);
      }
      return norm.includes(normKw);
    });
    if (hit) {
      matched.push(topic);
    }
  });

  return {
    matches: matched,
    isRedFlag,
    queryText: queryText.trim()
  };
}

function handleFeelingSearch(query) {
  if (!query || !query.trim()) return;
  const parsed = parseFeelingQuery(query);

  if (parsed.matches.length === 1 && !parsed.isRedFlag) {
    // Singolo disturbo trovato, apri direttamente la vista del disturbo
    openSymptomRemedyDetail(parsed.matches[0].id, parsed.queryText);
  } else if (parsed.matches.length > 1 || parsed.isRedFlag) {
    // Multi-sintomo o allerta red flag: apri vista combinata ricca
    openMultiFeelingModal(parsed);
  } else {
    // Nessuna corrispondenza esatta, apri fallback informativo personalizzato
    openCustomSymptomDetail(query.trim());
  }
}

function openMultiFeelingModal(parsed) {
  const activeProfile = getActiveProfileId();
  const allCabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const profileCabinet = allCabinet.filter(c => !c.profileId || c.profileId === activeProfile);
  const todayIso = new Date().toISOString().split('T')[0];

  // Raccogli tutte le keyword dell'armadietto di tutti i sintomi riconosciuti
  const allCabinetKeywords = [];
  parsed.matches.forEach(m => {
    (m.cabinetKeywords || []).forEach(k => {
      if (!allCabinetKeywords.includes(k.toLowerCase())) allCabinetKeywords.push(k.toLowerCase());
    });
  });

  const matchedCabinetMeds = profileCabinet.filter(item => {
    const name = (item.name || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return allCabinetKeywords.some(k => name.includes(k) || notes.includes(k) || cat.includes(k));
  });

  _currentActiveFeelingSymptom = {
    title: parsed.queryText,
    isMulti: true,
    isRedFlag: parsed.isRedFlag,
    matches: parsed.matches,
    cabinetMatches: matchedCabinetMeds,
    queryText: parsed.queryText
  };

  renderMultiFeelingModal();
  openModal('feelingRemedyModalOverlay');
}

function renderMultiFeelingModal() {
  const data = _currentActiveFeelingSymptom;
  if (!data) return;

  const emojiEl = document.getElementById('feelingModalEmoji');
  const titleEl = document.getElementById('feelingModalTitle');
  const modalContent = document.getElementById('feelingModalContent');

  if (emojiEl) emojiEl.innerText = data.isRedFlag ? '🚨' : '✨';
  if (titleEl) titleEl.innerText = 'Analisi Sintomi';

  let html = '';

  // 1. Allerta Red Flag se presente
  if (data.isRedFlag) {
    html += `
      <div class="glass-card" style="padding: 14px 16px; background: rgba(255, 45, 85, 0.12); border: 1.5px solid var(--accent-coral);">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 24px;">🚨</span>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: var(--accent-coral); margin-bottom: 4px;">Sintomi che richiedono attenzione immediata</div>
            <div style="font-size: 12px; color: var(--text-primary); line-height: 1.45; margin-bottom: 10px;">
              Il dolore al petto/sterno o la comparsa improvvisa di vertigini, fiato corto o sudorazione fredda possono essere segnali di un'emergenza cardiaca o vascolare. Non attendere che passi da solo.
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="tel:112" class="emergency-call-pill" style="padding: 6px 14px; font-size: 13px; font-weight: 800;">
                📞 Chiama 112 Ora
              </a>
              <button onclick="closeAllModals(); openDoctorModal();" class="btn-secondary-sm" style="padding: 6px 12px; font-size: 12px;">
                Chiama Medico di Base ›
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Sintomi Riconosciuti dalla frase
  if (data.matches && data.matches.length > 0) {
    html += `
      <div class="glass-card" style="padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent-teal); letter-spacing: 0.5px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>🔍</span>
          <span>DISTURBI RICONOSCIUTI NELLA TUA FRASE (${data.matches.length})</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${data.matches.map(item => `
            <div style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-card); border: 1px solid var(--border-glass);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 18px;">${item.emoji}</span>
                  <strong style="font-size: 13px; color: var(--text-primary);">${escapeHTML(item.title)}</strong>
                </div>
                <button onclick="openSymptomRemedyDetail('${item.id}', '${escapeHTML(data.queryText)}')" class="btn-secondary-sm" style="font-size: 11px; padding: 3px 8px;">
                  Dettagli ›
                </button>
              </div>
              <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: var(--text-secondary); line-height: 1.45;">
                ${item.remedies.slice(0, 2).map(r => `<li>${escapeHTML(r)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 3. Riscontro in Armadietto per i disturbi trovati
  const meds = data.cabinetMatches || [];
  const todayIso = new Date().toISOString().split('T')[0];
  html += `
    <div class="glass-card" style="padding: 14px 16px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent-amber); letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>💊</span>
          <span>NEL TUO ARMADIETTO (${meds.length})</span>
        </div>
        <button onclick="closeAllModals(); openCabinetView();" class="btn-secondary-sm" style="font-size: 10px; padding: 2px 6px;">Apri Armadietto ›</button>
      </div>
      ${meds.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${meds.map(med => {
            const isExpired = med.expiryDate && med.expiryDate < todayIso;
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-card); border: 1px solid ${isExpired ? 'rgba(224, 108, 117, 0.4)' : 'var(--border-glass)'};">
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: ${isExpired ? 'var(--accent-coral)' : 'var(--text-primary)'}; display: flex; align-items: center; gap: 6px;">
                    <span>${escapeHTML(med.name)}</span>
                    ${isExpired ? '<span style="font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px; background: rgba(224, 108, 117, 0.2); color: var(--accent-coral);">SCADUTO</span>' : ''}
                  </div>
                  <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                    Q.tà: ${escapeHTML(med.quantity || 'Disponibile')} · Scadenza: ${med.expiryDate || 'Non indicata'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
          Nessun farmaco corrispondente per questi disturbi salvato nel tuo armadietto.
        </div>
      `}
    </div>
  `;

  // 4. Bottone Annota nel Diario
  html += `
    <div class="feeling-diary-card">
      <div class="feeling-diary-header-text">
        <div class="feeling-diary-card-title">Annota nel Diario della Salute</div>
        <div class="feeling-diary-card-subtitle">Salva questa descrizione nella tua cronologia con data e ora</div>
      </div>
      <button id="btnSaveFeelingToDiary" type="button" class="feeling-diary-cta-btn" onclick="saveFeelingSymptomToDiary('${escapeHTML(data.queryText)}')">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span>Annota nel diario della salute</span>
      </button>
    </div>
    <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; text-align: center; padding: 4px 10px 10px 10px; opacity: 0.7; margin-top: 4px;">
      ℹ️ Suggerimenti generali a scopo informativo. Non sostituiscono il parere del medico o del farmacista.
    </div>
  `;

  if (modalContent) {
    modalContent.innerHTML = html;
  }
}

function openSymptomRemedyDetail(symptomId, originalQuery) {
  const item = FEELING_REMEDIES_DB.find(s => s.id === symptomId);
  if (!item) return;

  _currentActiveFeelingSymptom = {
    title: item.title,
    emoji: item.emoji,
    remedies: item.remedies,
    pharmacyNote: item.pharmacyNote,
    cabinetKeywords: item.cabinetKeywords,
    originalQuery: originalQuery || item.title
  };

  renderSingleFeelingModal();
  openModal('feelingRemedyModalOverlay');
}

function openCustomSymptomDetail(customTitle) {
  _currentActiveFeelingSymptom = {
    title: customTitle,
    emoji: '🌿',
    remedies: [
      'Bevi abbondante acqua a piccoli sorsi per favorire la corretta idratazione cellulare.',
      'Fai una pausa in un ambiente tranquillo, allentando indumenti stretti e riposando per almeno 15 minuti.',
      'Consuma alimenti leggeri e facilmente digeribili a temperatura ambiente.',
      'Se il disturbo è accompagnato da dolore localizzato, mantieni a riposo la parte interessata.'
    ],
    pharmacyNote: 'Per una valutazione specifica e un rimedio mirato, consulta sempre il tuo Medico di Base o chiedi consiglio al farmacista.',
    cabinetKeywords: ['tachipirina', 'paracetamolo', 'ibuprofene', 'arnica', 'moment'],
    originalQuery: customTitle
  };

  renderSingleFeelingModal();
  openModal('feelingRemedyModalOverlay');
}

function renderSingleFeelingModal() {
  if (!_currentActiveFeelingSymptom) return;
  const data = _currentActiveFeelingSymptom;

  const emojiEl = document.getElementById('feelingModalEmoji');
  const titleEl = document.getElementById('feelingModalTitle');
  const modalContent = document.getElementById('feelingModalContent');

  if (emojiEl) emojiEl.innerText = data.emoji || '🌿';
  if (titleEl) titleEl.innerText = data.title;

  const activeProfile = getActiveProfileId();
  const allCabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const profileCabinet = allCabinet.filter(c => !c.profileId || c.profileId === activeProfile);
  const keywords = data.cabinetKeywords || [];
  const todayIso = new Date().toISOString().split('T')[0];

  const matched = profileCabinet.filter(item => {
    const name = (item.name || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const symptomTitle = (data.title || '').toLowerCase();

    const matchCat = cat && (
      (symptomTitle.includes('testa') && cat.includes('testa')) ||
      (symptomTitle.includes('gola') && cat.includes('gola')) ||
      (symptomTitle.includes('febbre') && cat.includes('febbre')) ||
      (symptomTitle.includes('stomaco') && cat.includes('stomaco')) ||
      (symptomTitle.includes('cervicale') && (cat.includes('dolori') || cat.includes('testa'))) ||
      (symptomTitle.includes('muscol') && cat.includes('dolori')) ||
      (symptomTitle.includes('allergia') && cat.includes('allergie')) ||
      (symptomTitle.includes('stanchezza') && cat.includes('integratori')) ||
      (symptomTitle.includes('insonnia') && (cat.includes('integratori') || cat.includes('generale'))) ||
      (symptomTitle.includes('raffreddore') && cat.includes('respiro')) ||
      (symptomTitle.includes('petto') && cat.includes('generale'))
    );

    return matchCat || keywords.some(k => name.includes(k) || notes.includes(k));
  });

  let html = `
    <!-- Sezione A: Rimedi Naturali & Azioni Pratiche -->
    <div class="glass-card" style="padding: 14px 16px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent-teal); letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>🍃</span>
        <span>RIMEDI NATURALI & AZIONI PRATICHE</span>
      </div>
      <ul id="feelingRemediesList" style="margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-primary); line-height: 1.5; display: flex; flex-direction: column; gap: 6px;">
        ${data.remedies.map(r => `<li>${escapeHTML(r)}</li>`).join('')}
      </ul>
      ${data.pharmacyNote ? `<div id="feelingPharmacyNote" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-secondary); font-style: italic;">${escapeHTML(data.pharmacyNote)}</div>` : ''}
    </div>

    <!-- Sezione B: Nel tuo Armadietto -->
    <div class="glass-card" style="padding: 14px 16px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent-amber); letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>💊</span>
          <span>NEL TUO ARMADIETTO (${matched.length})</span>
        </div>
        <button onclick="closeAllModals(); openCabinetView();" class="btn-secondary-sm" style="font-size: 10px; padding: 2px 6px;">Vedi tutto ›</button>
      </div>
      <div id="feelingCabinetMatchList">
        ${matched.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${matched.map(med => {
              const isExpired = med.expiryDate && med.expiryDate < todayIso;
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-card); border: 1px solid ${isExpired ? 'rgba(224, 108, 117, 0.4)' : 'var(--border-glass)'};">
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: ${isExpired ? 'var(--accent-coral)' : 'var(--text-primary)'}; display: flex; align-items: center; gap: 6px;">
                      <span>${escapeHTML(med.name)}</span>
                      ${isExpired ? '<span style="font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px; background: rgba(224, 108, 117, 0.2); color: var(--accent-coral);">SCADUTO</span>' : ''}
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                      Q.tà: ${escapeHTML(med.quantity || 'Disponibile')} · Scadenza: ${med.expiryDate || 'Non indicata'}
                    </div>
                  </div>
                  <button onclick="closeAllModals(); openCabinetView();" class="btn-secondary-sm" style="padding: 4px 8px; font-size: 11px; flex: none;">
                    Dettagli ›
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>Nessun farmaco corrispondente per questo disturbo salvato nel tuo armadietto.</span>
            <button onclick="closeAllModals(); openCabinetView();" class="btn-secondary-sm" style="padding: 4px 8px; font-size: 11px; flex: none;">
              Apri Armadietto ›
            </button>
          </div>
        `}
      </div>
    </div>

    <!-- Sezione C: Azione Rapida Annota nel Diario -->
    <div class="feeling-diary-card">
      <div class="feeling-diary-header-text">
        <div class="feeling-diary-card-title">Annota nel Diario della Salute</div>
        <div class="feeling-diary-card-subtitle">Salva questo sintomo nella tua cronologia con data e ora</div>
      </div>
      <button id="btnSaveFeelingToDiary" type="button" class="feeling-diary-cta-btn" onclick="saveFeelingSymptomToDiary('${escapeHTML(data.originalQuery || data.title)}')">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span>Annota nel diario della salute</span>
      </button>
    </div>

    <!-- Sezione D: Disclaimer Discreto -->
    <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; text-align: center; padding: 4px 10px 10px 10px; opacity: 0.7; margin-top: 4px;">
      ℹ️ Suggerimenti generali a scopo informativo. Non sostituiscono il parere del medico o del farmacista.
    </div>
  `;

  if (modalContent) {
    modalContent.innerHTML = html;
  }
}

// ----------------------------------------------------
// 20. SISTEMA PROMEMORIA & NOTIFICHE LOCALI (ZERO SERVER)
// ----------------------------------------------------
function initLocalRemindersSystem() {
  const toggle = document.getElementById('localNotificationsToggle');
  const statusText = document.getElementById('localNotifStatusText');
  const savedPref = localStorage.getItem('pulse_notifications_enabled') === 'true';

  if (toggle) {
    toggle.checked = savedPref && ('Notification' in window && Notification.permission === 'granted');
    if (toggle.checked && statusText) {
      statusText.innerText = 'Attive · Avvisi visite e scadenze farmaci';
    }
  }
}

async function handleNotificationToggle(checked) {
  const toggle = document.getElementById('localNotificationsToggle');
  const statusText = document.getElementById('localNotifStatusText');

  if (checked) {
    if (!('Notification' in window)) {
      alert('Le notifiche di sistema non sono supportate da questo browser.');
      if (toggle) toggle.checked = false;
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('pulse_notifications_enabled', 'true');
        showToast('Notifiche locali attivate!', '🔔');
        if (statusText) statusText.innerText = 'Attive · Avvisi visite e scadenze farmaci';
        checkLocalRemindersAndAlerts();
      } else {
        localStorage.setItem('pulse_notifications_enabled', 'false');
        if (toggle) toggle.checked = false;
        if (statusText) statusText.innerText = 'Permesso non concesso nel browser';
        showToast('Permesso notifiche negato', '⚠️');
      }
    } catch (err) {
      console.warn('Errore richiesta permessi notifiche:', err);
      if (toggle) toggle.checked = false;
    }
  } else {
    localStorage.setItem('pulse_notifications_enabled', 'false');
    if (statusText) statusText.innerText = 'Disattivate · Avvisi visite e scadenze farmaci';
    showToast('Notifiche locali disattivate', '🔕');
  }
}

function checkLocalRemindersAndAlerts() {
  const activeProfile = getActiveProfileId();
  const now = new Date();
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const todayIso = now.toISOString().split('T')[0];

  // 1. Controlla Visite nelle prossime 48 ore
  const allAppts = JSON.parse(localStorage.getItem('pulse_appointments') || '[]');
  const profileAppts = allAppts.filter(a => !a.profileId || a.profileId === activeProfile);
  const imminentAppts = profileAppts.filter(a => {
    if (!a.datetime) return false;
    const dt = new Date(a.datetime);
    return dt >= now && dt <= in48h;
  });

  // 2. Controlla Farmaci in scadenza entro 30 giorni o già scaduti
  const allCabinet = JSON.parse(localStorage.getItem('pulse_cabinet') || '[]');
  const profileCabinet = allCabinet.filter(c => !c.profileId || c.profileId === activeProfile);
  const expiredMeds = profileCabinet.filter(c => c.expiryDate && c.expiryDate < todayIso);
  const expiringMeds = profileCabinet.filter(c => c.expiryDate && c.expiryDate >= todayIso && c.expiryDate <= in30d);

  const alertPill = document.getElementById('localReminderAlertPill');
  const alertText = document.getElementById('localReminderAlertText');
  const alertIcon = document.getElementById('localReminderAlertIcon');

  let alertMessage = '';
  let alertIconSymbol = '⚠️';

  if (imminentAppts.length > 0) {
    const next = imminentAppts[0];
    const dt = new Date(next.datetime);
    const timeFormatted = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const isToday = dt.toDateString() === now.toDateString();
    alertIconSymbol = '📅';
    alertMessage = `Visita ${isToday ? 'oggi alle' : 'domani alle'} ${timeFormatted}: ${next.title}`;
  } else if (expiredMeds.length > 0) {
    alertIconSymbol = '🚨';
    alertMessage = `${expiredMeds.length} ${expiredMeds.length === 1 ? 'farmaco scaduto' : 'farmaci scaduti'} in Armadietto (${expiredMeds[0].name})`;
  } else if (expiringMeds.length > 0) {
    alertIconSymbol = '💊';
    alertMessage = `${expiringMeds.length} ${expiringMeds.length === 1 ? 'farmaco' : 'farmaci'} in scadenza entro 30 giorni (${expiringMeds[0].name})`;
  }

  if (alertMessage && alertPill && alertText) {
    // Controlla se dismesso per questa sessione
    if (sessionStorage.getItem('pulse_dismiss_alert') !== alertMessage) {
      alertText.innerText = alertMessage;
      if (alertIcon) alertIcon.innerText = alertIconSymbol;
      alertPill.style.display = 'flex';
    }
  } else if (alertPill) {
    alertPill.style.display = 'none';
  }

  // Notifica browser se abilitata
  const isNotifEnabled = localStorage.getItem('pulse_notifications_enabled') === 'true';
  if (isNotifEnabled && 'Notification' in window && Notification.permission === 'granted' && alertMessage) {
    const lastNotified = localStorage.getItem('pulse_last_notification_text');
    if (lastNotified !== alertMessage) {
      try {
        new Notification('Pulse Salute', {
          body: alertMessage,
          icon: './icons.js' // fallback icon
        });
        localStorage.setItem('pulse_last_notification_text', alertMessage);
      } catch (err) {
        console.warn('Errore invio notifica:', err);
      }
    }
  }
}

function dismissLocalReminderAlert() {
  const alertPill = document.getElementById('localReminderAlertPill');
  const alertText = document.getElementById('localReminderAlertText');
  if (alertText && alertText.innerText) {
    sessionStorage.setItem('pulse_dismiss_alert', alertText.innerText);
  }
  if (alertPill) {
    alertPill.style.display = 'none';
  }
}
