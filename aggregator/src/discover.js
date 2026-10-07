// Link discovery shared by the HTML and RSS adapters.
import * as cheerio from 'cheerio';
import { KEYWORDS } from './config.js';

export function normalizeUrl(raw, base) {
  if (!raw || raw.startsWith('#')) return null;
  const lower = String(raw).trim().toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('mailto:') || lower.startsWith('tel:')) return null;
  try {
    return new URL(String(raw).trim(), base).toString().split('#')[0];
  } catch {
    return null;
  }
}

const NEGATIVE = [/banner/i, /logo/i, /tender/i, /auction/i, /facebook|twitter|youtube|instagram|linkedin/i, /sitemap/i, /login/i, /captcha/i];

export function scoreLink(url, label, keywords = KEYWORDS) {
  const text = `${url} ${label}`;
  if (NEGATIVE.some((re) => re.test(text))) return -1;
  let score = 0;
  for (const kw of keywords) {
    if (text.toLowerCase().includes(String(kw).toLowerCase())) score += 1;
  }
  if (/\.pdf(\?|$)/i.test(url)) score += 2;
  return score;
}

export function discoverHtmlLinks(html, baseUrl, { keywords = KEYWORDS, limit = 5 } = {}) {
  const $ = cheerio.load(html || '');
  const seen = new Set();
  const scored = [];
  $('a').each((_, el) => {
    const clean = normalizeUrl($(el).attr('href'), baseUrl);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    const label = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 200);
    const isPdf = /\.pdf(\?|$)/i.test(clean);
    const score = scoreLink(clean, label, keywords);
    if (isPdf && score >= 0) scored.push({ url: clean, label, score });
    else if (!isPdf && score >= 2) scored.push({ url: clean, label, score });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ url, label }) => ({ url, label }));
}

export function discoverRssItems(xml, baseUrl, { keywords = KEYWORDS, limit = 5 } = {}) {
  const seen = new Set();
  const scored = [];
  const items = String(xml || '').match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];
  for (const item of items) {
    const linkM = item.match(/<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*\/?>|<link>([^<]+)<\/link>|<guid[^>]*>([^<]+)<\/guid>/i);
    const titleM = item.match(/<title>([^<]*)<\/title>/i);
    const clean = normalizeUrl(linkM && (linkM[1] || linkM[2] || linkM[3]), baseUrl);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    const label = (titleM ? titleM[1] : '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const isPdf = /\.pdf(\?|$)/i.test(clean);
    const score = scoreLink(clean, label, keywords);
    if (isPdf && score >= 0) scored.push({ url: clean, label, score });
    else if (!isPdf && score >= 1) scored.push({ url: clean, label, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ url, label }) => ({ url, label }));
}
