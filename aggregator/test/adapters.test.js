import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverHtmlLinks, discoverRssItems } from '../src/discover.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'fixtures', 'tnpsc-list.html'), 'utf8');
const rss = fs.readFileSync(path.join(here, 'fixtures', 'sample-feed.xml'), 'utf8');

describe('html adapter fixture (TNPSC-style list)', () => {
  it('finds the recruitment PDF, skips banner and social links', () => {
    const docs = discoverHtmlLinks(html, 'https://www.tnpsc.gov.in', { limit: 10 });
    expect(docs[0].url).toMatch(/group-2-notification\.pdf/);
    expect(docs.every((d) => !/banner|facebook/i.test(d.url))).toBe(true);
  });
});

describe('rss adapter fixture', () => {
  it('extracts items with links and filters noise', () => {
    const docs = discoverRssItems(rss, 'https://example.gov.in', { limit: 10 });
    expect(docs.length).toBe(1);
    expect(docs[0].url).toBe('https://example.gov.in/advt-2026.pdf');
  });
});
