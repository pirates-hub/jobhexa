import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './src/config/env.js';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/db.js';
import routes from './src/routes/index.js';
import errorHandler from './src/middleware/errorHandler.js';
import passport from './src/config/passport.js';
import { assertValidRegistry } from './src/config/officialSources.js';
import { startReminderCron } from './src/services/reminder.service.js';
import { startJobUpdateCron } from './src/services/jobUpdate.service.js';
import { startCollectionCrons } from './src/services/collection.schedule.js';

// Fail fast on fake/placeholder URLs in the official source registry.
assertValidRegistry();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB first, then start crons so queries never run on a cold DB.
// startReminderCron auto-sends due mails 10s after boot (catch-up) + daily 7:30/8/9 AM IST.
await connectDB();

// Start crons (auto-send mails to users)
startReminderCron(); // ← cron begins here
startJobUpdateCron();
startCollectionCrons();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JobHexa API is running' });
});

app.use('/api', routes);

// Serve built React client (single-service deploy: build client, copy dist next to server)
// In dev (vite :5173 with proxy) this folder doesn't exist and is skipped.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
for (const candidate of [path.join(here, 'public'), path.join(here, '..', 'client', 'dist')]) {
  if (fs.existsSync(path.join(candidate, 'index.html'))) {
    app.use(express.static(candidate));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(candidate, 'index.html')));
    console.log(`Serving client from ${candidate}`);
    break;
  }
}

// 404 handler (API only — client routes handled above in production)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
