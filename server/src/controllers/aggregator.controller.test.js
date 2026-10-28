import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/aggregatorImport.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, importJobItems: vi.fn(async () => ({ received: 1, created: 1, updated: 0, skipped: 0, errors: [] })) };
});

import { syncAggregatorJobs } from './aggregator.controller.js';
import { importJobItems } from '../services/aggregatorImport.service.js';

const mockReq = (body, headers = {}) => ({ body, get: (name) => headers[String(name).toLowerCase()] });
const mockRes = () => {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

describe('syncAggregatorJobs (aggregator auto-import endpoint)', () => {
  beforeEach(() => { process.env.AGG_SYNC_SECRET = 'test-secret-123'; });
  afterEach(() => {
    delete process.env.AGG_SYNC_SECRET;
    vi.clearAllMocks();
  });

  it('is disabled (503) when AGG_SYNC_SECRET is not configured', async () => {
    delete process.env.AGG_SYNC_SECRET;
    const res = mockRes();
    await syncAggregatorJobs(mockReq({ jobs: [] }, { 'x-aggregator-sync-secret': 'anything' }), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.message).toContain('AGG_SYNC_SECRET');
    expect(importJobItems).not.toHaveBeenCalled();
  });

  it('rejects a wrong or missing secret (401)', async () => {
    const wrong = mockRes();
    await syncAggregatorJobs(mockReq({ jobs: [] }, { 'x-aggregator-sync-secret': 'wrong' }), wrong);
    expect(wrong.statusCode).toBe(401);

    const missing = mockRes();
    await syncAggregatorJobs(mockReq({ jobs: [] }), missing);
    expect(missing.statusCode).toBe(401);
    expect(importJobItems).not.toHaveBeenCalled();
  });

  it('rejects payloads without a jobs array (400)', async () => {
    const res = mockRes();
    await syncAggregatorJobs(mockReq({ nope: true }, { 'x-aggregator-sync-secret': 'test-secret-123' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects oversized imports (413)', async () => {
    const res = mockRes();
    const body = { jobs: new Array(2001).fill(null) };
    await syncAggregatorJobs(mockReq(body, { 'x-aggregator-sync-secret': 'test-secret-123' }), res);
    expect(res.statusCode).toBe(413);
    expect(importJobItems).not.toHaveBeenCalled();
  });

  it('imports with a valid secret and reports counts (200)', async () => {
    const res = mockRes();
    const body = { jobs: [{ id: 'a', title: 'Alpha', notificationUrl: 'https://example.gov.in/a.pdf' }] };
    await syncAggregatorJobs(mockReq(body, { 'x-aggregator-sync-secret': 'test-secret-123' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ received: 1, created: 1, sync: true });
    expect(importJobItems).toHaveBeenCalledTimes(1);
  });
});
