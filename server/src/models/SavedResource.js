import mongoose from 'mongoose';

const savedResourceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoLink', required: true },
}, { timestamps: true });

savedResourceSchema.index({ user: 1, video: 1 }, { unique: true });

const SavedResource = mongoose.model('SavedResource', savedResourceSchema);

export default SavedResource;
