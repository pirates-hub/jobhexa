// In-process response cache for public job listings (no Redis in this stack).
//
// Why: state/exam/deadline listings are read thousands of times between
// pipeline runs and change at most every few minutes (aggregator sync) —
// serving them from RAM removes the query entirely for most hits.
//
// Bounds: TTL-based expiry (default 6 min — well under the 5–10 min staleness
// budget) and a maxKeys cap so the Map can never grow without limit.
import NodeCache from 'node-cache';

const SIX_MINUTES_S = 6 * 60;

export const jobCache = new NodeCache({
  stdTTL: SIX_MINUTES_S,
  checkperiod: 60,
  useClones: false,
  maxKeys: 500,
});

// Read-through helper: returns the cached value or runs fn() and stores it.
export const cached = async (key, fn) => {
  const hit = jobCache.get(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  jobCache.set(key, value);
  return value;
};

// Called after every write that changes public listings (aggregator import,
// admin verify/update/delete, collection runs) so the portal never serves a
// listing older than the next request after a write.
export const invalidateJobCache = () => {
  jobCache.flushAll();
};
