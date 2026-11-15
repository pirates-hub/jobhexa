// Shared slug builder — one place for the slugify options every job/topic
// slug must use (lowercase, ASCII-strict) so slugs never diverge between the
// Job pre-save hook, the aggregator import mapper and admin-created topics.
import slugify from 'slugify';

export const buildSlug = (text) => slugify(String(text ?? ''), { lower: true, strict: true });
