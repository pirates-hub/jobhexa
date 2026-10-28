import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJobs, mapAggregatorJob, hashId, buildUpdate, importJobItems } from './aggregatorImport.service.js';

vi.mock('../models/Job.js', () => ({
  default: { find: vi.fn(), bulkWrite: vi.fn() },
}));

import Job from '../models/Job.js';

const now = new Date('2026-10-18T10:00:00Z');

const sample = {
  id: 'abc123',
  source: 'keralapsc',
  state: 'Kerala',
  organization: 'Kerala Public Service Commission',
  title: 'Staff Nurse Gr-II',
  vacancies: 12,
  lastDate: '2026-11-30',
  notificationUrl: 'https://www.keralapsc.gov.in/notice.pdf',
  applyUrl: 'https://www.keralapsc.gov.in/apply',
  category: 'new',
  fetchedAt: '2026-10-18T09:00:00Z',
};

describe('aggregator import payload', () => {
  it('accepts an array, { jobs } and { data: { jobs } }', () => {
    expect(extractJobs([sample])).toHaveLength(1);
    expect(extractJobs({ jobs: [sample] })).toHaveLength(1);
    expect(extractJobs({ data: { jobs: [sample] } })).toHaveLength(1);
    expect(extractJobs({ nope: true })).toBeNull();
  });
});

describe('mapAggregatorJob', () => {
  it('maps to a pending, admin-only aggregator job', () => {
    const mapped = mapAggregatorJob(sample, now);
    expect(mapped.ok).toBe(true);
    expect(mapped.doc.source).toBe('aggregator');
    expect(mapped.doc.verificationStatus).toBe('pending');
    expect(mapped.doc.examType).toBe('other');
    expect(mapped.doc.department).toBe('Kerala Public Service Commission');
    expect(mapped.doc.state).toBe('Kerala');
    expect(mapped.doc.totalVacancies).toBe(12);
    expect(mapped.doc.applicationEndDate.toISOString()).toMatch(/^2026-11-30/);
    expect(mapped.doc.jobStatus).toBe('active');
    expect(mapped.doc.aggregatorMeta).toMatchObject({ id: 'abc123', sourceId: 'keralapsc', category: 'new' });
  });

  it('marks past dates as closed and keeps the aggregator category', () => {
    const mapped = mapAggregatorJob({ ...sample, lastDate: '2026-01-01', category: 'expired' }, now);
    expect(mapped.doc.jobStatus).toBe('closed');
    expect(mapped.doc.aggregatorMeta.category).toBe('expired');
  });

  it('derives a stable id from the notification URL when missing', () => {
    const a = mapAggregatorJob({ ...sample, id: undefined }, now);
    const b = mapAggregatorJob({ ...sample, id: undefined }, now);
    expect(a.id).toBe(hashId(sample.notificationUrl));
    expect(a.id).toBe(b.id);
    expect(a.doc.slug).toBe(b.doc.slug);
  });

  it('rejects records without a title or a real URL', () => {
    expect(mapAggregatorJob({ ...sample, title: '  ' }, now).ok).toBe(false);
    expect(mapAggregatorJob({ ...sample, notificationUrl: 'javascript:void(0)' }, now).ok).toBe(false);
    expect(mapAggregatorJob(null, now).ok).toBe(false);
  });

  it('buildUpdate targets the aggregator id and never touches verification', () => {
    const mapped = mapAggregatorJob(sample, now);
    const { filter, update } = buildUpdate(mapped.id, mapped.doc);
    expect(filter).toEqual({ 'aggregatorMeta.id': 'abc123' });
    expect(update.$set).not.toHaveProperty('verificationStatus');
    expect(update.$set.jobStatus).toBe('active');
  });
});

// --- importJobItems (batched upsert used by both the upload and auto-sync) ---

const item = (id, title) => ({
  id,
  title,
  notificationUrl: `https://example.gov.in/${id}.pdf`,
  source: 'upsc',
  state: 'All India',
});

const withExisting = (ids) => {
  Job.find.mockReturnValue({
    select: () => ({ lean: async () => ids.map((id) => ({ aggregatorMeta: { id } })) }),
  });
};

describe('importJobItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Job.bulkWrite.mockResolvedValue({ insertedCount: 0, matchedCount: 0 });
  });

  it('splits the batch into inserts and updates with one existing-ids lookup', async () => {
    withExisting(['a']);
    Job.bulkWrite.mockResolvedValue({ insertedCount: 1, matchedCount: 1 });

    const result = await importJobItems([
      item('a', 'Alpha'),
      item('b', 'Beta'),
      { title: '' }, // invalid: no title
      { title: 'No url' }, // invalid: no notificationUrl
    ]);

    expect(result).toMatchObject({ received: 4, created: 1, updated: 1, skipped: 2 });
    expect(result.errors).toHaveLength(2);

    // One find + one bulkWrite — never a query per job.
    expect(Job.find).toHaveBeenCalledTimes(1);
    expect(Job.find).toHaveBeenCalledWith({ 'aggregatorMeta.id': { $in: ['a', 'b'] } });
    expect(Job.bulkWrite).toHaveBeenCalledTimes(1);

    const ops = Job.bulkWrite.mock.calls[0][0];
    expect(ops).toHaveLength(2);
    expect(ops[0].updateOne.filter).toEqual({ 'aggregatorMeta.id': 'a' });
    expect(ops[1].insertOne.document.title).toBe('Beta');
    expect(ops[1].insertOne.document.source).toBe('aggregator');
    expect(ops[1].insertOne.document.verificationStatus).toBe('pending');
  });

  it('never touches Mongo when every item is invalid', async () => {
    const result = await importJobItems([{ title: '' }, { title: 'No url' }]);
    expect(result).toMatchObject({ received: 2, created: 0, updated: 0, skipped: 2 });
    expect(Job.find).not.toHaveBeenCalled();
    expect(Job.bulkWrite).not.toHaveBeenCalled();
  });

  it('recovers per-op write failures from the bulk result', async () => {
    withExisting([]);
    Job.bulkWrite.mockRejectedValue(Object.assign(new Error('bulk failed'), {
      writeErrors: [{ index: 0, err: { message: 'E11000 duplicate key' } }],
      result: { insertedCount: 1, matchedCount: 0 },
    }));

    const result = await importJobItems([item('x', 'Gamma'), item('y', 'Delta')]);
    expect(result).toMatchObject({ received: 2, created: 1, updated: 0, skipped: 1 });
    expect(result.errors[0]).toMatchObject({ title: 'Gamma', error: 'E11000 duplicate key' });
  });

  it('counts the batch as skipped when bulkWrite fails without detail', async () => {
    withExisting([]);
    Job.bulkWrite.mockRejectedValue(new Error('connection reset'));

    const result = await importJobItems([item('x', 'Gamma'), item('y', 'Delta')]);
    expect(result).toMatchObject({ received: 2, created: 0, updated: 0, skipped: 2 });
    expect(result.errors[0].error).toContain('connection reset');
  });
});
