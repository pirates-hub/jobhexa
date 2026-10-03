import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    select: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local',
  },
  googleId: { type: String, sparse: true },
  githubId: { type: String, sparse: true },
  avatar: { type: String },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  qualification: {
    highest: {
      type: String,
      enum: ['10th', '12th', 'graduate', 'postgraduate', 'phd', 'diploma', 'engineering', 'medical'],
    },
    field: String,
    yearOfPassing: Number,
    percentage: Number,
    university: String,
  },
  state: String,
  district: String,
  category: {
    type: String,
    enum: ['general', 'obc', 'sc', 'st', 'ews', 'pwd', 'ex-serviceman'],
  },
  preferredExamTypes: [String],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    newJobs: { type: Boolean, default: true },
    deadlineReminders: { type: Boolean, default: true },
    reminderDays: { type: [Number], default: [7, 3, 1] },
  },
  profileCompleted: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  tokenVersion: { type: Number, default: 0 },
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

userSchema.index({ state: 1 });
userSchema.index({ category: 1 });

const User = mongoose.model('User', userSchema);

export default User;
