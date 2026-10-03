import mongoose from 'mongoose';

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'State name is required'],
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    unique: true,
    uppercase: true,
  },
  region: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  districts: [String],
}, {
  timestamps: true,
});

const State = mongoose.model('State', stateSchema);

export default State;
