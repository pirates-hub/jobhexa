import { describe, it, expect } from 'vitest';
import { extractJobs, mapAggregatorJob, hashId, buildUpdate } from './aggregatorImport.service.js';

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
