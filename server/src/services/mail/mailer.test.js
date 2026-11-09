import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../models/MailDelivery.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/MailAttempt.js', () => ({
  default: { create: vi.fn() },
}));

import MailDelivery from '../../models/MailDelivery.js';
import MailAttempt from '../../models/MailAttempt.js';
import { isSendableAddress, sendFlowMail } from './mailer.js';

const user = { _id: '507f1f77bcf86cd799439011', email: 'user@example.com' };
const template = () => ({ subject: 'Test mail', html: '<p>Hi</p>', text: 'Hi' });

describe('sendFlowMail idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MAIL_DRY_RUN', 'true');
    vi.stubEnv('MAIL_SEND_DELAY_MS', '0');
    MailDelivery.updateOne.mockResolvedValue({});
    MailAttempt.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('skips a period that was already sent', async () => {
    MailDelivery.findOne.mockResolvedValue({ status: 'sent', attempts: 1 });
    const result = await sendFlowMail({
      user,
      flow: 'eligible_digest',
      periodKey: '2026-11-09',
      template,
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('already_sent');
    expect(MailDelivery.create).not.toHaveBeenCalled();
  });

  it('claims and marks a new period as sent', async () => {
    MailDelivery.findOne.mockResolvedValue(null);
    MailDelivery.create.mockResolvedValue({ _id: 'delivery-1', status: 'sending', attempts: 1 });

    const result = await sendFlowMail({
      user,
      flow: 'eligible_digest',
      periodKey: '2026-11-09',
      template,
    });

    expect(result.skipped).toBe(false);
    expect(result.provider).toBe('mock');
    expect(MailDelivery.updateOne).toHaveBeenCalledWith(
      { _id: 'delivery-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'sent', provider: 'mock' }),
      })
    );
  });

  it('stops retrying after the attempt limit', async () => {
    MailDelivery.findOne.mockResolvedValue({
      status: 'failed',
      attempts: 4,
      updatedAt: new Date(),
    });
    const result = await sendFlowMail({
      user,
      flow: 'study_plan',
      periodKey: 'plan_p1_day_2',
      template,
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('max_attempts');
    expect(MailDelivery.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects the unmailed jobhexa.com domain but accepts normal addresses', () => {
    vi.stubEnv('MAIL_ALLOW_INTERNAL', '');
    expect(isSendableAddress('person@jobhexa.com')).toBe(false);
    expect(isSendableAddress('person@gmail.com')).toBe(true);
    expect(isSendableAddress('not-an-email')).toBe(false);
  });
});
