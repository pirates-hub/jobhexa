import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function EligibilityPill({ slug }) {
  const { user } = useAuth();
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!user || !slug) return;
    api.get(`/jobs/${slug}/eligibility`).then((r) => setRes(r.data.data)).catch(() => {});
  }, [slug, user]);
  if (!user) return <Link to="/login" className="text-xs font-bold text-blue-700 underline">Login to check eligibility</Link>;
  if (!res) return <span className="text-xs text-slate-400">Checking…</span>;
  if (res.eligible === null || res.incompleteProfile) return (
    <Link to="/profile" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">Complete profile to check</Link>
  );
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${res.eligible ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
      {res.eligible ? '✓ Eligible' : '✗ Not eligible'} • {res.score}%
    </span>
  );
}
export default EligibilityPill;
