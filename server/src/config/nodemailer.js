import { providerChain, senderFor } from '../services/mail/config.js';
import { sendMail } from '../services/mail/mailer.js';

// Compatibility shim for older imports (`config/nodemailer.js`). New code
// should import from services/mail. The old SMTP/Brevo/SendGrid queue has been
// replaced by the provider chain + MailDelivery idempotency in services/mail.

export { sendViaSmtp } from '../services/mail/providers.js';

export const buildFromHeader = () => {
  const chain = providerChain();
  for (const provider of chain) {
    const sender = senderFor(provider);
    if (sender) return sender;
  }
  return '"JobHexa" <no-reply@localhost>';
};

export const sendEmail = ({ to, subject, html, text, headers, flow, userId }) =>
  sendMail({ to, subject, html, text, headers, flow, userId });

export const verifySmtp = async () => {
  const chain = providerChain();
  if (!chain.length) {
    throw new Error('No mail provider configured. Set RESEND_API_KEY (recommended), SENDGRID_API_KEY, or MAILJET_API_KEY + MAILJET_API_SECRET.');
  }
  return chain[0];
};

export const getTransporter = () => {
  throw new Error('getTransporter() was removed. Use the provider chain in services/mail/providers.js.');
};
