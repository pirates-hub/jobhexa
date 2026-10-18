import crypto from 'node:crypto';
import slugify from 'slugify';

const CATEGORIES = ['new', 'active', 'closing_soon', 'expired'];
const MAX_TITLE = 300;

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
