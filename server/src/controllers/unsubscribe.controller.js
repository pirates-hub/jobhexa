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

// Public: the link is clicked from an email, so there is no session.
export const unsubscribe = async (req, res) => {
  const token = String(req.query.token || '');
  if (!token) {
    return res.status(400).send(page('Invalid link', 'This unsubscribe link is missing its token.'));
  }
  let payload;
  try {
    payload = readUnsubscribeToken(token);
  } catch {
    return res.status(400).send(page('Link expired', 'This unsubscribe link is invalid or has expired. You can turn emails off from your profile instead.'));
  }

  const user = await User.findById(payload.sub).select('notificationPreferences');
  if (!user) {
    return res.status(404).send(page('Account not found', 'We could not find the account for this link.'));
  }

  user.notificationPreferences = {
    ...(user.notificationPreferences || {}),
    email: false,
  };
  await user.save();

  return res.send(page('You are unsubscribed', 'You will no longer receive job alert emails from JobHexa. In-app notifications still work, and you can turn emails back on any time from your profile.'));
};
