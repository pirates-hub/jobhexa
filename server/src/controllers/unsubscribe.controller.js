import User from '../models/User.js';
import { readUnsubscribeToken } from '../utils/mailToken.js';

const page = (title, message) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — JobHexa</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a}
  main{max-width:520px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:16px}
  h1{font-size:20px;margin:0 0 12px}
  p{line-height:1.6;color:#475569;margin:0 0 20px}
  a{display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px}
</style></head>
<body><main><h1>${title}</h1><p>${message}</p><a href="/">Back to JobHexa</a></main></body></html>`;

const tokenFrom = (req) => String(req.query?.token || req.body?.token || '');

const applyUnsubscribe = async (token) => {
  if (!token) return { ok: false, status: 400, error: 'This unsubscribe link is missing its token.' };
  let payload;
  try {
    payload = readUnsubscribeToken(token);
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'This unsubscribe link is invalid or has expired. You can turn emails off from your profile instead.',
    };
  }

  const user = await User.findById(payload.sub).select('notificationPreferences');
  if (!user) {
    return { ok: false, status: 404, error: 'We could not find the account for this link.' };
  }

  user.notificationPreferences = {
    ...(user.notificationPreferences || {}),
    email: false,
  };
  await user.save();
  return { ok: true, user };
};

// Public: the link is clicked from an email, so there is no session.
export const unsubscribe = async (req, res) => {
  const result = await applyUnsubscribe(tokenFrom(req));
  if (!result.ok) {
    return res.status(result.status).send(page(
      result.status === 404 ? 'Account not found' : 'Invalid link',
      result.error
    ));
  }
  return res.send(page(
    'You are unsubscribed',
    'You will no longer receive job alert emails from JobHexa. In-app notifications still work, and you can turn emails back on any time from your profile.'
  ));
};

// RFC 8058 one-click: mailbox providers POST here from List-Unsubscribe-Post.
// The signed token in the query string is the authentication; no body parsing
// is required, but accepting body.token helps manual testing.
export const unsubscribeOneClick = async (req, res) => {
  try {
    const result = await applyUnsubscribe(tokenFrom(req));
    if (!result.ok) return res.status(result.status).json({ success: false, message: result.error });
    return res.status(200).json({ success: true, message: 'Unsubscribed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
