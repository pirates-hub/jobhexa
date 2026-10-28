import crypto from 'node:crypto';
import slugify from 'slugify';
import Job from '../models/Job.js';

const CATEGORIES = ['new', 'active', 'closing_soon', 'expired'];
const MAX_TITLE = 300;
export const MAX_IMPORT = 2000;

// ---- Title quality gate (mirror of aggregator/src/quality.js — keep in sync)
// Aggregator jobs auto-publish, so navigation junk ("Click Here"), exam
// logistics (corrigenda, admission certificates) and other non-recruitment
// titles must be rejected at the door. Four tiers, cheapest first.
const JUNK_TITLE = /^(click\s?here|check\s?here|read\s?(more|details)|view\s?(details|pdf|more|all)?|download(\s?(here|pdf))?|details|more(\s?(info|details))?|apply\s?online|login|home|back|next|previous|english(\s+version)?|hindi(\s+version)?|notification(\s+board)?|advertisements?|press\s?(note|release|conference)?|important\s?(notice|links)?|links?|menu|sitemap|contact\s?us|about\s?us|whats?\s?new|latest|archives?|old\s?notifications?|results?( & archive)?|recruitment results?( & archive)?|recruitment related announcements?|rti|faq|faqs|form\s*-?\s*[a-z0-9]?|exam schedule|online application|one time registration \(?otr\)?|self attestation form|bonafide certificate)$/i;

const NON_JOB = /\b(workshop|seminar|conference|webinar|awareness|tender|auction|holiday|merit\s?list|answer\s?key|admit\s?card|exam\s?result|result\s?of|final\s?result|orientation|foundation\s?day|annual\s?day|photo\s?gallery|news\s?letter|newsletter|calendar|manual|handbook|booklet|annual report|walk[- ]?in\s?(date|time|schedule)|admission certificate|city of examination|revised dates?|date change|revised programme|corrigendums?|programme for (preliminary|main|written|computer)?\s*examination|instructions? to (the )?candidates?|use of scribe|omr\s?(sheet)?|eligible\s?(&|and)\s?rejected candidates list|cancellation of advertisement|status of\s+lateral\s+recruitment\s+cases|status of recruitment cases)\b/i;

const NON_JOB_NON_LATIN = /(दिवस\s?के\s?उपलक्ष|जन्म\s?नोंद|मार्गदर्शक|जागृत|सार्वजनिक\s?माहिति|ವಿವರ|ಮಾಹಿತಿ\s?ಅಧಿಕಾರಿ|ಜಾಗೃತ|ದಾಖಲೆ|प्रदर्शनी)/u;

const MIN_LENGTH = 16;

const RECRUIT_SIGNAL = /recruit|vacanc|walk[- ]?in|apprentic|engagement|\bappointment\b|\bselection\b|interview|shortlisting|empanel|deputation|scrutiny of documents|post(s)?\s+(of|for|to)\b|for\s+(the\s+)?posts?\b|advertis|\badvt\b|cat\.?\s*no|online forms?|application forms?|last\s+date|\b(constable|nurse|peon|clerk|driver|guard|cook|mts|chowkidar|sachiv|secretary|librarian|doctor|specialist|demonstrator|professor|lecturer|assistant professor|junior engineer|engineer|technician|supervisor|inspector|sub[- ]?inspector|patwari|revenue officer|surveyor|panchayat secretary)\b|\bjobs?\b|hiring|naukri|bharti|walkin/i;

const NON_LATIN = /[\p{Script=Devanagari}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Bengali}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Malayalam}\p{Script=Oriya}\p{Script=Arabic}]/u;

function coreTitle(t) {
  return t
    .replace(/\(\s*(view|details|more|pdf|download|link)\s*\)/gi, ' ')
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isRecruitmentTitle(title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  const core = coreTitle(t);
  if (!core) return false;
  if (JUNK_TITLE.test(core)) return false;
  if (NON_JOB.test(t)) return false;
  if (core.length < MIN_LENGTH && !/\d/.test(core)) return false;
  if (NON_LATIN.test(t)) return !NON_JOB_NON_LATIN.test(t);
  return RECRUIT_SIGNAL.test(t);
}
// ---- End quality gate

export function hashId(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function extractJobs(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data?.jobs)) return payload.data.jobs;
  return null;
}

