import mongoose from 'mongoose';

const qualificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Qualification name is required'],
    trim: true,
  },
  level: {
    type: String,
    required: true,
  },
  field: String,
  isEquivalentTo: String,
}, {
  timestamps: true,
});

const Qualification = mongoose.model('Qualification', qualificationSchema);

export default Qualification;
