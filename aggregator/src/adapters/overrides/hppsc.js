// HPPSC loads its notification list via AJAX — every static page contains
// only nav links. Render the HomeNotifications page in Chromium and take the
// real list items (verified 2026-10).
import { BROWSER_UA } from '../index.js';

const LIST_URL = 'https://hppsc.hp.gov.in/Home/HomeNotifications';

// Nav/menu pages share these paths — never job items.
const NAV = /ContentPage|ViewContinuousLinkPage|javascript:|^https:\/\/hppsc\.hp\.gov\.in\/#?$/i;
const ITEM = /ViewCMSFile|\.pdf|Upload|Notification|Advertisement|Corrigendum|Press/i;

export async function discover() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, skipped: true, error: 'playwright not installed (optional) — skipping HPPSC', docs: [] };
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: BROWSER_UA });
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const links = await page.evaluate(() => [...document.querySelectorAll('a')]
      .map((a) => ({ t: (a.textContent || '').trim().replace(/\s+/g, ' '), h: a.href }))
      .filter((x) => x.t && x.h));
    const docs = [];
    const seen = new Set();
    for (const { t, h } of links) {
      if (NAV.test(h) || seen.has(h)) continue;
      if (t.length < 25 || !ITEM.test(`${t} ${h}`)) continue;
      seen.add(h);
      docs.push({ url: h, label: t.slice(0, 200) });
      if (docs.length >= 8) break;
    }
    return { ok: true, docs };
  } catch (err) {
    return { ok: false, error: `hppsc playwright failed: ${err.message}`, docs: [] };
  } finally {
    await browser?.close().catch(() => {});
  }
}
