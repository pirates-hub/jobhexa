import jwt from 'jsonwebtoken';

// Fail fast: never sign with a predictable fallback secret.
// (Checked lazily because ESM imports evaluate before dotenv.config().)
const secret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing — set it in server/.env before starting');
  }
  return process.env.JWT_SECRET;
};

const JWT_EXPIRES_IN = '1d';
const JWT_REFRESH_EXPIRES_IN = '7d';

export const generateAccessToken = (userId, role, tokenVersion = 0) => {
  return jwt.sign({ id: userId, role, tv: tokenVersion }, secret(), { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ id: userId, tv: tokenVersion }, secret(), { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

export const verifyToken = (token) => {
  return jwt.verify(token, secret());
};
