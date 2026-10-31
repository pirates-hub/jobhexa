import mongoose from 'mongoose';

// One row per provider attempt. Written by config/nodemailer.js so a "mail
// accepted but never delivered" report can be traced without Render logs.
const mailAttemptSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['smtp', 'brevo', 'mock'],
    required: true,
  },
  ok: {
    type: Boolean,
    required: true,
  },
  // Provider message id on success (e.g. <...@gmail.com> or <...@mailin.fr>).
  messageId: String,
  // Short failure reason, recipient addresses stripped.
  error: String,
  // Recipient domain only (gmail.com, yahoo.com …), never the local part.
  toDomain: String,
  subject: String,
}, {
  timestamps: true,
});

mailAttemptSchema.index({ createdAt: -1 });

const MailAttempt = mongoose.model('MailAttempt', mailAttemptSchema);

export default MailAttempt;
