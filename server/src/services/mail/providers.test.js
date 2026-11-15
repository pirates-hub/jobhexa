import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../models/MailAttempt.js', () => ({
  default: { create: vi.fn() },
}));

import { sendViaGmailRelay, sendViaMailjet } from './providers.js';

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => JSON.stringify(body),
});

const mail = {
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
};

describe('Mailjet provider', () => {
  beforeEach(() => {
    vi.stubEnv('MAILJET_API_KEY', 'public-key');
    vi.stubEnv('MAILJET_API_SECRET', 'secret-key');
    vi.stubEnv('MAILJET_FROM', 'JobHexa <usethinkllm@gmail.com>');
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('SMTP_FROM', '');
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('RESEND_REPLY_TO', '');
    vi.stubEnv('EMAIL_REPLY_TO', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('posts a v3.1 message with basic auth, sender and headers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, {
      Messages: [{ Status: 'success', To: [{ MessageUUID: 'mj-uuid-1' }] }],
    })));

    const result = await sendViaMailjet({
      ...mail,
      headers: {
        'List-Unsubscribe': '<https://jobhexa.example/api/unsubscribe?token=abc>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    expect(result).toEqual({ provider: 'mailjet', messageId: 'mj-uuid-1' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.mailjet.com/v3.1/send');
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from('public-key:secret-key').toString('base64')}`
    );

    const payload = JSON.parse(options.body);
    expect(payload.Messages[0]).toMatchObject({
      From: { Email: 'usethinkllm@gmail.com', Name: 'JobHexa' },
      To: [{ Email: 'user@example.com' }],
      Subject: 'Hello',
      TextPart: 'Hello',
      HTMLPart: '<p>Hello</p>',
      Headers: {
        'List-Unsubscribe': '<https://jobhexa.example/api/unsubscribe?token=abc>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  });

  it('surfaces a Mailjet API error with its status code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, {
      ErrorMessage: 'Invalid API key',
    })));

    await expect(sendViaMailjet(mail)).rejects.toMatchObject({
      name: 'MailProviderError',
      statusCode: 401,
    });
  });

  it('treats a per-message error as a failed send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, {
      Messages: [{ Status: 'error', Errors: [{ ErrorMessage: 'Sender not validated' }] }],
    })));

    await expect(sendViaMailjet(mail)).rejects.toThrow(/Sender not validated/);
  });
});

describe('Gmail relay provider', () => {
  beforeEach(() => {
    vi.stubEnv('GMAIL_RELAY_URL', 'https://script.google.com/macros/s/test/exec');
    vi.stubEnv('GMAIL_RELAY_SECRET', 'relay-secret');
    vi.stubEnv('GMAIL_FROM', 'usethinkllm@gmail.com');
    vi.stubEnv('GMAIL_SENDER_NAME', 'JobHexa');
    vi.stubEnv('GMAIL_REPLY_TO', '');
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('SMTP_FROM', '');
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('RESEND_REPLY_TO', '');
    vi.stubEnv('EMAIL_REPLY_TO', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('posts the message to the Apps Script relay with the shared secret', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, {
      ok: true,
      messageId: 'relay-1',
      remaining: 99,
    })));

    const result = await sendViaGmailRelay({
      ...mail,
      headers: {
        'List-Unsubscribe': '<https://jobhexa.example/api/unsubscribe?token=abc>',
      },
    });

    expect(result).toEqual({ provider: 'gmail_relay', messageId: 'relay-1' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://script.google.com/macros/s/test/exec');
    expect(options.headers['Content-Type']).toBe('application/json');

    const payload = JSON.parse(options.body);
    expect(payload).toMatchObject({
      secret: 'relay-secret',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
      fromName: 'JobHexa',
      replyTo: 'usethinkllm@gmail.com',
      headers: {
        'List-Unsubscribe': '<https://jobhexa.example/api/unsubscribe?token=abc>',
      },
    });
  });

  it('treats an unauthorized relay response as a 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, {
      ok: false,
      error: 'unauthorized',
    })));

    await expect(sendViaGmailRelay(mail)).rejects.toMatchObject({
      name: 'MailProviderError',
      statusCode: 401,
    });
  });

  it('explains an HTML response from a misconfigured deployment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => '<html><body>Sign in to continue</body></html>',
    }));

    await expect(sendViaGmailRelay(mail)).rejects.toThrow(/Anyone/);
  });
});
