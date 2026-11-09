// Compatibility re-exports. The rebuilt mail service owns templates and
// delivery; old call sites can keep importing from email.service.js.

import { sendDeadlineEmail } from './mail/flows.js';

export { sendPasswordResetEmail, sendWelcomeEmail } from './mail/flows.js';

export const sendDeadlineReminder = (user, job, daysLeft) =>
  sendDeadlineEmail({ user, job, daysLeft });
