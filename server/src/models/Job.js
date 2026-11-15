import mongoose from 'mongoose';
import { buildSlug } from '../utils/slug.js';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  description: String,
  shortDescription: {
    type: String,
    maxlength: 200,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
  },
  organization: String,
  examType: {
    type: String,
    enum: ['upsc', 'ssc', 'railway', 'banking', 'defense', 'teaching', 'police', 'statepsc', 'psu', 'central', 'state', 'other'],
    required: [true, 'Exam type is required'],
  },
  category: String,
  jobLevel: {
    type: String,
    enum: ['group_a', 'group_b', 'group_c', 'group_d'],
  },
  state: {
    type: String,
    default: 'All India',
  },
  district: String,
  postingLocations: [String],
  eligibility: {
    qualifications: [{
      level: String,
      field: String,
      percentage: Number,
    }],
    allowedCategories: [String],
    ageMin: { type: Number, default: 18 },
    ageMax: Number,
    ageRelaxation: {
      obc: { type: Number, default: 3 },
      sc: { type: Number, default: 5 },
      st: { type: Number, default: 5 },
      ews: { type: Number, default: 0 },
      pwd: { type: Number, default: 10 },
      exServiceman: { type: Number, default: 5 },
    },
    experience: String,
    gender: { type: String, default: 'any' },
    nationality: { type: String, default: 'Indian' },
    otherRequirements: [String],
  },
  applicationStartDate: Date,
  applicationEndDate: Date,
  examDate: Date,
  admitCardDate: Date,
  resultDate: Date,
  totalVacancies: Number,
  postName: String,
  advertisementNumber: { type: String, index: true },
  salary: String,
  payScale: String,
  selectionProcess: [String],
  publicationDate: Date,
  lastVerifiedDate: { type: Date, default: Date.now },
  officialApplyUrl: String,
  notificationPdfHash: { type: String, index: true },
  howToApply: [String],
  categoryWiseVacancies: {
    general: Number,
    obc: Number,
    sc: Number,
    st: Number,
    ews: Number,
  },
  applicationFee: {
    general: Number,
    obc: Number,
    sc: Number,
    st: Number,
    pwd: Number,
  },
  officialWebsite: String,
  officialNotificationUrl: String,
  notificationPdfUrl: String,
  applyLink: String,
  syllabus: {
    overview: String,
    sections: [{
      name: String,
      topics: [String],
      marks: Number,
      duration: Number,
    }],
    totalMarks: Number,
    totalDuration: Number,
    negativeMarking: String,
  },
  source: {
    type: String,
    enum: ['admin', 'ai_extracted', 'manual', 'aggregator'],
    default: 'admin',
  },
  aggregatorMeta: {
    id: { type: String, index: true },
    sourceId: String,
    category: String,
    fetchedAt: Date,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'needs_review'],
    default: 'pending',
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verificationNotes: String,
  verificationDate: Date,
  jobStatus: {
    type: String,
    enum: ['upcoming', 'active', 'closing_soon', 'closed', 'cancelled'],
    default: 'active',
  },
  isFeatured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  applicationCount: { type: Number, default: 0 },
  tags: [String],
}, {
  timestamps: true,
});

jobSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = buildSlug(this.title);
  }
  next();
});

jobSchema.index({ examType: 1 });
jobSchema.index({ state: 1 });
jobSchema.index({ jobStatus: 1 });
jobSchema.index({ applicationEndDate: 1 });
jobSchema.index({ title: 'text', description: 'text', department: 'text' });
// Duplicate-key: one listing per title+department+state+closing date. Enforced
// by Mongo (created via scripts/add-unique-index.mjs after the duplicate
// report showed 0 conflicts) so no code path can re-insert a duplicate.
jobSchema.index(
  { title: 1, department: 1, state: 1, applicationEndDate: 1 },
  { name: 'uniq_job_dup_key', unique: true },
);

const Job = mongoose.model('Job', jobSchema);

export default Job;
