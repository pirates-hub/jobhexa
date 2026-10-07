import { describe, it, expect } from 'vitest';
import { parseDate, findDate, cleanDateString } from '../src/dates.js';

describe('cleanDateString', () => {
  it('strips ordinal suffixes', () => {
    expect(cleanDateString('15th Oct 2026')).toBe('15 Oct 2026');
    expect(cleanDateString('1st January 2026')).toBe('1 January 2026');
  });
});

describe('parseDate', () => {
  it('parses dd-mm-yyyy and slashes', () => {
    expect(parseDate('15-10-2026')).toBe('2026-10-15');
    expect(parseDate('15/10/2026')).toBe('2026-10-15');
  });
  it('parses short years by pivot', () => {
    expect(parseDate('15/10/26')).toBe('2026-10-15');
  });
  it('parses month names with ordinals', () => {
    expect(parseDate('15th Oct 2026')).toBe('2026-10-15');
    expect(parseDate('October 5, 2026')).toBe('2026-10-05');
  });
  it('returns null for garbage, never invents', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe('findDate', () => {
  it('finds dates inside notice text', () => {
    expect(findDate('last date 15th Oct 2026 apply fast')).toBe('2026-10-15');
    expect(findDate('closing 15/10/26')).toBe('2026-10-15');
  });
  it('returns null when nothing date-like', () => {
    expect(findDate('no dates here')).toBeNull();
  });
});
