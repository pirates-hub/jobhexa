// Regex extractors. Everything returns null when not found — never invented.
export function extractVacancies(text) {
  if (!text) return null;
  const s = String(text).replace(/,/g, '');
  const patterns = [
    /(?:total\s+)?(?:no\.?\s+of\s+)?vacan\w*\s*[:\-]?\s*(\d{1,6})/i,
    /(\d{1,6})\s*(?:nos?\.?\s+)?(?:posts|vacancies)/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0 && n < 1000000) return n;
    }
  }
  return null;
}

const QUALS = [
  '10th', '12th', 'iti', 'diploma', 'graduate', 'postgraduate', 'phd',
  'engineering', 'b\\.?e\\b', 'b\\.tech', 'medical', 'mbbs', 'nursing', 'law', 'llb',
];

export function extractQualification(text) {
  if (!text) return null;
  const found = [];
  for (const q of QUALS) {
    const re = new RegExp(`\\b${q}`, 'i');
    if (re.test(text)) found.push(q.replace(/\\/g, ''));
  }
  return found.length ? [...new Set(found)].join(', ') : null;
}

export function extractAgeLimit(text) {
  if (!text) return null;
  const m = String(text).match(/age\s*(?:limit)?\s*[:\-]?\s*(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})\s*(?:years?)?/i)
    || String(text).match(/(\d{1,2})\s*-\s*(\d{1,2})\s*years/i);
  return m ? `${m[1]}-${m[2]} years` : null;
}

export function extractSalary(text) {
  if (!text) return null;
  const m = String(text).match(/(?:rs\.?|inr|₹)\s*[\d,]+\s*(?:-|to|–)\s*(?:rs\.?|inr|₹)?\s*[\d,]+|pay\s*(?:level|matrix|scale)[^\n]{0,40}/i);
  return m ? m[0].trim().slice(0, 120) : null;
}
