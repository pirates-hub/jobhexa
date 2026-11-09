import { describe, it, expect } from 'vitest';
import { dueFlowNames, minutesIST } from './flows.js';

describe('IST flow catch-up', () => {
  it('converts UTC instants to IST minutes across midnight', () => {
    expect(minutesIST(new Date('2026-11-09T01:25:00Z'))).toBe(6 * 60 + 55); // 06:55 IST
    expect(minutesIST(new Date('2026-11-09T02:30:00Z'))).toBe(8 * 60); // 08:00 IST
    expect(minutesIST(new Date('2026-11-09T18:30:00Z'))).toBe(0); // 00:00 IST next day
  });

  it('runs only flows whose scheduled IST slot has passed', () => {
    expect(dueFlowNames(new Date('2026-11-09T01:25:00Z'))).toEqual([]); // 06:55
    expect(dueFlowNames(new Date('2026-11-09T01:30:00Z'))).toEqual(['eligible_digest']); // 07:00
    expect(dueFlowNames(new Date('2026-11-09T02:29:00Z'))).toEqual(['eligible_digest']); // 07:59
    expect(dueFlowNames(new Date('2026-11-09T02:30:00Z'))).toEqual([
      'eligible_digest',
      'study_plan',
    ]); // 08:00
    expect(dueFlowNames(new Date('2026-11-09T03:30:00Z'))).toEqual([
      'eligible_digest',
      'study_plan',
      'deadline_reminder',
    ]); // 09:00
  });
});
