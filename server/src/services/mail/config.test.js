import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { providerChain, isDryRun, isPaused } from './config.js';

const MANAGED = [
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'BREVO_API_KEY',
  'BREVO_ENABLED',
  'SMTP_USER',
  'SMTP_PASS',
  'ALLOW_SMTP',
  'EMAIL_PROVIDER',
  'MAIL_DRY_RUN',
  'MAIL_PAUSED',
];

describe('mail provider chain', () => {
  beforeEach(() => {
    for (const key of MANAGED) vi.stubEnv(key, '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns no providers when nothing is configured', () => {
    expect(providerChain()).toEqual([]);
  });

  it('prefers Resend when its key is present', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    expect(providerChain()).toEqual(['resend']);
  });

  it('orders Resend before SendGrid, and honours EMAIL_PROVIDER', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('SENDGRID_API_KEY', 'SG.test');
    expect(providerChain()).toEqual(['resend', 'sendgrid']);

    vi.stubEnv('EMAIL_PROVIDER', 'sendgrid');
    expect(providerChain()).toEqual(['sendgrid', 'resend']);
  });

  it('keeps Brevo disabled until explicitly enabled', () => {
    vi.stubEnv('BREVO_API_KEY', 'xkeysib-test');
    expect(providerChain()).toEqual([]);

    vi.stubEnv('BREVO_ENABLED', 'true');
    expect(providerChain()).toEqual(['brevo']);

    vi.stubEnv('EMAIL_PROVIDER', 'brevo');
    vi.stubEnv('BREVO_ENABLED', '');
    expect(providerChain()).toEqual(['brevo']);
  });

  it('keeps SMTP local-development only unless opted in', () => {
    vi.stubEnv('SMTP_USER', 'dev@gmail.com');
    vi.stubEnv('SMTP_PASS', 'app-password');
    expect(providerChain()).toEqual([]);

    vi.stubEnv('ALLOW_SMTP', 'true');
    expect(providerChain()).toEqual(['smtp']);
  });

  it('reads dry-run and paused flags', () => {
    expect(isDryRun()).toBe(false);
    expect(isPaused()).toBe(false);
    vi.stubEnv('MAIL_DRY_RUN', 'true');
    vi.stubEnv('MAIL_PAUSED', '1');
    expect(isDryRun()).toBe(true);
    expect(isPaused()).toBe(true);
  });
});
