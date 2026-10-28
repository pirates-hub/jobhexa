import crypto from 'node:crypto';
import slugify from 'slugify';
import Job from '../models/Job.js';

const CATEGORIES = ['new', 'active', 'closing_soon', 'expired'];
const MAX_TITLE = 300;
export const MAX_IMPORT = 2000;

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
      description: `Imported from ${organization} (${sourceId}). Not verified.`,
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
      verificationStatus: 'pending',
      verificationNotes: 'Imported from aggregator. Needs admin review before publishing.',
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
