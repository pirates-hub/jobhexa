import './env.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const ensureUser = async (profile, provider) => {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!email) throw new Error('No email from provider');
  const avatar = profile.photos?.[0]?.value || null;
  const name = profile.displayName || profile.username || email.split('@')[0];
  const idField = provider === 'google' ? 'googleId' : 'githubId';
  const idValue = profile.id;

  let user = await User.findOne({ [idField]: idValue });
  if (user) return user;
  user = await User.findOne({ email });
  if (user) {
    user[idField] = idValue;
    if (avatar && !user.avatar) user.avatar = avatar;
    await user.save();
    return user;
  }
  user = await User.create({
    name,
    email,
    avatar,
    [idField]: idValue,
    authProvider: provider,
    isEmailVerified: true,
  });
  return user;
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: (process.env.BACKEND_URL || 'http://localhost:5000') + '/api/auth/google/callback',
    scope: ['profile', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try { const user = await ensureUser(profile, 'google'); done(null, user); } catch (e) { done(e); }
  }));
}

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { const user = await User.findById(id); done(null, user); } catch (e) { done(e); }
});

export default passport;
