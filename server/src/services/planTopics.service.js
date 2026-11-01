import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';

// Same normalization the client TopicLink uses for direct slug matching.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

// Every day of a study plan gets a real topic page, so plan topics always
// link through to Preparation. Idempotent: existing topics are skipped.
export async function ensurePlanTopics(planArray) {
  const days = (Array.isArray(planArray) ? planArray : [])
    .filter((d) => d && d.topic && d.subject)
    .slice(0, 90);
  if (!days.length) return { created: 0 };
  const wanted = new Map();
  for (const d of days) {
    const slug = norm(d.topic);
    if (!slug || wanted.has(slug)) continue;
    wanted.set(slug, { name: String(d.topic).trim().slice(0, 120), subjectName: String(d.subject).trim().slice(0, 80) });
  }
  if (!wanted.size) return { created: 0 };
  const existing = await Topic.find({ slug: { $in: [...wanted.keys()] } }).select('slug');
  const have = new Set(existing.map((t) => t.slug));
  const missing = [...wanted.entries()].filter(([slug]) => !have.has(slug));
  if (!missing.length) return { created: 0 };
  const subjects = await Subject.find().select('name slug');
  const byName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));
  let created = 0;
  for (const [slug, info] of missing) {
    let subject = byName.get(info.subjectName.toLowerCase());
    if (!subject) {
      try {
        subject = await Subject.create({ name: info.subjectName, slug: norm(info.subjectName) || 'study-plan', description: 'Auto-created from study plans' });
        byName.set(subject.name.toLowerCase(), subject);
      } catch {
        subject = await Subject.findOne({ slug: norm(info.subjectName) }) || subjects[0];
        if (!subject) continue;
      }
    }
    try {
      await Topic.create({
        name: info.name, slug, subject: subject._id,
        description: 'Study plan topic — notes and videos appear here.',
        difficulty: 'medium', estimatedHours: 2,
      });
      created += 1;
    } catch { /* duplicate slug race — already exists */ }
  }
  return { created };
}
