import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncToServer } from '../src/sync.js';
import { loadEnvFile } from '../src/config.js';

const jobs = [{ id: 't1', title: 'Test notification', notificationUrl: 'https://example.gov.in/notice.pdf' }];

function tempExport() {
  const file = path.join(os.tmpdir(), `agg-sync-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(jobs));
  return file;
}

const okResponse = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });

describe('syncToServer', () => {
  it('skips quietly when AGG_SYNC_URL / AGG_SYNC_SECRET are not configured', async () => {
    const res = await syncToServer({ url: '', secret: '', file: tempExport(), fetchImpl: () => { throw new Error('must not fetch'); } });
    expect(res).toEqual({ skipped: true, reason: 'not-configured' });
  });

  it('POSTs the jobs.json payload with the shared-secret header', async () => {
    const file = tempExport();
    let captured;
    const fetchImpl = async (url, init) => {
      captured = { url, init };
      return okResponse({ received: 1, created: 1, updated: 0, skipped: 0 });
    };
    const res = await syncToServer({ url: 'http://localhost/api/aggregator/sync', secret: 's3cret', file, fetchImpl });
    expect(res.ok).toBe(true);
    expect(res.created).toBe(1);
    expect(captured.url).toBe('http://localhost/api/aggregator/sync');
    expect(captured.init.headers['x-aggregator-sync-secret']).toBe('s3cret');
    expect(JSON.parse(captured.init.body)).toEqual(jobs);
  });

  it('retries server errors and succeeds on a later attempt', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return calls === 1 ? { ok: false, status: 500, json: async () => ({}) } : okResponse({ received: 1, created: 0, updated: 1, skipped: 0 });
    };
    const res = await syncToServer({ url: 'http://x/sync', secret: 's', file: tempExport(), fetchImpl, retryDelayMs: 0 });
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('does not retry 4xx responses (bad secret / bad URL fail fast)', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: false, status: 401, json: async () => ({}) };
    };
    const res = await syncToServer({ url: 'http://x/sync', secret: 'wrong', file: tempExport(), fetchImpl, retryDelayMs: 0 });
    expect(res).toEqual({ ok: false, error: 'HTTP 401' });
    expect(calls).toBe(1);
  });

  it('never throws: network failures come back as { ok: false }', async () => {
    const fetchImpl = async () => { throw new TypeError('fetch failed'); };
    const res = await syncToServer({ url: 'http://x/sync', secret: 's', file: tempExport(), fetchImpl, retryDelayMs: 0 });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('fetch failed');
  });

  it('POSTs via the default node:http transport against a real server', async () => {
    const http = await import('node:http');
    const received = {};
    const server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        received.headers = req.headers;
        received.body = JSON.parse(raw);
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ success: true, data: { received: 1, created: 1, updated: 0, skipped: 0 } }));
      });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${server.address().port}/api/aggregator/sync`;
    try {
      const res = await syncToServer({ url, secret: 'top-secret', file: tempExport() });
      expect(res).toMatchObject({ ok: true, created: 1 });
      expect(received.headers['x-aggregator-sync-secret']).toBe('top-secret');
      expect(received.headers['content-type']).toContain('application/json');
      expect(received.body).toEqual(jobs);
    } finally {
      server.close();
    }
  });
});

describe('loadEnvFile', () => {
  it('fills unset variables, keeps real env values, and unquotes values', () => {
    const file = path.join(os.tmpdir(), `agg-env-${Date.now()}.json.env`);
    fs.writeFileSync(file, [
      '# comment line',
      'TEST_AGG_NEW=http://localhost:5000/api/aggregator/sync',
      'TEST_AGG_QUOTED="keep-the-quotes-value"',
      'TEST_AGG_PRESET=from-file',
      '',
    ].join('\n'));
    process.env.TEST_AGG_PRESET = 'from-environment';
    try {
      expect(loadEnvFile(file)).toBe(true);
      expect(process.env.TEST_AGG_NEW).toBe('http://localhost:5000/api/aggregator/sync');
      expect(process.env.TEST_AGG_QUOTED).toBe('keep-the-quotes-value');
      expect(process.env.TEST_AGG_PRESET).toBe('from-environment'); // real env wins
    } finally {
      delete process.env.TEST_AGG_NEW;
      delete process.env.TEST_AGG_QUOTED;
      delete process.env.TEST_AGG_PRESET;
      fs.rmSync(file, { force: true });
    }
  });

  it('returns false when the file does not exist', () => {
    expect(loadEnvFile(path.join(os.tmpdir(), 'definitely-missing.env'))).toBe(false);
  });
});
