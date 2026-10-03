import mongoose from 'mongoose';

const examTopicSchema = new mongoose.Schema({
  examType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamType',
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  topics: [{
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
    },
    weightage: Number,
    isOptional: { type: Boolean, default: false },
  }],
  totalMarks: Number,
  totalQuestions: Number,
}, {
  timestamps: true,
});

examTopicSchema.index({ examType: 1, subject: 1 }, { unique: true });

const ExamTopic = mongoose.model('ExamTopic', examTopicSchema);

export default ExamTopic;
