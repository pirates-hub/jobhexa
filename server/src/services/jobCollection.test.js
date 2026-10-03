import { describe, it, expect } from 'vitest';
import SOURCES, { validateRegistry } from '../config/officialSources.js';
import {
  sha256Hex,
  normalizeUrl,
  discoverDocuments,
  discoverFromRss,
  dedupKey,
  normKey,
  windowStatus,
  validateExtracted,
  buildPendingJob,
} from './jobCollection.service.js';

describe('official source registry (no fake URLs)', () => {
  it('accepts the shipped registry', () => {
    const { valid, errors } = validateRegistry(SOURCES);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('every entry has a real https URL, method, and manual reason where needed', () => {
    for (const s of SOURCES) {
      expect(s.officialUrl).toMatch(/^https:\/\//);
      expect(['auto', 'manual']).toContain(s.collectionMethod);
      if (s.collectionMethod === 'manual') expect(s.manualReason).toBeTruthy();
    }
    expect(SOURCES.filter((s) => s.collectionMethod === 'auto').length).toBeGreaterThan(0);
  });

  it('rejects placeholder, non-https, duplicate, and reasonless entries', () => {
    const bad = [
      { name: 'X1', officialUrl: 'https://example.com/jobs', collectionMethod: 'auto' },
      { name: 'X2', officialUrl: 'http://real.gov.in', collectionMethod: 'auto' },
      { name: 'X3', officialUrl: 'https://real.gov.in', collectionMethod: 'manual' },
      { name: 'X4', officialUrl: 'https://a.gov.in', collectionMethod: 'auto' },
      { name: 'X4', officialUrl: 'https://b.gov.in', collectionMethod: 'auto' },
    ];
    const { valid, errors } = validateRegistry(bad);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('change detection primitives', () => {
  it('sha256 is stable and content-sensitive', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });

  it('normalizeUrl resolves relative links and rejects pseudo-links', () => {
    expect(normalizeUrl('/a/b.pdf', 'https://x.gov.in')).toBe('https://x.gov.in/a/b.pdf');
    expect(normalizeUrl('javascript:void(0)', 'https://x.gov.in')).toBeNull();
    expect(normalizeUrl('mailto:a@b.in', 'https://x.gov.in')).toBeNull();
    expect(normalizeUrl('#top', 'https://x.gov.in')).toBeNull();
  });

  it('discovery ranks recruitment PDFs first, skips banners/social', () => {
    const html = `
      <a href="/awareness/Banner.pdf">Awareness Banner</a>
      <a href="/notices/recruitment-advertisement-2026.pdf">Recruitment Advertisement 2026</a>
      <a href="/about.html">About us</a>
      <a href="https://facebook.com/x">Facebook</a>`;
    const docs = discoverDocuments(html, 'https://x.gov.in', 10);
    expect(docs[0].url).toMatch(/recruitment-advertisement/);
    expect(docs.every((d) => !/Banner|facebook|about/i.test(d.url))).toBe(true);
  });

  it('discovers recruitment items from RSS/Atom feeds', () => {
    const rss = `<?xml version="1.0"?><rss><channel>
      <item><title>Recruitment Advertisement 2026</title><link>https://x.gov.in/notices/advt.pdf</link></item>
      <item><title>Holiday list</title><link>https://x.gov.in/holiday.html</link></item>
    </channel></rss>`;
    const docs = discoverFromRss(rss, 'https://x.gov.in', 10);
    expect(docs.length).toBe(1);
    expect(docs[0].url).toMatch(/advt\.pdf/);
  });

  it('supports Atom entry links with href attributes', () => {
    const atom = `<feed><entry><title>Engagement Notice</title><link href="https://x.gov.in/engagement.html"/></entry></feed>`;
    const docs = discoverFromRss(atom, 'https://x.gov.in', 10);
    expect(docs.length).toBe(1);
  });
});

describe('deduplication keys', () => {
  it('matches same org+title despite case/punctuation', () => {
    expect(dedupKey('IBPS', 'RRB XV 2026')).toBe(dedupKey('ibps', 'RRB-XV (2026)'));
    expect(normKey('  Hello, World! ')).toBe('hello world');
  });

  it('different titles produce different keys (never title-only anyway)', () => {
    expect(dedupKey('SSC', 'CHSL 2026')).not.toBe(dedupKey('SSC', 'JE 2026'));
  });
});

describe('lifecycle windows', () => {
  const now = new Date('2026-09-13T12:00:00Z');
  it('active when window covers now', () => {
    expect(windowStatus('2026-09-01', '2026-09-30', now)).toBe('active');
  });
  it('closing_soon within 3 days of the end', () => {
    expect(windowStatus('2026-09-01', '2026-09-14', now)).toBe('closing_soon');
  });
  it('upcoming/closed outside the window', () => {
    expect(windowStatus('2026-10-01', '2026-10-31', now)).toBe('upcoming');
    expect(windowStatus('2026-08-01', '2026-08-31', now)).toBe('closed');
  });
  it('indeterminate without dates (caller keeps existing status)', () => {
    expect(windowStatus(null, null, now)).toBeNull();
  });
});

describe('extracted-record validation', () => {
  const good = {
    title: 'Test Post', organization: 'Test Board', officialUrl: 'https://x.gov.in',
    applicationStartDate: '2026-09-01', applicationEndDate: '2026-09-30', totalVacancies: 10,
  };
  it('accepts a valid record', () => {
    expect(validateExtracted(good).valid).toBe(true);
  });
  it('rejects missing title/org, bad URL, bad dates, inverted window', () => {
    expect(validateExtracted({ ...good, title: '' }).valid).toBe(false);
    expect(validateExtracted({ ...good, organization: '' }).valid).toBe(false);
    expect(validateExtracted({ ...good, officialUrl: 'notaurl' }).valid).toBe(false);
    expect(validateExtracted({ ...good, applicationEndDate: 'not-a-date' }).valid).toBe(false);
    expect(validateExtracted({ ...good, applicationStartDate: '2026-10-01' }).valid).toBe(false);
    expect(validateExtracted(null).valid).toBe(false);
  });
});

describe('pending-only job building (never auto-publish)', () => {
  const source = { fullName: 'Test Board', officialUrl: 'https://x.gov.in', examType: 'central', level: 'central', state: 'All India' };
  it('always creates pending/ai_extracted records with review note', () => {
    const start = new Date(Date.now() - 86400000).toISOString();
    const end = new Date(Date.now() + 30 * 86400000).toISOString();
    const job = buildPendingJob(
      { title: 'T', organization: 'B', officialUrl: 'https://x.gov.in', applicationStartDate: start, applicationEndDate: end },
      source,
      { url: 'https://x.gov.in/n.pdf' }
    );
    expect(job.verificationStatus).toBe('pending');
    expect(job.source).toBe('ai_extracted');
    expect(job.verificationNotes).toMatch(/NEEDS ADMIN REVIEW/);
    expect(job.jobStatus).toBe('active');
    expect(job.notificationPdfUrl).toBe('https://x.gov.in/n.pdf');
  });

  it('derives lifecycle from the window and omits unconfirmed fields', () => {
    const job = buildPendingJob(
      { title: 'T', organization: 'B', officialUrl: 'https://x.gov.in' },
      source,
      { url: 'https://x.gov.in/n.html' }
    );
    expect(job.jobStatus).toBe('active');
    expect(job.totalVacancies).toBeUndefined();
    expect(job.notificationPdfUrl).toBeUndefined();
  });
});
