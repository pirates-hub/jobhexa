import mongoose from 'mongoose';

// One row per logical email, not per provider attempt. The unique index is the
// idempotency gate: a retry after a crash or a second cron run cannot send the
// same daily digest twice.
const mailDeliverySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  flow: {
    type: String,
    required: true,
    index: true,
  },
  // e.g. "2026-11-07", "job_<id>_3d", "plan_<id>_day_4", "welcome".
  periodKey: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'failed'],
    default: 'sending',
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  provider: String,
  messageId: String,
  lastError: String,
  // Recipient domain only, never the local part.
  toDomain: String,
  sentAt: Date,
}, {
  timestamps: true,
});

mailDeliverySchema.index({ user: 1, flow: 1, periodKey: 1 }, { unique: true });
mailDeliverySchema.index({ createdAt: -1 });

const MailDelivery = mongoose.model('MailDelivery', mailDeliverySchema);

export default MailDelivery;
