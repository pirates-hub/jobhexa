import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  adminManual,
  deadlineReminder,
  eligibleDigest,
  formatDate,
  passwordReset,
  studyPlanDay,
  welcome,
} from './templates.js';

const user = { _id: 'u1', name: 'Ravi Kumar', email: 'ravi@example.com' };
const unsubscribeUrl = 'https://api.jobhexa.test/api/unsubscribe?token=abc';
const prefs = 'https://jobhexa.test/profile';

const job = {
  _id: 'j1',
  slug: 'ssc-cgl-2026',
  title: 'SSC CGL 2026',
  department: 'Staff Selection Commission',
  state: 'All India',
  totalVacancies: 1200,
  applicationEndDate: '2026-12-31T00:00:00.000Z',
};

describe('mail templates', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://jobhexa.test';
  });

  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it('formats dates and absent values without inventing data', () => {
    expect(formatDate(null)).toBe('Not specified');
    expect(formatDate('not-a-date')).toBe('Not specified');
    expect(formatDate('2026-12-31T00:00:00.000Z')).toContain('2026');
  });

  it('renders an eligible digest with a matching count and unsubscribe footer', () => {
    const mail = eligibleDigest({ user, jobs: [job], unsubscribeUrl, preferencesUrl: prefs });
    expect(mail.subject).toBe('1 job matches your profile — JobHexa');
    expect(mail.html).toContain('SSC CGL 2026');
    expect(mail.html).toContain('Staff Selection Commission');
    expect(mail.html).toContain('Vacancies:');
    expect(mail.html).toContain(unsubscribeUrl);
    expect(mail.text).toContain('Unsubscribe');
    expect(mail.text).toContain('https://jobhexa.test/jobs/ssc-cgl-2026');
  });

  it('escapes job titles and user names in HTML', () => {
    const hostile = {
      ...job,
      title: '<script>alert(1)</script>',
      department: '<b>Dept</b>',
    };
    const mail = eligibleDigest({
      user: { ...user, name: '<img src=x>' },
      jobs: [hostile],
      unsubscribeUrl,
      preferencesUrl: prefs,
    });
    expect(mail.html).not.toContain('<script>alert(1)</script>');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mail.html).toContain('Hi &lt;img');
    expect(mail.html).not.toContain('<img src=x>');
  });

  it('shows Not specified when a job has no department, vacancies or deadline', () => {
    const sparse = { _id: 'j2', slug: 'sparse', title: 'Sparse Job' };
    const mail = eligibleDigest({ user, jobs: [sparse], unsubscribeUrl, preferencesUrl: prefs });
    expect(mail.html).toContain('Not specified');
    expect(mail.html).toContain('Department not specified');
    expect(mail.html).toContain('All India');
  });

  it('changes the deadline subject on the last day', () => {
    const lastDay = deadlineReminder({ user, job, daysLeft: 0, unsubscribeUrl, preferencesUrl: prefs });
    expect(lastDay.subject).toBe('Last day to apply: SSC CGL 2026');
    expect(lastDay.html).toContain('Last day to apply');

    const threeDays = deadlineReminder({ user, job, daysLeft: 3, unsubscribeUrl, preferencesUrl: prefs });
    expect(threeDays.subject).toBe('3 days left: SSC CGL 2026');
  });

  it('renders study-plan tasks and escapes them', () => {
    const plan = { _id: 'p1', exam: 'SSC CGL', plan: [{ day: 1 }, { day: 2 }] };
    const day = { day: 2, topic: 'Percentage <basics>', subject: 'Maths', hours: 2, tasks: ['Read chapter 4', '<solve> 20 questions'] };
    const mail = studyPlanDay({ user, plan, day, unsubscribeUrl, preferencesUrl: prefs });
    expect(mail.subject).toBe('Day 2: Percentage <basics> — Study Plan');
    expect(mail.html).toContain('Percentage &lt;basics&gt;');
    expect(mail.html).toContain('&lt;solve&gt; 20 questions');
    expect(mail.text).toContain('Day 2 of your SSC CGL plan');
  });

  it('renders welcome and password-reset links', () => {
    const hello = welcome({ user, preferencesUrl: prefs });
    expect(hello.subject).toBe('Welcome to JobHexa');
    expect(hello.html).toContain('Ravi');

    const reset = passwordReset({
      user,
      link: 'https://jobhexa.test/reset-password/abc123',
      expiresMinutes: 10,
      preferencesUrl: prefs,
    });
    expect(reset.subject).toBe('Reset your JobHexa password');
    expect(reset.html).toContain('https://jobhexa.test/reset-password/abc123');
    expect(reset.text).toContain('10 minutes');
  });

  it('wraps admin manual messages in the shared layout', () => {
    const mail = adminManual({
      name: 'Ravi',
      message: 'Line one\n\nLine two <unsafe>',
      unsubscribeUrl,
      preferencesUrl: prefs,
    });
    expect(mail.html).toContain('Line one');
    expect(mail.html).toContain('&lt;unsafe&gt;');
    expect(mail.html).toContain(unsubscribeUrl);
  });
});
