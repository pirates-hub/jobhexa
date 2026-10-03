import { describe, it, expect } from 'vitest';
import { checkEligibility } from './eligibility.service.js';

describe('checkEligibility', () => {
  const baseJob = {
    state: 'All India',
    eligibility: {
      qualifications: [{ level: 'graduate' }],
      ageMin: 18,
      ageMax: 32,
      ageRelaxation: { OBC: 3, SC: 5, ST: 5 },
    },
    applicationEndDate: new Date('2026-09-12'),
  };

  it('should return eligible when user meets qualification, age and state', () => {
    const user = {
      qualification: { highest: 'graduate' },
      dateOfBirth: '1999-06-15', // age 27 on 2026-09-12
      category: 'General',
      state: 'Uttar Pradesh',
    };
    const result = checkEligibility(user, baseJob);
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(80);
    expect(result.breakdown.qualification.met).toBe(true);
    expect(result.breakdown.age.met).toBe(true);
  });

  it('should return not eligible when qualification is too low', () => {
    const user = {
      qualification: { highest: '12th' },
      dateOfBirth: '1999-06-15',
      category: 'General',
      state: 'Uttar Pradesh',
    };
    const result = checkEligibility(user, baseJob);
    expect(result.eligible).toBe(false);
    expect(result.breakdown.qualification.met).toBe(false);
  });

  it('should return not eligible when age exceeds limit without relaxation', () => {
    const user = {
      qualification: { highest: 'graduate' },
      dateOfBirth: '1985-01-01', // age 41 on 2026-09-12, exceeds 32
      category: 'General',
      state: 'Uttar Pradesh',
    };
    const result = checkEligibility(user, baseJob);
    expect(result.eligible).toBe(false);
    expect(result.breakdown.age.met).toBe(false);
  });

  it('should be eligible with OBC age relaxation', () => {
    const user = {
      qualification: { highest: 'graduate' },
      dateOfBirth: '1991-09-12', // age 35 on 2026-09-12, 35 <= 32+3 (OBC)
      category: 'OBC',
      state: 'Bihar',
    };
    const result = checkEligibility(user, baseJob);
    expect(result.breakdown.age.met).toBe(true);
    expect(result.eligible).toBe(true);
  });

  it('should handle state domicile mismatch', () => {
    const stateJob = {
      ...baseJob,
      state: 'Maharashtra',
    };
    const user = {
      qualification: { highest: 'graduate' },
      dateOfBirth: '1999-06-15',
      category: 'General',
      state: 'Bihar',
    };
    const result = checkEligibility(user, stateJob);
    expect(result.breakdown.state.met).toBe(false);
    expect(result.eligible).toBe(false);
  });

  it('should apply ex-serviceman relaxation despite key style mismatch', () => {
    const job = { ...baseJob, eligibility: { ...baseJob.eligibility, ageRelaxation: { exServiceman: 5 } } };
    const user = {
      qualification: { highest: 'graduate' },
      dateOfBirth: '1989-09-12', // age 37 on 2026-09-12, 37 <= 32+5
      category: 'ex-serviceman',
      state: 'Uttar Pradesh',
    };
    const result = checkEligibility(user, job);
    expect(result.breakdown.age.relaxation).toBe(5);
    expect(result.breakdown.age.met).toBe(true);
  });

  it('should enforce required field and percentage when specified', () => {
    const job = {
      ...baseJob,
      eligibility: { qualifications: [{ level: 'graduate', field: 'Computer Science', percentage: 60 }] },
    };
    const wrongField = checkEligibility({
      qualification: { highest: 'graduate', field: 'History', percentage: 80 },
      dateOfBirth: '1999-06-15', category: 'General', state: 'Uttar Pradesh',
    }, job);
    expect(wrongField.breakdown.qualification.met).toBe(false);
    const lowPct = checkEligibility({
      qualification: { highest: 'graduate', field: 'Computer Science', percentage: 55 },
      dateOfBirth: '1999-06-15', category: 'General', state: 'Uttar Pradesh',
    }, job);
    expect(lowPct.breakdown.qualification.met).toBe(false);
    const ok = checkEligibility({
      qualification: { highest: 'graduate', field: 'B.Tech Computer Science', percentage: 76 },
      dateOfBirth: '1999-06-15', category: 'General', state: 'Uttar Pradesh',
    }, job);
    expect(ok.breakdown.qualification.met).toBe(true);
  });

  it('should gate restricted-category posts instead of auto-passing', () => {
    const job = { ...baseJob, eligibility: { ...baseJob.eligibility, allowedCategories: ['sc', 'st'] } };
    const outsider = checkEligibility({
      qualification: { highest: 'graduate' }, dateOfBirth: '1999-06-15', category: 'general', state: 'Uttar Pradesh',
    }, job);
    expect(outsider.breakdown.category.met).toBe(false);
    expect(outsider.eligible).toBe(false);
    const insider = checkEligibility({
      qualification: { highest: 'graduate' }, dateOfBirth: '1999-06-15', category: 'sc', state: 'Uttar Pradesh',
    }, job);
    expect(insider.eligible).toBe(true);
  });

  it('should return incomplete-profile instead of ineligible when DOB is missing', () => {
    const result = checkEligibility({
      qualification: { highest: 'graduate' }, category: 'General', state: 'Uttar Pradesh',
    }, baseJob);
    expect(result.eligible).toBeNull();
    expect(result.incompleteProfile).toBe(true);
    expect(result.missing).toContain('dateOfBirth');
  });
});
