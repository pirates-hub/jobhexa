// Daily incremental + monthly reconciliation engine for JobHexa jobs.
//
// PIPELINE (never auto-publish):
//   discover -> conditional fetch (ETag/Last-Modified/hash) -> process
//   ONLY new/changed documents -> AI structuring (null for missing)
//   -> validate -> dedup vs Job -> create as pending/ai_extracted
//   -> admin verifies (verifyJob) -> public (verified-only reads).
// Changed source documents behind an already-verified job flip it to
// needs_review so an admin re-checks; nothing is published silently.

import crypto from 'node:crypto';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import SourceState from '../models/SourceState.js';
import CollectionRun from '../models/CollectionRun.js';
import SOURCES from '../config/officialSources.js';

const UA = process.env.COLLECTOR_USER_AGENT || 'JobHexa-Collector/1.0';
// AI structuring goes through ai.service.js (Groq cloud).
const MAX_DOCS_PER_SOURCE = 3;
const MAX_DOC_HASHES = 500;

// ---------------- pure helpers (unit-tested) ----------------

export const sha256Hex = (input) => crypto.createHash('sha256').update(input).digest('hex');

export const normalizeUrl = (raw, base) => {
  if (!raw || raw.startsWith('#')) return null;
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('mailto:')) return null;
  try {
    return new URL(raw.trim(), base).toString().split('#')[0];
  } catch {
    return null;
  }
};

const POSITIVE = [/recruit/i, /vacan/i, /advertisement/i, /notification/i, /employment/i, /career/i, /opportunit/i, /apply/i, /engagement/i, /apprentice/i, /corrigendum/i, /addendum/i];
const NEGATIVE = [/banner/i, /awareness/i, /logo/i, /tender/i, /auction/i, /facebook|twitter|youtube|instagram|linkedin/i, /sitemap/i];

export const scoreLink = (url, label) => {
  const text = `${url} ${label}`;
  if (NEGATIVE.some((re) => re.test(text))) return -1;
  let score = 0;
  for (const re of POSITIVE) if (re.test(text)) score += 1;
  if (/\.pdf(\?|$)/i.test(url)) score += 2;
  return score;
};

// Ranked discovery: recruitment PDFs first, keyword HTML notice pages as
// fallback. Promotional assets excluded. Never crawls login/CAPTCHA flows.
export const discoverDocuments = (html, baseUrl, limit = MAX_DOCS_PER_SOURCE) => {  const seen = new Set();
  const scored = [];
  if (!html) return [];
  const re = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const clean = normalizeUrl(m[1], baseUrl);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const isPdf = /\.pdf(\?|$)/i.test(clean);
    const score = scoreLink(clean, label);
    if (isPdf && score >= 0) scored.push({ url: clean, label, score });
    else if (!isPdf && score >= 2) scored.push({ url: clean, label, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ url, label }) => ({ url, label }));
};

// RSS/Atom-first discovery: official feeds are checked before HTML scraping.
// Returns ranked {url,label} using the same scoring; empty when no feed or no hits.
export const discoverFromRss = (xml, baseUrl, limit = MAX_DOCS_PER_SOURCE) => {
  const seen = new Set();
  const scored = [];
  if (!xml) return [];
  const text = String(xml);
  const items = text.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];
  for (const item of items) {
    const linkM = item.match(/<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*\/?>|<link>([^<]+)<\/link>|<guid[^>]*>([^<]+)<\/guid>/i);
    const titleM = item.match(/<title>([^<]*)<\/title>/i);
    const raw = linkM ? (linkM[1] || linkM[2] || linkM[3]) : null;
    const clean = normalizeUrl(raw, baseUrl);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    const label = (titleM ? titleM[1] : '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const isPdf = /\.pdf(\?|$)/i.test(clean);
    const score = scoreLink(clean, label);
    if (isPdf && score >= 0) scored.push({ url: clean, label, score });
    else if (!isPdf && score >= 1) scored.push({ url: clean, label, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ url, label }) => ({ url, label }));
};

export const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const dedupKey = (organization, title) => `${normKey(organization)}::${normKey(title)}`;

