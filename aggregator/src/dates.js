import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(customParseFormat);

const MONTHS = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

const FORMATS = [
  'DD-MM-YYYY', 'DD/MM/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD',
  'DD-MM-YY', 'DD/MM/YY',
  'D MMM YYYY', 'DD MMM YYYY', 'D MMMM YYYY', 'DD MMMM YYYY',
  'MMM D YYYY', 'MMMM D YYYY', 'MMM D, YYYY', 'MMMM D, YYYY',
];

// "15th Oct 2026" -> "15 Oct 2026", "15/10/26" kept as-is.
export function cleanDateString(s) {
  return String(s || '')
    .replace(/(\d+)(st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Returns ISO YYYY-MM-DD or null. Never throws, never invents.
export function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date && !Number.isNaN(input.getTime())) return dayjs(input).format('YYYY-MM-DD');
  const s = cleanDateString(input);
  for (const f of FORMATS) {
    const d = dayjs(s, f, true);
    if (d.isValid()) {
      let year = d.year();
      if (year < 100) year += year > 50 ? 1900 : 2000;
      return dayjs(d).year(year).format('YYYY-MM-DD');
    }
  }
  return null;
}

// First date-looking substring inside free text, e.g. "last date 15th Oct 2026".
export function findDate(text) {
  if (!text) return null;
  const s = cleanDateString(text);
  const patterns = [
    /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/,
    new RegExp(`\\b\\d{1,2}\\s+${MONTHS}\\s+\\d{2,4}\\b`, 'i'),
    new RegExp(`\\b${MONTHS}\\s+\\d{1,2},?\\s+\\d{4}\\b`, 'i'),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const iso = parseDate(m[0]);
      if (iso) return iso;
    }
  }
  return null;
}
