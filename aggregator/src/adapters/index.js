// Adapter layer. Each method returns raw candidate documents:
//   [{ url, label, text? }]
// Normalization into the job schema happens in run.js.
// A per-source override lives in ./overrides/<id>.js exporting any of these
// functions — it is auto-loaded, so one layout change breaks only one file.
import { fetchUrl } from '../http.js';
import { discoverHtmlLinks, discoverRssItems } from '../discover.js';
import { allowedByRobots } from '../robots.js';

async function fetchText(url, source) {
  if (!(await allowedByRobots(url))) {
    return { ok: false, error: `Blocked by robots.txt: ${url}` };
  }
  const res = await fetchUrl(url, { ignoreCert: !!source.ignoreCert });
  if (res.error || res.status === 0) return { ok: false, error: res.error };
  if (res.status === 403) return { ok: false, error: `HTTP 403 (bot-blocked): ${url}` };
  if (res.status === 404) return { ok: false, error: `HTTP 404: ${url}` };
  if (res.status >= 400) return { ok: false, error: `HTTP ${res.status}: ${url}` };
  return { ok: true, ...res };
}

async function loadOverride(id) {
  try {
    return await import(`./overrides/${id}.js`);
  } catch {
    return null;
  }
}

export async function rssAdapter(source) {
  const override = await loadOverride(source.id);
  if (override?.discover) return override.discover(source);
  const feedUrl = source.rssUrl || source.url;
  const res = await fetchText(feedUrl, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };
  const docs = discoverRssItems(res.text, source.url, { keywords: source.keywordFilter });
  return { ok: true, docs };
}

export async function htmlAdapter(source) {
  const override = await loadOverride(source.id);
  if (override?.discover) return override.discover(source);
  const res = await fetchText(source.url, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };
  const docs = discoverHtmlLinks(res.text, source.url, { keywords: source.keywordFilter });
  return { ok: true, docs };
}

export async function playwrightAdapter(source) {
  const override = await loadOverride(source.id);
  if (override?.discover) return override.discover(source);
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    return { ok: false, skipped: true, error: 'playwright not installed (optional) — skipping JS-rendered page', docs: [] };
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: process.env.AGG_UA });
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const html = await page.content();
    const docs = discoverHtmlLinks(html, source.url, { keywords: source.keywordFilter });
    return { ok: true, docs };
  } catch (err) {
    return { ok: false, error: `playwright failed: ${err.message}`, docs: [] };
  } finally {
    await browser?.close().catch(() => {});
  }
}

export async function pdfAdapter(source) {
  const override = await loadOverride(source.id);
  if (override?.discover) return override.discover(source);
  // PDF-method sources point directly at a notice PDF.
  const res = await fetchText(source.url, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };
  return { ok: true, docs: [{ url: source.url, label: source.name, pdf: res.buffer }] };
}

export async function extractPdfText(buffer) {
  if (!buffer?.length) return { ok: false, error: 'empty PDF buffer' };
  // Many "PDF" links actually return HTML (bot-block / error page).
  // Bail out early instead of feeding garbage to the parsers.
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return { ok: false, error: 'downloaded file is not a PDF (likely an HTML block/error page)' };
  }
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy().catch(() => {});
    const text = (result?.text || '').replace(/\s+/g, ' ').trim();
    if (text.length > 100) return { ok: true, text };
    return { ok: false, error: 'PDF has no extractable text (scanned image)' };
  } catch (err) {
    return { ok: false, error: `PDF text extraction failed: ${err.message}` };
  }
  // NOTE: no tesseract OCR fallback here on purpose. tesseract.js only reads
  // image bytes — passing it a PDF buffer makes its worker throw via
  // process.nextTick, which bypasses try/catch and crashes the entire run
  // (exit 1) instead of failing just this document. Scanned PDFs need
  // rasterization first; until then they are recorded as misses, not crashes.
}
