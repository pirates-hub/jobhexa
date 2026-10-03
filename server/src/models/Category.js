import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    unique: true,
    lowercase: true,
  },
  ageRelaxationDefault: {
    type: Number,
    default: 0,
  },
  description: String,
}, {
  timestamps: true,
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
