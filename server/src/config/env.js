import dotenv from 'dotenv';

// Imported FIRST by config modules so process.env is populated before
// any strategy/client registration runs (ESM imports evaluate before
// server.js body, where dotenv.config() used to run too late).
dotenv.config();

export default dotenv;