export function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapAggregatorJob(item, now = new Date()) {
  if (!item || typeof item !== 'object') return { ok: false, error: 'invalid item' };

  const title = String(item.title || '').trim();
  if (!title) return { ok: false, error: 'missing title' };
  if (!isRecruitmentTitle(title)) return { ok: false, error: 'low-quality title (not a recruitment notice)' };

  const url = String(item.notificationUrl || item.applyUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'missing notificationUrl' };

  const sourceId = String(item.source || 'aggregator').trim() || 'aggregator';
  const organization = String(item.organization || sourceId).trim() || sourceId;
  const id = String(item.id || hashId(url));
  const lastDate = toDate(item.lastDate);
  const fetchedAt = toDate(item.fetchedAt) || now;
  const category = CATEGORIES.includes(item.category) ? item.category : 'active';
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expired = lastDate ? lastDate < startOfToday : category === 'expired';
  const vacancyCount = Number(item.vacancies);
  const slug = (slugify(`${title} ${id.slice(0, 6)}`, { lower: true, strict: true }) || `job-${id.slice(0, 8)}`).slice(0, 200);

  return {
    ok: true,
    id,
    doc: {
      title: title.slice(0, MAX_TITLE),
      slug,
      description: `Official recruitment notification from ${organization}. Check the official notification for full details and eligibility before applying.`,
      department: organization.slice(0, 200),
      organization,
      examType: 'other',
      state: String(item.state || 'All India').trim() || 'All India',
      totalVacancies: Number.isFinite(vacancyCount) && vacancyCount > 0 ? vacancyCount : undefined,
      applicationEndDate: lastDate || undefined,
      officialNotificationUrl: url,
      notificationPdfUrl: url,
      applyLink: String(item.applyUrl || url).trim(),
      source: 'aggregator',
      // Auto-publish: the title passed the quality gate, and the job links to
      // its official government notification. Admin can still reject it later.
      verificationStatus: 'verified',
      verificationNotes: 'Auto-published by aggregator sync (title passed quality gate).',
      jobStatus: expired ? 'closed' : 'active',
      aggregatorMeta: { id, sourceId, category, fetchedAt },
    },
  };
}

export function buildImportFilter(id) {
  return { 'aggregatorMeta.id': id };
}

export function buildUpdate(id, doc) {
  return {
    filter: buildImportFilter(id),
    update: {
      $set: {
        'aggregatorMeta.category': doc.aggregatorMeta.category,
        'aggregatorMeta.sourceId': doc.aggregatorMeta.sourceId,
        'aggregatorMeta.fetchedAt': doc.aggregatorMeta.fetchedAt,
        applicationEndDate: doc.applicationEndDate,
        totalVacancies: doc.totalVacancies,
        officialNotificationUrl: doc.officialNotificationUrl,
        notificationPdfUrl: doc.notificationPdfUrl,
        applyLink: doc.applyLink,
        jobStatus: doc.jobStatus,
      },
    },
  };
}

// Upsert a batch of raw aggregator items into Mongo, keyed on
// aggregatorMeta.id — shared by the admin upload and the aggregator auto-sync
// endpoint so both behave identically (created/updated/skipped counts).
// Two round trips total (find existing ids + one unordered bulk write) instead
// of two queries per job: a ~200-job export imports in well under a second
// even against a remote Atlas cluster, instead of timing out the sync client.
export async function importJobItems(items) {
  let skipped = 0;
  const errors = [];
  const valid = [];

  for (const item of items) {
    const mapped = mapAggregatorJob(item);
    if (!mapped.ok) {
      skipped += 1;
      errors.push({ title: item?.title || null, error: mapped.error });
      continue;
    }
    valid.push(mapped);
  }

  if (valid.length === 0) {
    return { received: items.length, created: 0, updated: 0, skipped, errors: errors.slice(0, 20) };
  }

  const existingIds = new Set(
    (
      await Job.find({ 'aggregatorMeta.id': { $in: valid.map((v) => v.id) } })
        .select('aggregatorMeta.id')
        .lean()
    ).map((d) => String(d.aggregatorMeta.id)),
  );

  const ops = valid.map((mapped) => (existingIds.has(String(mapped.id))
    ? { updateOne: { filter: buildImportFilter(mapped.id), update: buildUpdate(mapped.id, mapped.doc).update } }
    : { insertOne: { document: mapped.doc } }));

  let created = 0;
  let updated = 0;
  try {
    const res = await Job.bulkWrite(ops, { ordered: false });
    created = res.insertedCount || 0;
    updated = res.matchedCount || 0;
  } catch (err) {
    // Unordered writes still apply every op that could succeed; the driver
    // rejects with the per-op errors and the partial counts attached, so
    // recover them instead of losing the whole batch.
    const writeErrors = Array.isArray(err?.writeErrors) ? err.writeErrors : [];
    created = err?.result?.insertedCount ?? 0;
    updated = err?.result?.matchedCount ?? 0;
    if (writeErrors.length === 0 && !err?.result) {
      // Not a per-op write failure (connection hiccup, etc.): report once.
      skipped += valid.length;
      errors.push({ title: null, error: err.message });
    } else {
      skipped += writeErrors.length;
      for (const we of writeErrors.slice(0, 20)) {
        const mapped = typeof we.index === 'number' ? valid[we.index] : null;
        errors.push({ title: mapped?.doc?.title || null, error: we.err?.message || String(we.message || we) });
      }
    }
  }

  return { received: items.length, created, updated, skipped, errors: errors.slice(0, 20) };
}
