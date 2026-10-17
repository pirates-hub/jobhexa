import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

// Maps free-text plan labels ("Polity – Fundamental Rights + Revision",
// "Full-length GK Mock Test (30 min)") to in-app pages. Resolution order:
//   1. mock-test phrases        -> /mock-tests/gk-mock-test
//   2. hand aliases             -> topic page
//   3. direct slug / word match -> topic page
//   4. subject name match       -> subject page
//   5. fallback                 -> /preparation (never plain text)
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'per', 'day', 'days', 'part', 'ul', 'upsc', 'ssc', 'ibps', 'rrb', 'cgl', 'po', 'cse', 'prelims', 'mains', 'general', 'studies', 'indian', 'complete', 'introduction', 'intro', 'overview', 'basic', 'basics', 'advanced', 'revision', 'practice', 'test', 'mock', 'chapter', 'class', 'level', 'week', 'month', 'study', 'revise', 'read', 'watch', 'learn']);

const MOCK_KEYS = ['mock test', 'mock-test', 'gk mock', 'full-length gk', 'full length gk', 'full-length mock', 'full length mock'];

export const MOCK_TEST_SLUG = 'gk-mock-test';

const wordsOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

export function resolvePlanLink(text, index) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  // 1. Mock tests always point at the mock test runner, not a topic page.
  if (MOCK_KEYS.some((k) => lower.includes(k))) {
    return { to: `/mock-tests/${MOCK_TEST_SLUG}`, kind: 'mock' };
  }

  const topics = index?.topics || [];
  const subjects = index?.subjects || [];

  if (topics.length) {
    // 2. Hand aliases for short/generic labels whose words never match.
    const ALIASES = [
      { slug: 'gk-mock-test', keys: ['mock test', 'gk mock', 'full-length gk'] },
      { slug: 'final-review-strategy-planning', keys: ['final review', 'strategy planning'] },
    ];
    for (const a of ALIASES) {
      if (topics.some((t) => t.slug === a.slug) && a.keys.some((k) => lower.includes(k))) {
        return { to: `/preparation/topic/${a.slug}`, kind: 'topic' };
      }
    }

    // 3. Exact slug guess, then word-overlap scoring against topic names.
    const slugGuess = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const direct = topics.find((t) => t.slug === slugGuess);
    if (direct) return { to: `/preparation/topic/${direct.slug}`, kind: 'topic' };

    const q = new Set(wordsOf(text));
    if (q.size) {
      let best = null;
      let bestScore = 0;
      for (const t of topics) {
        const tw = wordsOf(t.name);
        if (!tw.length) continue;
        const hit = tw.filter((w) => q.has(w)).length;
        const score = hit / tw.length;
        if (score > bestScore) { bestScore = score; best = t; }
      }
      if (bestScore >= 0.5 && best) return { to: `/preparation/topic/${best.slug}`, kind: 'topic' };
    }
  }

  // 4. Subject names ("Quantitative Aptitude") -> subject roadmap page.
  for (const s of subjects) {
    const name = (s.name || '').toLowerCase();
    if (name && lower.includes(name)) return { to: `/preparation/subject/${s.slug}`, kind: 'subject' };
  }

  // 5. Guaranteed fallback so every plan item is still clickable.
  return { to: '/preparation', kind: 'fallback' };
}

let indexPromise = null;
function loadIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      api.get('/prep/topics/index').then((r) => r.data?.data?.topics || []).catch(() => []),
      api.get('/prep/subjects').then((r) => r.data?.data?.subjects || []).catch(() => []),
    ])
      .then(([topics, subjects]) => ({ topics, subjects }))
      .catch(() => ({ topics: [], subjects: [] }));
  }
  return indexPromise;
}

export function usePrepIndex() {
  const [index, setIndex] = useState(null);
  useEffect(() => {
    let live = true;
    loadIndex().then((idx) => { if (live) setIndex(idx); });
    return () => { live = false; };
  }, []);
  return index;
}

export function usePlanLink(text) {
  const index = usePrepIndex();
  return index ? resolvePlanLink(text, index) : null;
}

const KIND_ICON = { mock: '📝', topic: '↗', subject: '↗', fallback: '↗' };

export default function TopicLink({ text, className, fallbackTo, showIcon = true }) {
  const link = usePlanLink(text);
  if (!text) return null;
  const target = link && link.kind !== 'fallback' ? link.to : (fallbackTo || link?.to || '/preparation');
  const kind = link?.kind || 'fallback';
  return (
    <Link to={target} className={className} title="Open in Preparation">
      {text}
      {showIcon && <span aria-hidden> {KIND_ICON[kind] || '↗'}</span>}
    </Link>
  );
}
