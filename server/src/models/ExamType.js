import mongoose from 'mongoose';

const examTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exam name is required'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  fullName: String,
  description: String,
  conductingBody: String,
  examLevel: {
    type: String,
    enum: ['national', 'state', 'departmental'],
  },
  frequency: String,
  officialWebsite: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const ExamType = mongoose.model('ExamType', examTypeSchema);

export default ExamType;
