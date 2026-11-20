// Pulse Flow / Apple SF Symbols Duotone SVG Design System
// Linee geometriche eleganti (stroke="currentColor", stroke-width="2", stroke-linecap="round", stroke-linejoin="round")
// Riempimenti interni morbidi per profondità (fill="currentColor" fill-opacity="0.16")

const BODY_ZONES = [
  {
    id: 'blood',
    name: 'Generale & Sangue',
    color: '#FF2D55',
    bg: 'rgba(255, 45, 85, 0.12)',
    border: 'rgba(255, 45, 85, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2.5C12 2.5 5 10.5 5 15.5C5 19.0899 7.91015 22 11.5 22C15.0899 22 18 19.0899 18 15.5C18 10.5 12 2.5 12 2.5Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M9.5 14C9.5 16 11 17.5 13 17.5" stroke="currentColor" stroke-width="1.8"/>
    </svg>`
  },
  {
    id: 'neuro',
    name: 'Testa & Neuro',
    color: '#AF52DE',
    bg: 'rgba(175, 82, 222, 0.12)',
    border: 'rgba(175, 82, 222, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3C7.58172 3 4 6.58172 4 11C4 13.5 5.2 15.7 7 17.1V19C7 20.1046 7.89543 21 9 21H15C16.1046 21 17 20.1046 17 19V17.1C18.8 15.7 20 13.5 20 11C20 6.58172 16.4183 3 12 3Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M9 11C9.8 10 10.8 9.5 12 9.5C13.2 9.5 14.2 10 15 11"/>
      <path d="M10 14H14"/>
    </svg>`
  },
  {
    id: 'eyes',
    name: 'Vista & Udito',
    color: '#007AFF',
    bg: 'rgba(0, 122, 255, 0.12)',
    border: 'rgba(0, 122, 255, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12C3.8 7.5 7.5 4.5 12 4.5C16.5 4.5 20.2 7.5 22 12C20.2 16.5 16.5 19.5 12 19.5C7.5 19.5 3.8 16.5 2 12Z" fill="currentColor" fill-opacity="0.16"/>
      <circle cx="12" cy="12" r="3.5" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="2"/>
      <circle cx="13" cy="11" r="1" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 'dental',
    name: 'Denti & Cavo Orale',
    color: '#32ADE6',
    bg: 'rgba(50, 173, 230, 0.12)',
    border: 'rgba(50, 173, 230, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3.5C7.5 3.5 4.5 6 4.5 9.5C4.5 13.5 6.5 17 8 20.5C9 21.2 10.5 20.5 11 18.5L12 14.5L13 18.5C13.5 20.5 15 21.2 16 20.5C17.5 17 19.5 13.5 19.5 9.5C19.5 6 16.5 3.5 12 3.5Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M9.5 8C10.5 7 13.5 7 14.5 8"/>
    </svg>`
  },
  {
    id: 'heart',
    name: 'Cuore & Cardio',
    color: '#FF375F',
    bg: 'rgba(255, 55, 95, 0.12)',
    border: 'rgba(255, 55, 95, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19.5 12.5L12 20.5L4.5 12.5C2.5 10.2 2.8 6.8 5.2 4.8C7.5 2.8 11 3.5 12 6C13 3.5 16.5 2.8 18.8 4.8C21.2 6.8 21.5 10.2 19.5 12.5Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M3.5 12H7L9 8.5L12.5 16L14.5 12H20.5" stroke="currentColor" stroke-width="1.9"/>
    </svg>`
  },
  {
    id: 'respiratory',
    name: 'Respiro & Polmoni',
    color: '#00C7BE',
    bg: 'rgba(0, 199, 190, 0.12)',
    border: 'rgba(0, 199, 190, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3V11"/>
      <path d="M12 8L7 12"/>
      <path d="M12 8L17 12"/>
      <path d="M8 12.5C5.5 12.5 3.5 14.5 3.5 17.5C3.5 20 5.5 21 8 21C10.5 21 11 18.5 11 15V12.5H8Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M16 12.5C18.5 12.5 20.5 14.5 20.5 17.5C20.5 20 18.5 21 16 21C13.5 21 13 18.5 13 15V12.5H16Z" fill="currentColor" fill-opacity="0.16"/>
    </svg>`
  },
  {
    id: 'gastro',
    name: 'Addome & Gastro',
    color: '#FF9500',
    bg: 'rgba(255, 149, 0, 0.12)',
    border: 'rgba(255, 149, 0, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 3.5H13V7.5C15 7.5 17.5 8.5 18.5 10.5C20 13.5 18.5 18 15 20C12 21.5 8 20 6.5 16.5C5 13 6.5 8.5 11 8V3.5Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M10.5 12.5C11.5 12 13 13 14 14.5"/>
    </svg>`
  },
  {
    id: 'ortho',
    name: 'Ossa & Articolazioni',
    color: '#5856D6',
    bg: 'rgba(88, 86, 214, 0.12)',
    border: 'rgba(88, 86, 214, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6.5" cy="6.5" r="3" fill="currentColor" fill-opacity="0.2"/>
      <circle cx="17.5" cy="17.5" r="3" fill="currentColor" fill-opacity="0.2"/>
      <path d="M8.5 8.5L15.5 15.5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M5.5 18.5C7.5 16.5 11 16 13 18L18 13C16 11 16.5 7.5 18.5 5.5"/>
    </svg>`
  },
  {
    id: 'derma',
    name: 'Pelle & Derma',
    color: '#FF6482',
    bg: 'rgba(255, 100, 130, 0.12)',
    border: 'rgba(255, 100, 130, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3C8 7.5 6 11 6 14.5C6 18 8.5 21 12 21C15.5 21 18 18 18 14.5C18 11 16 7.5 12 3Z" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 9V17"/>
      <path d="M12 13L15 11"/>
    </svg>`
  },
  {
    id: 'pharma',
    name: 'Ricette & Farmaci',
    color: '#34C759',
    bg: 'rgba(52, 199, 89, 0.12)',
    border: 'rgba(52, 199, 89, 0.24)',
    svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5.5" y="4" width="7" height="16" rx="3.5" transform="rotate(-45 9 12)" fill="currentColor" fill-opacity="0.16"/>
      <path d="M6.5 14.5L14.5 6.5"/>
      <path d="M11 9L15 13" fill="currentColor" fill-opacity="0.3"/>
    </svg>`
  }
];

// Helper per icone di sistema riutilizzabili
const PULSE_ICONS = {
  // Navigation Bar
  home: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H4C3.4 21 3 20.6 3 20V10.5Z" fill="currentColor" fill-opacity="0.16"/>
    <path d="M9 21V12H15V21"/>
  </svg>`,

  archive: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V7H3Z" fill="currentColor" fill-opacity="0.16"/>
    <path d="M2 3H22V7H2V3Z"/>
    <path d="M10 11H14"/>
  </svg>`,

  agenda: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4.5" width="18" height="17" rx="3" fill="currentColor" fill-opacity="0.16"/>
    <path d="M16 2.5V5.5"/>
    <path d="M8 2.5V5.5"/>
    <path d="M3 9.5H21"/>
    <circle cx="8.5" cy="14" r="1" fill="currentColor"/>
    <circle cx="12" cy="14" r="1" fill="currentColor"/>
    <circle cx="15.5" cy="14" r="1" fill="currentColor"/>
  </svg>`,

  profile: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="4.5" fill="currentColor" fill-opacity="0.16"/>
    <path d="M4.5 20C4.5 16.5 8 15 12 15C16 15 19.5 16.5 19.5 20" stroke-linecap="round"/>
  </svg>`,

  // Header Tools
  pharmacy: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 5V19"/>
    <path d="M6.5 5V19"/>
    <path d="M10 5V19" stroke-width="2.5"/>
    <path d="M14 5V19"/>
    <path d="M17.5 5V19" stroke-width="2.5"/>
    <path d="M21 5V19"/>
  </svg>`,

  lock: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="10" width="16" height="12" rx="3" fill="currentColor" fill-opacity="0.16"/>
    <path d="M8 10V6.5C8 4.5 9.8 3 12 3C14.2 3 16 4.5 16 6.5V10"/>
    <circle cx="12" cy="15.5" r="1.5" fill="currentColor"/>
  </svg>`,

  sun: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" fill-opacity="0.2"/>
    <path d="M12 2V4M12 20V22M4 12H2M22 12H20M5.6 5.6L4.2 4.2M19.8 19.8L18.4 18.4M18.4 5.6L19.8 4.2M4.2 19.8L5.6 18.4"/>
  </svg>`,

  moon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.8C20 18 15.5 21.5 10.5 21C5.5 20.5 1.8 16 2.2 10.8C2.5 7 5 3.8 8.5 2.5C7.8 4.2 8 6.2 9.2 7.8C10.8 9.8 13.5 10.5 15.8 9.5C17.5 12 19.2 12.5 21 12.8Z" fill="currentColor" fill-opacity="0.2"/>
  </svg>`,

  // Action pills
  scanCamera: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 8H7L9 5H15L17 8H20C21.1 8 22 8.9 22 10V19C22 20.1 21.1 21 20 21H4C2.9 21 2 20.1 2 19V10C2 8.9 2.9 8 4 8Z" fill="currentColor" fill-opacity="0.16"/>
    <circle cx="12" cy="14.5" r="3.5"/>
  </svg>`,

  calendarPlus: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4.5" width="18" height="17" rx="3" fill="currentColor" fill-opacity="0.16"/>
    <path d="M16 2.5V5.5"/>
    <path d="M8 2.5V5.5"/>
    <path d="M3 9.5H21"/>
    <path d="M12 12V17"/>
    <path d="M9.5 14.5H14.5"/>
  </svg>`,

  // Medical symptoms
  stethoscope: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 3V9C6 12.3 8.7 15 12 15C15.3 15 18 12.3 18 9V3"/>
    <circle cx="18" cy="3" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="3" r="1.5" fill="currentColor"/>
    <path d="M12 15V18C12 19.7 13.3 21 15 21H16"/>
    <circle cx="18" cy="21" r="2.5" fill="currentColor" fill-opacity="0.16"/>
  </svg>`,

  taxEuro: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="4" fill="currentColor" fill-opacity="0.16"/>
    <path d="M15 9.5C14.2 8.5 13 8 11.5 8C9 8 7 10 7 12.5C7 15 9 17 11.5 17C13 17 14.2 16.5 15 15.5"/>
    <path d="M6 11.5H12"/>
    <path d="M6 13.5H12"/>
  </svg>`
};

function getBodyZone(id) {
  return BODY_ZONES.find(z => z.id === id) || BODY_ZONES[0];
}

window.BODY_ZONES = BODY_ZONES;
window.PULSE_ICONS = PULSE_ICONS;
window.AURA_ICONS = PULSE_ICONS; // backward compatibility
window.getBodyZone = getBodyZone;