export const windowStatus = (start, end, now = new Date()) => {
  const t = now instanceof Date ? now : new Date(now);
  if (end && new Date(end) < t) return 'closed';
  if (start && new Date(start) > t) return 'upcoming';
  if (start && end) {
    const days = Math.ceil((new Date(end) - t) / 86400000);
    if (days <= 3) return 'closing_soon';
    return 'active';
  }
  return null; // indeterminate — caller keeps existing status
};

const isHttpUrl = (v) => {
  try {
    const u = new URL(String(v || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const toValidDate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? 'invalid' : d;
};

export const validateExtracted = (data) => {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, errors: ['AI output is not a JSON object'] };
  if (!data.title || !String(data.title).trim()) errors.push('title is required');
  if (!data.organization || !String(data.organization).trim()) errors.push('organization is required');
  if (!isHttpUrl(data.officialUrl || '')) errors.push('officialUrl must be a valid http(s) URL');
  if (data.notificationPdfUrl && !isHttpUrl(data.notificationPdfUrl)) errors.push('notificationPdfUrl must be valid when supplied');
  const start = toValidDate(data.applicationStartDate);
  const end = toValidDate(data.applicationEndDate);
  if (start === 'invalid') errors.push('applicationStartDate is not a valid date');
  if (end === 'invalid') errors.push('applicationLastDate is not a valid date');
  if (start instanceof Date && end instanceof Date && start > end) errors.push('applicationStartDate must not be after applicationEndDate');
  if (data.totalVacancies !== null && data.totalVacancies !== undefined && data.totalVacancies !== '') {
    const v = Number(data.totalVacancies);
    if (!Number.isFinite(v) || v < 0) errors.push('totalVacancies must be numeric when supplied');
  }
  return { valid: errors.length === 0, errors };
};

// ---------------- network + text (plain HTTP only, honest UA) ----------------

export const fetchWithCache = async (url, { etag = null, lastModified = null, timeoutMs = 20000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { 'User-Agent': UA, Accept: 'text/html,application/pdf,*/*' };
    if (etag) headers['If-None-Match'] = etag;
    if (lastModified) headers['If-Modified-Since'] = lastModified;
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow', headers });
    clearTimeout(timer);
    if (res.status === 304) return { status: 'unchanged' };
    if (!res.ok) return { status: 'failed', error: `HTTP ${res.status} for ${url}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      status: 'ok',
      buffer,
      hash: sha256Hex(buffer),
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      contentType: res.headers.get('content-type') || '',
    };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') return { status: 'failed', error: `Timeout for ${url}` };
    return { status: 'failed', error: `Fetch failed for ${url}: ${err.message}` };
  }
};

export const htmlToText = (html, maxChars = 12000) => {
  if (!html) return '';
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, maxChars);
};

export const pdfToText = async (buffer, maxChars = 12000) => {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy().catch(() => {});
    const text = (result?.text || '').replace(/\s+/g, ' ').trim().slice(0, maxChars);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: `PDF parse failed: ${err.message}` };
  }
};

// ---------------- AI structuring (null for missing, never invent) ----------------

const EXTRACTION_SHAPE = `{"title":"","organization":"","department":"","state":"","postName":"","advertisementNumber":"","salary":"","payScale":"","selectionProcess":[],"publicationDate":null,"qualification":[],"ageMin":null,"ageMax":null,"totalVacancies":null,"applicationStartDate":null,"applicationEndDate":null,"examDate":null,"applicationFee":null,"description":"","officialUrl":"","notificationPdfUrl":""}`;

const parseStrictJson = (text) => {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: `No JSON object: ${e.message}` };
    try {
      return { ok: true, data: JSON.parse(match[0]) };
    } catch (e2) {
      return { ok: false, error: `Malformed JSON: ${e2.message}` };
    }
  }
};

export const extractJobFields = async (notificationText, { timeoutMs = 90000 } = {}) => {
  try {
    const { aiChat } = await import('./ai.service.js');
    const content = await aiChat(
      [
        {
          role: 'system',
          content:
            'You extract structured data from Indian government recruitment notifications. ' +
            'Extract only information explicitly supported by the provided official notification. ' +
            'Never invent or infer missing information. Return null for missing fields. ' +
            'Return ONLY valid JSON with exactly this shape, no extra text: ' + EXTRACTION_SHAPE,
        },
        { role: 'user', content: String(notificationText || '').slice(0, 8000) },
      ],
      { timeoutMs }
    );
    if (!content) return { ok: false, error: 'Empty response from AI provider' };
    const parsed = parseStrictJson(content);
    if (!parsed.ok || !parsed.data || typeof parsed.data !== 'object') {
      return { ok: false, error: parsed.error || 'Model did not return a JSON object' };
    }
    return { ok: true, data: parsed.data };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? `AI timeout after ${timeoutMs}ms` : `AI unavailable: ${err.message}` };
  }
};

// ---------------- document processing ----------------

const coerceNumber = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const coerceDate = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const buildPendingJob = (extracted, source, doc, contentHash = null) => {
  const start = coerceDate(extracted.applicationStartDate);
  const end = coerceDate(extracted.applicationEndDate);
  const status = windowStatus(start, end) || 'active';
  const job = {
    title: String(extracted.title).trim(),
    description: extracted.description || `Collected from ${source.fullName} notification. Verify at ${doc.url}`,
    shortDescription: String(extracted.title).trim().slice(0, 200),
    department: extracted.department || source.fullName,
    organization: String(extracted.organization).trim(),
    examType: source.examType,
    category: source.level,
    state: extracted.state || source.state || 'All India',
    officialWebsite: extracted.officialUrl || source.officialUrl,
    officialNotificationUrl: doc.url,
    applyLink: extracted.officialUrl || source.officialUrl,
    officialApplyUrl: extracted.officialUrl || source.officialUrl,
    verificationStatus: 'pending',
    verificationNotes: `Auto-collected ${new Date().toISOString().slice(0, 10)} from ${doc.url}. NEEDS ADMIN REVIEW before publish.`,
    jobStatus: status,
    source: 'ai_extracted',
    lastVerifiedDate: new Date(),
  };
  if (/\.pdf(\?|$)/i.test(doc.url)) job.notificationPdfUrl = extracted.notificationPdfUrl || doc.url;
  if (contentHash) job.notificationPdfHash = contentHash;
  if (extracted.advertisementNumber) job.advertisementNumber = String(extracted.advertisementNumber).trim();
  if (extracted.postName) job.postName = String(extracted.postName).trim();
  if (extracted.salary) job.salary = String(extracted.salary).trim();
  if (extracted.payScale) job.payScale = String(extracted.payScale).trim();
  if (extracted.selectionProcess) job.selectionProcess = Array.isArray(extracted.selectionProcess) ? extracted.selectionProcess : [String(extracted.selectionProcess)];
  const pub = coerceDate(extracted.publicationDate);
  if (pub) job.publicationDate = pub;
  const vac = coerceNumber(extracted.totalVacancies);
  if (vac !== undefined) job.totalVacancies = vac;
  if (start) job.applicationStartDate = start;
  if (end) job.applicationEndDate = end;
  const exam = coerceDate(extracted.examDate);
  if (exam) job.examDate = exam;
  return job;
};

const pruneDocHashes = (state) => {
  const entries = [...state.docHashes.entries()];
  if (entries.length <= MAX_DOC_HASHES) return;
  state.docHashes = new Map(entries.slice(entries.length - MAX_DOC_HASHES));
};

// Mongoose Maps reject keys containing '.' (all URLs do), so key docHashes
// by sha256(url) instead of the raw URL.
const docKey = (url) => sha256Hex(String(url || ''));

export const processDocument = async (source, doc, stats) => {
  stats.jobsFound += 1;
  const dl = await fetchWithCache(doc.url);
  if (dl.status !== 'ok') {
    stats.errors.push(`Download failed (${doc.url}): ${dl.error}`);
    return;
  }
  let text = '';
  if (/pdf/i.test(dl.contentType) || /\.pdf(\?|$)/i.test(doc.url)) {
    const parsed = await pdfToText(dl.buffer);
    if (!parsed.ok) {
      stats.errors.push(`PDF parse failed (${doc.url}): ${parsed.error}`);
      return;
    }
    text = parsed.text;
  } else {
    text = htmlToText(dl.buffer.toString('utf8'));
  }
  if (!text || text.trim().length < 50) {
    stats.errors.push(`No usable text extracted (${doc.url})`);
    return;
  }
  const extracted = await extractJobFields(text);
  if (!extracted.ok) {
    stats.validationFailures += 1;
    stats.errors.push(`Extraction failed (${doc.url}): ${extracted.error}`);
    return;
  }
  const check = validateExtracted(extracted.data);
  if (!check.valid) {
    stats.validationFailures += 1;
    stats.errors.push(`Validation failed (${doc.url}): ${check.errors.join('; ')}`);
    return;
  }
  // Dedup: advertisement number, PDF hash, official URL, org+title, org+title+dates.
  // Never invent — all keys derived from observed official data.
  const or = [
    { notificationPdfUrl: doc.url },
    { officialNotificationUrl: doc.url },
    { organization: extracted.data.organization, title: extracted.data.title },
  ];
  if (extracted.data.advertisementNumber) or.push({ advertisementNumber: extracted.data.advertisementNumber });
  if (dl.hash) or.push({ notificationPdfHash: dl.hash });
  const existing = await Job.findOne({ $or: or });
  if (existing) {
    stats.duplicates += 1;
    return;
  }
  await Job.create(buildPendingJob(extracted.data, source, { url: doc.url }, dl.hash || null));
  stats.jobsCreated += 1;
};

// ---------------- daily incremental run ----------------

const getState = async (source) => {
  let st = await SourceState.findOne({ source: source.name });
  if (!st) st = await SourceState.create({ source: source.name, url: source.officialUrl });
  // Migrate legacy dotted URL keys (would break Mongoose Map saves)
  let dirty = false;
  for (const k of [...st.docHashes.keys()]) {
    if (k.includes('.')) { st.docHashes.delete(k); dirty = true; }
  }
  if (dirty) await st.save().catch(() => {});
  return st;
};

export const collectSourceDaily = async (source) => {
  const run = await CollectionRun.create({ kind: 'daily', source: source.name, status: 'running' });
  const stats = { jobsFound: 0, jobsCreated: 0, jobsUpdated: 0, jobsExpired: 0, duplicates: 0, validationFailures: 0, errors: [] };
  const state = await getState(source);
  try {
    if (source.collectionMethod !== 'auto') {
      run.status = 'skipped';
      run.endTime = new Date();
      run.errors = [`Manual source (${source.manualReason || 'supply notification URLs explicitly'})`];
      await run.save();
      state.lastStatus = 'skipped';
      state.lastCheckedAt = new Date();
      await state.save();
      return run;
    }
    // RSS/Atom first when the source declares a feed; HTML scrape as fallback.
    let links = [];
    if (source.rssUrl) {
      const feed = await fetchWithCache(source.rssUrl, { timeoutMs: 20000 });
      if (feed.status === 'ok') {
        links = discoverFromRss(feed.buffer.toString('utf8'), source.officialUrl).filter(
          (l) => state.docHashes.get(docKey(l.url)) === undefined
        );
      } else {
        stats.errors.push(`RSS fetch failed (${source.rssUrl}): ${feed.error} — falling back to HTML`);
      }
    }
    let page = null;
    if (!links.length) {
      page = await fetchWithCache(source.officialUrl, { etag: state.etag, lastModified: state.lastModified });
      if (page.status === 'failed') {
        run.status = 'failed';
        run.endTime = new Date();
        run.errors = [`Source fetch failed: ${page.error}`];
        await run.save();
        state.lastStatus = 'failed';
        state.lastError = page.error;
        state.consecutiveFailures += 1;
        state.lastCheckedAt = new Date();
        await state.save();
        return run;
      }
      if (page.status === 'unchanged' || (state.pageHash && page.hash === state.pageHash)) {
        run.status = 'completed';
        run.endTime = new Date();
        run.errors = ['Source unchanged since last check (ETag/hash) — no downloads'];
        await run.save();
        state.lastStatus = 'ok';
        state.lastCheckedAt = new Date();
        await state.save();
        return run;
      }
      links = discoverDocuments(page.buffer.toString('utf8'), source.officialUrl).filter(
        (l) => state.docHashes.get(docKey(l.url)) === undefined
      );
      // Remember page fingerprint even when nothing new matched.
      state.pageHash = page.hash;
      state.etag = page.etag;
      state.lastModified = page.lastModified;
    }
    if (links.length === 0) {
      run.status = 'completed';
      run.endTime = new Date();
      run.errors = ['No new/changed recruitment documents discovered'];
      Object.assign(run, stats);
      await run.save();
      state.lastStatus = 'ok';
      state.lastCheckedAt = new Date();
      await state.save();
      return run;
    }
    for (const link of links) {
      await processDocument(source, link, stats);
      const check = await fetchWithCache(link.url, { timeoutMs: 10000 }).catch(() => null);
      state.docHashes.set(docKey(link.url), check && check.hash ? check.hash : sha256Hex(link.url));
    }
    pruneDocHashes(state);
    Object.assign(run, stats);
    run.status = stats.errors.length > 0 && stats.jobsCreated === 0 ? 'partial' : 'completed';
    run.endTime = new Date();
    await run.save();
    state.lastStatus = 'ok';
    state.consecutiveFailures = 0;
    state.lastCheckedAt = new Date();
    await state.save();
    return run;
  } catch (err) {
    Object.assign(run, stats);
    run.status = 'failed';
    run.endTime = new Date();
    run.errors.push(err.message);
    await run.save();
    return run;
  }
};

export const notifyAdmins = async (title, message, jobId = null) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  if (!admins.length) return 0;
  const docs = admins.map((a) => ({ user: a._id, type: 'system', title, message, ...(jobId ? { jobId } : {}) }));
  await Notification.insertMany(docs);
  return docs.length;
};

export const runDailyCollection = async ({ sources = null } = {}) => {
  const selected = SOURCES.filter((s) => s.enabled && (!sources || sources.includes(s.name)));
  const results = [];
  for (const source of selected) {
    try {
      const run = await collectSourceDaily(source);
      results.push({ source: source.name, status: run.status, jobsFound: run.jobsFound, jobsCreated: run.jobsCreated, duplicates: run.duplicates, validationFailures: run.validationFailures, errors: run.errors });
    } catch (err) {
      results.push({ source: source.name, status: 'failed', errors: [err.message] });
    }
  }
  const created = results.reduce((n, r) => n + (r.jobsCreated || 0), 0);
  const failed = results.filter((r) => r.status === 'failed').map((r) => r.source);
  await CollectionRun.create({
    kind: 'daily', source: 'ALL', status: failed.length && !created ? 'partial' : 'completed', endTime: new Date(),
    jobsFound: results.reduce((n, r) => n + (r.jobsFound || 0), 0),
    jobsCreated: created,
    duplicates: results.reduce((n, r) => n + (r.duplicates || 0), 0),
    validationFailures: results.reduce((n, r) => n + (r.validationFailures || 0), 0),
    errors: failed.map((s) => `Source failed: ${s}`),
  });
  if (created > 0) {
    await notifyAdmins(
      `${created} new job(s) need admin verification`,
      `Daily collection quarantined ${created} new listing(s) as pending. Review in Admin > Pending Jobs before anything goes public.`
    );
  }
  return results;
};

// ---------------- monthly full reconciliation (1st of month) ----------------

export const runMonthlyReconciliation = async () => {
  const stats = { checked: 0, changed: 0, expired: 0, duplicates: 0, errors: [] };
  const now = new Date();
  // 1. Re-verify every live job against its official document; changed docs
  //    go back to admin verification (needs_review), never silently kept.
  const live = await Job.find({ verificationStatus: { $in: ['verified', 'needs_review'] } });
  for (const job of live) {
    const docUrl = job.notificationPdfUrl || job.officialNotificationUrl;
    stats.checked += 1;
    if (docUrl) {
      try {
        const dl = await fetchWithCache(docUrl);
        if (dl.status === 'ok') {
          const state = await SourceState.findOne({ source: job.organization });
          const known = state?.docHashes?.get(docKey(docUrl));
          if (known && known !== dl.hash) {
            job.verificationStatus = 'needs_review';
            job.verificationNotes = `Source document changed (monthly reconcile ${now.toISOString().slice(0, 10)}). NEEDS ADMIN RE-VERIFICATION.`;
            await job.save();
            stats.changed += 1;
            await notifyAdmins('Changed notification needs re-verification', `"${job.title}" — its official document changed. Re-check before it stays public.`, job._id);
          }
          if (state) {
            state.docHashes.set(docKey(docUrl), dl.hash);
            pruneDocHashes(state);
            await state.save();
          }
        }
      } catch (err) {
        stats.errors.push(`Recheck failed (${job.title}): ${err.message}`);
      }
    }
    // 2. Expired windows close (history preserved, never deleted).
    if (job.applicationEndDate && new Date(job.applicationEndDate) < now && job.jobStatus !== 'closed') {
      job.jobStatus = 'closed';
      await job.save();
      stats.expired += 1;
    }
  }
  // 3. Duplicate sweep: same organization + title (normalized). Reported,
  //    never auto-merged/deleted.
  const dupes = await Job.aggregate([
    { $group: { _id: { o: { $toLower: '$organization' }, t: { $toLower: '$title' } }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  stats.duplicates = dupes.length;
  // 4. Missing-record gaps: fresh discovery titles per auto source not in DB.
  const missing = [];
  for (const source of SOURCES.filter((s) => s.enabled && s.collectionMethod === 'auto')) {
    try {
      const page = await fetchWithCache(source.officialUrl);
      if (page.status !== 'ok') continue;
      const docs = discoverDocuments(page.buffer.toString('utf8'), source.officialUrl, 5);
      const titles = await Job.distinct('title', { organization: source.name });
      const known = new Set(titles.map(normKey));
      for (const d of docs) {
        if (d.label && !known.has(normKey(d.label)) && normKey(d.label).length > 10) missing.push(`${source.name}: ${d.label.slice(0, 80)}`);
      }
    } catch (err) {
      stats.errors.push(`Gap check failed (${source.name}): ${err.message}`);
    }
  }
  await CollectionRun.create({
    kind: 'monthly', source: 'ALL',
    status: stats.errors.length && !stats.changed && !stats.expired ? 'partial' : 'completed',
    endTime: new Date(), jobsFound: stats.checked, jobsUpdated: stats.changed,
    jobsExpired: stats.expired, duplicates: stats.duplicates,
    errors: [...stats.errors, ...missing.slice(0, 20).map((m) => `Possible gap — ${m}`)],
  });
  await notifyAdmins(
    'Monthly reconciliation done',
    `Checked ${stats.checked} live jobs: ${stats.changed} changed (sent for re-verification), ${stats.expired} expired/closed, ${stats.duplicates} duplicate groups, ${missing.length} possible gaps. See CollectionRun log.`
  );
  return stats;
};

// ---------------- weekly state-wise refresh (every Sunday) ----------------
// Refreshes EVERY state: status windows, lastVerifiedDate, expiry.
// History preserved, nothing auto-deleted. Powers weekly state-wise updates.
export const runWeeklyStateRefresh = async () => {
  const now = new Date();
  const states = await Job.distinct('state');
  const perState = {};
  let checked = 0, expired = 0, closing = 0;
  const jobs = await Job.find({ verificationStatus: { $in: ['verified', 'needs_review'] } });
  for (const job of jobs) {
    checked += 1;
    const st = job.state || 'All India';
    perState[st] = (perState[st] || 0) + 1;
    let next = job.jobStatus;
    if (job.applicationEndDate && new Date(job.applicationEndDate) < now) next = 'closed';
    else if (job.applicationStartDate && new Date(job.applicationStartDate) > now) next = 'upcoming';
    else if (job.applicationStartDate && job.applicationEndDate) {
      const days = Math.ceil((new Date(job.applicationEndDate) - now) / 86400000);
      next = days <= 3 ? 'closing_soon' : 'active';
    }
    if (next === 'closed' && job.jobStatus !== 'closed') expired += 1;
    if (next === 'closing_soon') closing += 1;
    job.jobStatus = next;
    job.lastVerifiedDate = now;
    await job.save();
  }
  await CollectionRun.create({
    kind: 'weekly', source: 'ALL', status: 'completed', endTime: new Date(),
    jobsFound: checked, jobsUpdated: checked, jobsExpired: expired,
    errors: [`States covered: ${states.length}`, `Closing soon: ${closing}`],
  });
  await notifyAdmins(
    'Weekly state-wise refresh done',
    `Refreshed ${checked} jobs across ${states.length} states: ${expired} expired, ${closing} closing soon.`
  );
  return { checked, expired, closing, states: states.length, perState };
};
