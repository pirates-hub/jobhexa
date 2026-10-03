import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  notificationType: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  method: {
    type: String,
    enum: ['email', 'in_app', 'both'],
  },
}, {
  timestamps: true,
});

notificationLogSchema.index({ user: 1, job: 1, notificationType: 1 }, { unique: true });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
