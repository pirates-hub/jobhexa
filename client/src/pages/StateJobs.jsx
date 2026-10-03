import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import jobService from '../services/jobService';
import api from '../services/api';
import JobCard from '../components/jobs/JobCard';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { INDIAN_STATES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

function StateJobs() {
  const { stateName } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    // State page shows own-state jobs; central All-India jobs eligible too via recommended
    jobService.getJobs({ state: stateName, limit: 20 }).then((res) => setJobs(res.data.data.jobs || [])).catch(() => {}).finally(() => setLoading(false));
  }, [stateName, user, navigate, authLoading]);

  useEffect(() => {
    if (!user) return;
    api.get(`/jobs/recommended?state=${encodeURIComponent(stateName)}&limit=20`).then((res) => {
      const map = {};
      (res.data.data.jobs || []).forEach((s) => { map[s.job.slug] = s; });
      setScores(map);
    }).catch(() => {});
  }, [user, stateName]);

  const visible = jobs
    .map((j) => ({ ...j, _elig: scores[j.slug] }))
    .filter((j) => !eligibleOnly || j._elig?.eligible)
    .sort((a, b) => (b._elig?.score || 0) - (a._elig?.score || 0));

  if (authLoading) return null;
  if (!user) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center p-12"><Loader /></div>;
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1480px] mx-auto px-4 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-4">← Back to Dashboard</Link>
        <h1 className="text-3xl font-extrabold">{stateName} Government Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">State PSC, SSC, police, teaching, health, courts, universities, power, transport & municipal bodies — plus central jobs you're eligible for.</p>
        <div className="flex flex-wrap gap-2 mt-4">{INDIAN_STATES.slice(0, 12).map((s) => <Link key={s} to={`/state-jobs/${s}`} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${s === stateName ? 'bg-slate-900 text-white' : 'bg-white'}`}>{s}</Link>)}</div>
        {user && (
          <label className="inline-flex items-center gap-2 mt-4 text-sm font-bold bg-white border rounded-full px-4 py-2">
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} /> Eligible for me only
          </label>
        )}
        {visible.length === 0 ? <EmptyState /> : <div className="grid md:grid-cols-2 gap-4 mt-6">{visible.map((j) => <JobCard key={j._id} job={j} showEligibility />)}</div>}
      </div>
    </div>
  );
}
export default StateJobs;
