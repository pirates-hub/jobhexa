import mongoose from 'mongoose';

const videoLinkSchema = new mongoose.Schema({
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  youtubeVideoId: {
    type: String,
    required: true,
    unique: true,
  },
  youtubeUrl: {
    type: String,
    required: true,
  },
  channelName: String,
  duration: Number,
  language: {
    type: String,
    enum: ['hindi', 'english', 'bilingual'],
    default: 'english',
  },
  quality: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
  },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const VideoLink = mongoose.model('VideoLink', videoLinkSchema);

export default VideoLink;
