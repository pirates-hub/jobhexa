// UPPSC Notifications.aspx is an ASP.NET GridView: every recruitment row links
// with the same "View Advertisement" text, so keyword scoring finds nothing
// useful. Parse the grid cells directly (verified structure 2026-10).
import * as cheerio from 'cheerio';
import { fetchText } from '../index.js';
import { normalizeUrl } from '../../discover.js';
import { parseDate } from '../../dates.js';

export async function discover(source) {
  const res = await fetchText(source.url, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };

  const $ = cheerio.load(res.text || '');
  const docs = [];
  const seen = new Set();

  $('tr').each((_, el) => {
    const row = $(el);
    const exam = row.find('span[id$="Lbl_Exam_Name"]').first().text().replace(/\s+/g, ' ').trim();
    if (!exam) return; // header row

    const advNo = row.find('span[id$="Lbl_Adv_number"]').first().text().trim();
    const advDate = row.find('span[id$="Lbl_adv_date"]').first().text().trim();
    const lastDate = row.find('span[id$="Lbl_ApplicationFormRegistration_LastDate"]').first().text().trim();

    let href = null;
    row.find('a[href*="View_Advertisement"]').each((__, a) => {
      if (!href) href = $(a).attr('href');
    });
    const url = normalizeUrl(href, source.url);
    if (!url || seen.has(url)) return;
    seen.add(url);

    const parts = [exam];
    if (advNo) parts.push(`Advt ${advNo}${advDate ? ` (${advDate})` : ''}`);
    if (lastDate) parts.push(`Last date ${lastDate}`);
    const doc = { url, label: parts.join(' — ').slice(0, 200) };
    // Explicit deadline: without it, text scanning would pick the advertised
    // date (26/10/2026) that appears earlier in the label than the last date.
    const iso = parseDate(lastDate);
    if (iso) doc.lastDate = iso;
    docs.push(doc);
  });

  return { ok: true, docs };
}
