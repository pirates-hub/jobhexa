import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

function EligibilityBadge({ slug }) {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get(`/jobs/${slug}/eligibility`).then(res => {
      setResult(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, user]);

  if (loading) return <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-500">Checking eligibility...</div>;
  if (!user) return <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-sm text-blue-800"><Link to="/login" className="font-semibold underline">Login</Link> to check your eligibility for this job</p></div>;
  if (!result) return null;

  if (result.eligible === null || result.incompleteProfile) return (
    <div className="rounded-lg p-4 border bg-amber-50 border-amber-200">
      <p className="text-sm font-bold text-amber-800">Profile incomplete — finish these to check eligibility:</p>
      <ul className="text-sm text-amber-700 mt-1">{(result.missing || []).map((m,i) => <li key={i}>• {m}</li>)}</ul>
      <Link to="/profile" className="text-sm font-semibold underline text-amber-800">Complete profile →</Link>
    </div>
  );

  return (
    <div className={`rounded-lg p-4 border ${result.eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-lg font-bold ${result.eligible ? 'text-green-700' : 'text-red-700'}`}>
          {result.eligible ? '✓ Eligible' : '✗ Not Eligible'}
        </span>
        <span className="text-sm text-gray-600">Score: {result.score}%</span>
      </div>
      {result.reasons?.length > 0 && <ul className="text-sm text-green-700 space-y-1 mb-2">{result.reasons.map((r,i) => <li key={i}>• {r}</li>)}</ul>}
      {result.warnings?.length > 0 && <ul className="text-sm text-red-600 space-y-1">{result.warnings.map((w,i) => <li key={i}>• {w}</li>)}</ul>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {result.breakdown && Object.entries(result.breakdown).map(([key, val]) => (
          <div key={key} className={`p-2 rounded ${val.met ? 'bg-green-100' : val.score > 0 ? 'bg-yellow-100' : 'bg-red-100'}`}>
            <span className="font-semibold capitalize">{key}:</span> {val.details}
          </div>
        ))}
      </div>
    </div>
  );
}
export default EligibilityBadge;
