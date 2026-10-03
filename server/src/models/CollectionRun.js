import mongoose from 'mongoose';

// Log of every daily/monthly collection run: per-source rows plus a run
// summary row (source = 'ALL'). Never auto-publishes; records what the
// run found, created (pending), updated, expired, or flagged.
const collectionRunSchema = new mongoose.Schema({
  kind: { type: String, enum: ['daily', 'weekly', 'monthly', 'manual'], required: true },
  source: { type: String, required: true, trim: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  status: { type: String, enum: ['running', 'completed', 'partial', 'failed', 'skipped'], default: 'running' },
  jobsFound: { type: Number, default: 0 },
  jobsCreated: { type: Number, default: 0 },
  jobsUpdated: { type: Number, default: 0 },
  jobsExpired: { type: Number, default: 0 },
  duplicates: { type: Number, default: 0 },
  validationFailures: { type: Number, default: 0 },
  errors: { type: [String], default: [] },
}, { timestamps: true });

collectionRunSchema.index({ kind: 1, startTime: -1 });
collectionRunSchema.index({ source: 1, startTime: -1 });

const CollectionRun = mongoose.model('CollectionRun', collectionRunSchema);

export default CollectionRun;
