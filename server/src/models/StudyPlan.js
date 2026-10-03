import mongoose from 'mongoose';
const studyPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: String, required: true },
  plan: [{ day: Number, topic: String, subject: String, hours: Number, tasks: [String] }],
  startDate: { type: Date, default: Date.now },
  currentDay: { type: Number, default: 1 },
  notifyDaily: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
studyPlanSchema.index({ user: 1, isActive: 1 });
const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
export default StudyPlan;
