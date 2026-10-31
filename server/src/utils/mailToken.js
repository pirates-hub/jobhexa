import jwt from 'jsonwebtoken';

// Tokens for links that leave the app (email footers). Kept separate from
// access tokens so a leaked unsubscribe link can never be used to log in.
const secret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing — set it in server/.env before starting');
  }
  return process.env.JWT_SECRET;
};

export const makeUnsubscribeToken = (userId) =>
  jwt.sign({ sub: String(userId), scope: 'unsubscribe' }, secret(), { expiresIn: '365d' });

export const readUnsubscribeToken = (token) => {
  const payload = jwt.verify(token, secret());
  if (payload.scope !== 'unsubscribe') {
    throw new Error('wrong token scope');
  }
  return payload;
};
