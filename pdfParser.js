// Medical Document Text Parser for Italian Healthcare Documents (100% Client-Side)
function parseMedicalDocument(text, fileName = '') {
  const cleanText = (text || '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
  const lower = cleanText.toLowerCase();

  const result = {
    title: '',
    category: 'Referto',
    bodyZone: 'blood',
    date: '',
    nre: '',
    amount: null,
    isDeductible730: false,
    notes: '',
    confidenceScore: 0
  };

  // 1. Riconoscimento Codice Ricetta Elettronica NRE (15 caratteri)
  // Formato NRE tipico italiano: es. 0800A1234567890 o con spazi/trattini
  const nreRegex = /\b([0-9]{3}[0-9A-Z]{2}\s?[0-9A-Z]{10})\b/gi;
  const nreMatch = cleanText.match(nreRegex);
  if (nreMatch && nreMatch.length > 0) {
    const candidate = nreMatch[0].replace(/\s+/g, '').toUpperCase();
    if (candidate.length === 15) {
      result.nre = candidate;
      result.category = 'Ricetta';
    }
  }

  // 2. Riconoscimento Tipologia Documento (Ricetta, Fattura, Referto, Esame)
  const isInvoice = /fattura|ricevuta sanitaria|totale documento|quietanza|importo pagato|bollo|esente art\.?\s?10/i.test(lower);
  const isPrescription = result.nre || /promemoria|ricetta|prescrizione|dematerializzata|posologia|medico prescrittore/i.test(lower);
  const isBooking = /prenotazione|cup\b|cupweb|appuntamento|orario di presentazione|ambulatorio di accettazione/i.test(lower);

  if (isInvoice) {
    result.category = 'Fattura';
    result.isDeductible730 = true;
  } else if (isPrescription) {
    result.category = 'Ricetta';
  } else if (isBooking) {
    result.category = 'Esame';
  } else {
    result.category = 'Referto';
  }

  // 3. Riconoscimento Cartella Anatomica (Auto-Catalogazione a punteggio)
  const zoneScores = {
    blood: 0,
    heart: 0,
    neuro: 0,
    eyes: 0,
    dental: 0,
    respiratory: 0,
    gastro: 0,
    ortho: 0,
    derma: 0,
    pharma: 0
  };

  const keywords = {
    pharma: ['ricetta', 'farmaco', 'compresse', 'capsule', 'posologia', 'sciroppo', 'antibiotico', 'farmacia', 'mg', 'sospensione', 'bustine', 'flacone'],
    blood: ['emocromo', 'emoglobina', 'colesterolo', 'glicemia', 'transaminasi', 'tsh', 'urine', 'prelievo', 'sangue', 'analisi', 'ferritina', 'vitamina d', 'azotemia', 'creatinina', 'leucociti', 'piastrine'],
    heart: ['cardiolog', 'ecg', 'elettrocardiogramma', 'ecocardiogramma', 'holter', 'pressione', 'cuore', 'aritmia', 'coronar', 'cardiovascolare', 'valvola', 'miocardio'],
    neuro: ['neurolog', 'cranio', 'encefalo', 'cefalea', 'emicrania', 'rmn encefalo', 'cervello', 'sincope', 'vertigini', 'neuropatia'],
    eyes: ['oculist', 'occhio', 'visus', 'miopia', 'astigmatismo', 'ottico', 'lenti', 'otorino', 'udito', 'audiometria', 'orecchio', 'timpano', 'fondo oculare', 'cataratta'],
    dental: ['odontoiatr', 'dentist', 'panoramica', 'ortopanoramica', 'igiene dentale', 'carie', 'dente', 'arcata', 'molare', 'gengivite', 'impianto'],
    respiratory: ['pneumolog', 'polmon', 'torace', 'spirometria', 'asma', 'allergolog', 'bronchi', 'respir', 'rx torace', 'dispnea', 'saturazione'],
    gastro: ['addome', 'gastro', 'ecografia addominale', 'stomaco', 'fegato', 'colon', 'nutrizion', 'intestino', 'reni', 'gastroscopia', 'colonscopia', 'reflusso', 'colecisti'],
    ortho: ['ortoped', 'radiografia', 'rx ', 'risonanza', 'ginocchio', 'spalla', 'colonna', 'lombare', 'cervicale', 'fisioterapia', 'frattura', 'articolazion', 'caviglia', 'tendine', 'menisco'],
    derma: ['dermatolog', 'nei', 'epiluminescenza', 'pelle', 'cute', 'eczema', 'biopsia cutanea', 'lesione cutanea', 'psoriasi', 'prurito']
  };

  // Se è una ricetta e non ci sono altri esami specifici menzionati, favorisci pharma
  if (result.category === 'Ricetta') {
    zoneScores.pharma += 2;
  }

  for (const [zone, terms] of Object.entries(keywords)) {
    for (const term of terms) {
      const regex = new RegExp('\\b' + term, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        zoneScores[zone] += matches.length;
      }
    }
  }

  // Trova la zona con punteggio maggiore
  let bestZone = 'blood';
  let maxScore = 0;
  for (const [zone, score] of Object.entries(zoneScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestZone = zone;
    }
  }
  result.bodyZone = bestZone;

  // 4. Estrazione Data Documento (GG/MM/AAAA o GG-MM-AAAA)
  // Cerca date con anno compreso tra 2015 e l'anno attuale (scartando date di nascita)
  const dateRegex = /\b(0[1-9]|[12][0-9]|3[01])[\/\-\.](0[1-9]|1[012])[\/\-\.](20[12][0-9])\b/g;
  let dateMatches = [];
  let m;
  while ((m = dateRegex.exec(cleanText)) !== null) {
    const day = m[1];
    const month = m[2];
    const year = m[3];
    const index = m.index;
    // Calcola vicinanza a parole chiave di emissione
    const prefix = cleanText.substring(Math.max(0, index - 35), index).toLowerCase();
    const isEmitted = /data|del|emiss|refert|ricevuta|giorno|effettuato/i.test(prefix);
    const isBirth = /nascita|nato|nata/i.test(prefix);
    if (!isBirth) {
      dateMatches.push({
        iso: `${year}-${month}-${day}`,
        priority: isEmitted ? 2 : 1
      });
    }
  }

  if (dateMatches.length > 0) {
    dateMatches.sort((a, b) => b.priority - a.priority);
    result.date = dateMatches[0].iso;
  }

  // 5. Estrazione Importo (€) per Fatture
  if (result.category === 'Fattura') {
    // Pattern es. Totale € 85,00 oppure Importo: 120.50 € oppure Totale documento 90,00
    const amountRegex = /(?:totale|netto|importo|pagare|quietanza|€)[\s\:\=a-zA-Z\.]*([0-9]{1,4}[\,\.][0-9]{2})\s?(?:€|euro)?/gi;
    let amtMatch;
    let foundAmounts = [];
    while ((amtMatch = amountRegex.exec(cleanText)) !== null) {
      const numStr = amtMatch[1].replace(',', '.');
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0 && val < 10000) {
        foundAmounts.push(val);
      }
    }
    if (foundAmounts.length > 0) {
      // In genere l'importo totale è il valore più alto identificato nel blocco totale
      result.amount = Math.max(...foundAmounts);
    }
  }

  // 6. Generazione Titolo Intelligente
  if (result.category === 'Ricetta') {
    // Cerca eventuale quesito o nome prestazione
    const quesitoMatch = cleanText.match(/(?:quesito diagnostico|prestazione|disciplina|prescrizione)[\:\s]+([^\.\n\,]{5,40})/i);
    if (quesitoMatch && quesitoMatch[1]) {
      result.title = 'Ricetta - ' + quesitoMatch[1].trim();
    } else {
      result.title = 'Prescrizione Ricetta Medica' + (result.nre ? ` (${result.nre.slice(0, 5)}...)` : '');
    }
  } else if (result.category === 'Fattura') {
    const prestazioneMatch = cleanText.match(/(?:descrizione|prestazione|visita)[\:\s]+([^\.\n\,]{5,40})/i);
    if (prestazioneMatch && prestazioneMatch[1]) {
      result.title = 'Fattura ' + prestazioneMatch[1].trim();
    } else {
      result.title = 'Fattura Sanitaria Spesa Medica';
    }
  } else if (result.category === 'Esame') {
    result.title = 'Promemoria Visita Specialistica / CUP';
  } else {
    // Referto
    const labMatch = cleanText.match(/(?:laboratorio|reparto|clinica|esame)[\:\s]+([^\.\n\,]{5,40})/i);
    if (labMatch && labMatch[1]) {
      result.title = 'Referto ' + labMatch[1].trim();
    } else {
      result.title = 'Referto Medico Specialistico';
    }
  }

  // Fallback con pulizia del nome del file se il titolo generato è generico
  if (fileName) {
    const cleanFileName = fileName
      .replace(/\.pdf$/i, '')
      .replace(/[_\-]+/g, ' ')
      .replace(/[0-9]{8,}/g, '') // rimuove timestamp o lunghi ID
      .trim();
    if (cleanFileName.length >= 4 && cleanFileName.length <= 45) {
      // Se il nome file è espressivo, uniscilo o usalo
      if (result.category === 'Ricetta' && !result.title.includes('-')) {
        result.title = `Ricetta - ${cleanFileName}`;
      } else if (result.category === 'Fattura' && result.title === 'Fattura Sanitaria Spesa Medica') {
        result.title = `Fattura ${cleanFileName}`;
      } else if (result.title.length < 15) {
        result.title = cleanFileName;
      }
    }
  }

  // Capitalizza prima lettera
  if (result.title) {
    result.title = result.title.charAt(0).toUpperCase() + result.title.slice(1);
  }

  return result;
}

window.parseMedicalDocument = parseMedicalDocument;
