import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

// Matches free-text plan topics ("Polity – Fundamental Rights + Revision")
// to preparation topic pages. One index request per page load, local scoring.
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'per', 'day', 'days', 'part', 'ul', 'upsc', 'ssc', 'ibps', 'rrb', 'cgl', 'po', 'cse', 'prelims', 'mains', 'general', 'studies', 'indian', 'complete', 'introduction', 'intro', 'overview', 'basic', 'basics', 'advanced', 'revision', 'practice', 'test', 'mock', 'chapter', 'class', 'level', 'week', 'month']);

const wordsOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

export function topicSlugFor(text, index) {
  if (!text || !index?.length) return null;
  const lower = String(text).toLowerCase();
  // Hand aliases for short/generic plan labels whose words never match.
  const ALIASES = [
    { slug: 'gk-mock-test', keys: ['mock test', 'gk mock', 'full-length gk'] },
    { slug: 'final-review-strategy-planning', keys: ['final review', 'strategy planning'] },
  ];
  for (const a of ALIASES) {
    if (!index.some((t) => t.slug === a.slug)) continue;
    if (a.keys.some((k) => lower.includes(k))) return a.slug;
  }
  const slugGuess = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const direct = index.find((t) => t.slug === slugGuess);
  if (direct) return direct.slug;
  const q = new Set(wordsOf(text));
  if (!q.size) return null;
  let best = null;
  let bestScore = 0;
  for (const t of index) {
    const tw = wordsOf(t.name);
    if (!tw.length) continue;
    const hit = tw.filter((w) => q.has(w)).length;
    const score = hit / tw.length;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return bestScore >= 0.5 ? best.slug : null;
}

let indexPromise = null;
function loadIndex() {
  if (!indexPromise) {
    indexPromise = api.get('/prep/topics/index')
      .then((r) => r.data?.data?.topics || [])
      .catch(() => []);
  }
  return indexPromise;
}

export function useTopicSlug(text) {
  const [slug, setSlug] = useState(null);
  useEffect(() => {
    if (!text) return;
    let live = true;
    loadIndex().then((idx) => { if (live) setSlug(topicSlugFor(text, idx)); });
    return () => { live = false; };
  }, [text]);
  return slug;
}

export default function TopicLink({ text, className }) {
  const slug = useTopicSlug(text);
  if (!text) return null;
  if (!slug) return <span className={className}>{text}</span>;
  return (
    <Link to={`/preparation/topic/${slug}`} className={className} title="Open in Preparation">
      {text} <span aria-hidden>↗</span>
    </Link>
  );
}
