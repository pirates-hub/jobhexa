import mongoose from 'mongoose';

// Per-source crawl state for INCREMENTAL daily collection.
// A document is (re)processed only when it is new or its content changed —
// compared via content hash, ETag, or Last-Modified. Unchanged documents
// are never re-downloaded/re-processed.
const sourceStateSchema = new mongoose.Schema({
  source: { type: String, required: true, unique: true, trim: true },
  url: { type: String, trim: true },
  pageHash: { type: String, default: null },
  etag: { type: String, default: null },
  lastModified: { type: String, default: null },
  // sha256(url) -> sha256 of last processed content (capped to keep the doc small)
  // Keys are hashed because Mongoose Maps reject '.' which every URL contains.
  docHashes: { type: Map, of: String, default: {} },
  lastCheckedAt: { type: Date, default: null },
  lastStatus: { type: String, enum: ['ok', 'failed', 'skipped', null], default: null },
  lastError: { type: String, default: null },
  consecutiveFailures: { type: Number, default: 0 },
}, { timestamps: true });

const SourceState = mongoose.model('SourceState', sourceStateSchema);

export default SourceState;
