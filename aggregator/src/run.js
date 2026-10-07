// Orchestrator: per-source fetch -> normalize -> store. Error isolation per
// source, max 5 parallel, 2-3s delay per domain, per-run summary + health file.
import pLimit from 'p-limit';
import fs from 'node:fs';
import {
  loadSources, HEALTH_PATH, MAX_PARALLEL, PER_DOMAIN_DELAY_MS,
} from './config.js';
import { logger } from './logger.js';
import { rssAdapter, htmlAdapter, playwrightAdapter, pdfAdapter, extractPdfText } from './adapters/index.js';
import { parseDate, findDate } from './dates.js';
import { extractVacancies, extractQualification, extractAgeLimit, extractSalary } from './parse.js';
import { openDb, upsertJob, markClosingSoon, exportFiles, closeDb } from './store.js';
import { fetchUrl } from './http.js';

const lastHit = new Map(); // domain -> timestamp

async function politenessDelay(url) {
  const domain = new URL(url).hostname;
  const last = lastHit.get(domain) || 0;
  const wait = PER_DOMAIN_DELAY_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(domain, Date.now());
}

function buildJob(source, doc, detailText = '') {
  const blob = `${doc.label || ''} ${detailText || ''}`.slice(0, 4000);
  return {
    source: source.id,
    state: source.state || 'All India',
    organization: source.name,
    title: (doc.label || source.name || 'Notification').slice(0, 300),
    postName: null,
    vacancies: extractVacancies(blob),
    qualification: extractQualification(blob),
    ageLimit: extractAgeLimit(blob),
    salary: extractSalary(blob),
    applicationStart: null,
    lastDate: findDate(blob),
    notificationUrl: doc.url,
    applyUrl: doc.url,
  };
}

async function enrichDoc(source, doc) {
  // Fetch the notice page/PDF for dates + vacancy details (best effort).
  try {
    await politenessDelay(doc.url);
    const res = await fetchUrl(doc.url, { ignoreCert: !!source.ignoreCert });
    if (res.error || res.status >= 400) return { text: '' };
    if (/pdf/i.test(res.headers?.['content-type'] || '') || /\.pdf(\?|$)/i.test(doc.url)) {
      const parsed = await extractPdfText(res.buffer);
      return { text: parsed.ok ? parsed.text.slice(0, 12000) : '' };
    }
    return { text: (res.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000) };
  } catch {
    return { text: '' };
  }
}

async function runSource(source) {
  const started = Date.now();
  try {
    await politenessDelay(source.method === 'pdf' && source.fallback ? source.url : source.url);
    let out;
    if (source.method === 'rss') out = await rssAdapter(source);
    else if (source.method === 'playwright') out = await playwrightAdapter(source);
    else if (source.method === 'pdf') out = await pdfAdapter(source);
    else out = await htmlAdapter(source);
    if (out.skipped) return { id: source.id, status: 'skipped', ms: Date.now() - started, note: out.error };
    if (!out.ok) return { id: source.id, status: 'failed', ms: Date.now() - started, error: out.error };
    if (!out.docs.length) {
      return { id: source.id, status: 'ok-empty', ms: Date.now() - started, warning: '0 results — possible layout change', found: 0, stored: 0 };
    }
    let stored = 0;
    for (const doc of out.docs.slice(0, 5)) {
      const detail = /\.pdf(\?|$)/i.test(doc.url) || !doc.pdf ? await enrichDoc(source, doc) : { text: '' };
      let text = detail.text;
      if (doc.pdf) {
        const parsed = await extractPdfText(doc.pdf);
        if (parsed.ok) text = parsed.text.slice(0, 12000);
      }
      const job = buildJob(source, doc, text);
      const r = upsertJob(job);
      if (r === 'new' || r === 'updated') stored += 1;
    }
    return { id: source.id, status: 'ok', ms: Date.now() - started, found: out.docs.length, stored };
  } catch (err) {
    return { id: source.id, status: 'failed', ms: Date.now() - started, error: err.message };
  }
}

export async function runAll({ onlySource = null, onlyState = null } = {}) {
  const all = loadSources().filter((s) => s.enabled);
  const list = all.filter((s) =>
    (!onlySource || s.id === onlySource) && (!onlyState || s.state === onlyState));
  if (!list.length) throw new Error('No enabled sources match the filter');
  await openDb();
  const limit = pLimit(MAX_PARALLEL);
  const results = await Promise.all(list.map((s) => limit(() => runSource(s))));
  const closing = markClosingSoon(7);
  const total = exportFiles();
  const summary = {
    at: new Date().toISOString(),
    sourcesTried: results.length,
    succeeded: results.filter((r) => r.status === 'ok' || r.status === 'ok-empty').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    empty: results.filter((r) => r.status === 'ok-empty').map((r) => r.id),
    newOrUpdated: results.reduce((n, r) => n + (r.stored || 0), 0),
    closingSoon: closing,
    totalJobs: total,
    failures: results.filter((r) => r.error).map((r) => ({ id: r.id, error: r.error })),
  };
  fs.writeFileSync(HEALTH_PATH, JSON.stringify({ ...summary, results }, null, 2));
  logger.info(summary, 'run summary');
  closeDb();
  return summary;
}
