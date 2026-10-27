// SSC runs an Angular SPA — the homepage HTML contains zero links, so the
// generic link scorer always finds nothing. Their public notice-boards JSON
// API is the real source of notices (verified2026-10).
import { fetchText } from '../index.js';

const API = 'https://ssc.gov.in/api/general-website/portal/notice-boards'
  + '?page=1&limit=10&contentType=notice-boards&key=createdAt&order=DESC'
  + '&isAttachment=true&language=english'
  + '&attributes=id,headline,examId,contentType,redirectUrl,startDate,endDate,language,createdAt';

// Attachment paths arrive Windows-style: "uploads\\masterData\\NoticeBoards\\file name.pdf"
function attachmentUrl(p) {
  const clean = String(p).replace(/\\/g, '/');
  return `https://ssc.gov.in/api/attachment/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

export async function discover(source) {
  const res = await fetchText(API, source);
  if (!res.ok) return { ok: false, error: res.error, docs: [] };

  let payload;
  try {
    payload = JSON.parse(res.text);
  } catch {
    return { ok: false, error: 'SSC notice-boards API returned non-JSON', docs: [] };
  }

  const docs = [];
  const seen = new Set();
  for (const item of payload?.data || []) {
    const label = String(item.headline || '').replace(/\s+/g, ' ').trim();
    if (!label) continue;
    const urls = [];
    for (const a of item.attachments || []) {
      if (a.path) urls.push(attachmentUrl(a.path));
    }
    if (item.redirectUrl) urls.push(item.redirectUrl);
    for (const url of urls) {
      if (!url || seen.has(url)) continue;
      seen.add(url);
      docs.push({ url, label });
    }
  }
  return { ok: true, docs: docs.slice(0, 10) };
}
