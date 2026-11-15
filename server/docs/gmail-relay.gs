/**
 * JobHexa Gmail relay — free sending without a custom domain.
 *
 * Setup:
 *   1. Open https://script.google.com and create a new project.
 *   2. Replace Code.gs with this file.
 *   3. Change SECRET below to a long random value. Use the same value for
 *      GMAIL_RELAY_SECRET on Render.
 *   4. Deploy > New deployment > Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *   5. Copy the /exec URL and set it as GMAIL_RELAY_URL on Render.
 *
 * Consumer Gmail accounts can send about 100 recipients per day. If the quota
 * is exhausted, GmailApp throws and the app falls back to the next provider.
 *
 * The secret is the only protection: treat the /exec URL and secret like
 * passwords. Never commit the real secret to the repository.
 */

var SECRET = 'REPLACE_WITH_A_LONG_RANDOM_VALUE';

function doGet() {
  return json({ ok: true, service: 'jobhexa-gmail-relay' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty request' });
    }

    var body = JSON.parse(e.postData.contents);
    if (String(body.secret || '') !== SECRET) {
      return json({ ok: false, error: 'unauthorized' });
    }
    if (!body.to || !body.subject) {
      return json({ ok: false, error: 'to and subject are required' });
    }

    var options = {
      name: body.fromName || 'JobHexa',
      replyTo: body.replyTo || undefined,
      htmlBody: body.html || undefined
    };
    if (body.headers && typeof body.headers === 'object') {
      options.headers = body.headers;
    }

    GmailApp.sendEmail(body.to, body.subject, body.text || '', options);

    return json({
      ok: true,
      messageId: 'gmail-relay-' + Date.now(),
      remaining: MailApp.getRemainingDailyQuota()
    });
  } catch (err) {
    return json({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
