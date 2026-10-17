import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    validate: {
      validator: (v) => Array.isArray(v) && v.length >= 2,
      message: 'A question needs at least 2 options',
    },
  },
  correctIndex: {
    type: Number,
    required: true,
    min: 0,
  },
  explanation: String,
}, { _id: false });

const mockTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Mock test title is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  subjectName: String,
  topicSlug: String,
  description: String,
  durationMinutes: {
    type: Number,
    default: 30,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  questions: [questionSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const MockTest = mongoose.model('MockTest', mockTestSchema);

export default MockTest;
