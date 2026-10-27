// IBPS is a WordPress/Elementor site: recruitment notices are .tender blocks
// (first-heading = title, second-heading = date, third-heading = VIEW pdf
// link). Anchor text is always "VIEW", so generic discovery returns useless
// labels. Parse the blocks directly (verified structure 2026-10).
import * as cheerio from 'cheerio';
import { fetchText } from '../index.js';
import { normalizeUrl } from '../../discover.js';

const CAREERS = 'https://www.ibps.in/index.php/careers/';

export async function discover(source) {
  const res = await fetchText(CAREERS, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };

  const $ = cheerio.load(res.text || '');
  const docs = [];
  const seen = new Set();

  $('div.tender').each((_, el) => {
    const box = $(el);
    const title = box.find('.first-heading').first().text().replace(/\s+/g, ' ').trim();
    const date = box.find('.second-heading').first().text().replace(/\s+/g, ' ').trim();
    const href = box.find('a[href]').first().attr('href');
    const url = normalizeUrl(href, CAREERS);
    if (!title || !url || seen.has(url)) return;
    seen.add(url);
    docs.push({ url, label: (date ? `${title} (${date})` : title).slice(0, 200) });
  });

  return { ok: true, docs };
}
