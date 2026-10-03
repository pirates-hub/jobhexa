import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['new_job', 'deadline_7day', 'deadline_3day', 'deadline_1day', 'deadline_today', 'application_update', 'system', 'study_plan'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: String,
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
  },
  isRead: { type: Boolean, default: false },
  isEmailed: { type: Boolean, default: false },
  emailSentAt: Date,
}, {
  timestamps: true,
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
