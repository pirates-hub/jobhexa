import mongoose from 'mongoose';

// One row per provider attempt. Written by the mail layer so a "provider
// accepted it but nothing arrived" report can be traced without Render logs.
const mailAttemptSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['resend', 'sendgrid', 'brevo', 'smtp', 'mock'],
    required: true,
  },
  ok: {
    type: Boolean,
    required: true,
  },
  // Logical flow: eligible_digest, deadline_reminder, study_plan, welcome,
  // password_reset, admin_manual, admin_test.
  flow: String,
  // Provider message id on success.
  messageId: String,
  // Short failure reason, recipient addresses stripped.
  error: String,
  // HTTP status for API providers (401, 403, 429 …).
  statusCode: Number,
  // Which try of this provider failed (1-based).
  attempt: Number,
  // Recipient domain only (gmail.com, yahoo.com …), never the local part.
  toDomain: String,
  subject: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

mailAttemptSchema.index({ createdAt: -1 });
mailAttemptSchema.index({ flow: 1, createdAt: -1 });

const MailAttempt = mongoose.model('MailAttempt', mailAttemptSchema);

export default MailAttempt;
