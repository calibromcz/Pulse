// Lightweight Code 39 Barcode Generator in pure Vanilla JS (SVG)
// Standard Code 39 character patterns (width patterns: 1 = narrow, 2 = wide)
const CODE39_MAP = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
  '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101'
};

function generateCode39SVG(text, height = 70, showText = true) {
  if (!text) return '';
  const clean = '*' + text.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '') + '*';
  let binary = '';
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    binary += (CODE39_MAP[ch] || CODE39_MAP[' ']) + '0'; // inter-character gap
  }

  const barWidth = 2;
  const svgWidth = binary.length * barWidth;
  const barHeight = height;
  const totalHeight = showText ? barHeight + 20 : barHeight;

  let rects = '';
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      rects += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="#000000" />`;
    }
  }

  const label = showText ? `<text x="${svgWidth / 2}" y="${barHeight + 15}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#000">${escapeHTML(text)}</text>` : '';

  return `<svg viewBox="0 0 ${svgWidth} ${totalHeight}" preserveAspectRatio="xMidYMid meet" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
    <rect width="${svgWidth}" height="${totalHeight}" fill="#ffffff" />
    ${rects}
    ${label}
  </svg>`;
}

window.generateCode39SVG = generateCode39SVG;
