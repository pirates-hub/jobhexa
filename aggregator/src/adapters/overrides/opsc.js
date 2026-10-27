// OPSC's Advertisements page renders a custom listing (div_all_data) where
// titles live in .content_title spans, not in usable anchor text — the
// generic scorer returns 0 docs. The "View Pdf" links are ASP.NET postbacks
// (javascript:__doPostBack) with no real target URL, so every item points at
// the ads page itself, which contains the full listing. Verified 2026-10.
import * as cheerio from 'cheerio';
import { fetchText } from '../index.js';
import { normalizeUrl } from '../../discover.js';

// "Advertisements" content page linked from the OPSC homepage.
const ADS_PAGE = 'https://opsc.gov.in/Pages/View_Content.aspx?id=MeNGKau42B9VX4Nn6oZfXA==';

const RECRUITMENT = /recruit|vacan|advertisement|exam|post|notification|corrigendum|syllabus|call letter|result/i;
const NOISE = /tender|quotation|auction|login|sitemap/i;

export async function discover(source) {
  const res = await fetchText(ADS_PAGE, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };

  const $ = cheerio.load(res.text || '');
  const docs = [];
  const seen = new Set();

  $('#div_all_data li').each((_, el) => {
    const li = $(el);
    const title = li.find('.content_title').first().text().replace(/\s+/g, ' ').trim();
    if (!title || NOISE.test(title) || !RECRUITMENT.test(title)) return;
    if (seen.has(title)) return;
    seen.add(title);

    const url = normalizeUrl(ADS_PAGE, source.url);
    if (!url) return;

    // Posting date from the datebox (span.month oddly holds the day number).
    const day = li.find('.datebox .month').first().text().trim();
    const mon = li.find('.datebox .Date').first().text().trim();
    const yr = li.find('.datebox .year').first().text().trim();
    const posted = day && mon && yr ? `${day} ${mon} ${yr}` : '';

    docs.push({
      url,
      label: (posted ? `${title} (${posted})` : title).slice(0, 200),
      // The listing publishes no per-item deadline — do not invent one from
      // the posting date or surrounding page text.
      lastDate: null,
    });
  });

  return { ok: true, docs };
}
