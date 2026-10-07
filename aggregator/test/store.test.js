import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, upsertJob, closeDb } from '../src/store.js';

describe('store dedup + history', () => {
  beforeEach(async () => await openDb(':memory:'));

  it('inserts new, ignores unchanged, records updates', () => {
    const base = { source: 'tnpsc', state: 'Tamil Nadu', organization: 'TNPSC', title: 'Group 2 2026', vacancies: 100, lastDate: '2026-10-15', notificationUrl: 'https://x/y.pdf', applyUrl: 'https://x/y.pdf' };
    expect(upsertJob(base)).toBe('new');
    expect(upsertJob(base)).toBe('unchanged');
    expect(upsertJob({ ...base, vacancies: 120 })).toBe('updated');
    closeDb();
  });

  it('marks expired jobs by lastDate', () => {
    upsertJob({ source: 's', state: 'X', organization: 'O', title: 'Old', lastDate: '2020-01-01', notificationUrl: 'https://x' });
    const db2 = upsertJob({ source: 's', state: 'X', organization: 'O2', title: 'New', lastDate: '2099-01-01', notificationUrl: 'https://y' });
    expect(db2).toBe('new');
    closeDb();
  });
});
