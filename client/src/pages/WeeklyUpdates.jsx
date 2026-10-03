import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';
import JobCard from '../components/jobs/JobCard';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function WeeklyUpdates() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('weekly');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const days = tab === 'weekly' ? 7 : 30;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    jobService.getJobs({ fresh: days, limit: 30, sortBy: 'newest' }).then((res) => setJobs(res.data.data.jobs || [])).catch(() => {}).finally(() => setLoading(false));
  }, [tab, user, navigate, authLoading]);

  if (authLoading) return null;
  if (!user) return null;
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1480px] mx-auto px-4 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-4">← Back to Dashboard</Link>
        <h1 className="text-3xl font-extrabold">New Updates</h1>
        <p className="text-sm text-slate-500 mt-1">Fresh from this week's internet sweep + auto collection. Verify on official links.</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setTab('weekly')} className={`px-4 py-2 rounded-full text-sm font-bold border ${tab === 'weekly' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Weekly (7 days)</button>
          <button onClick={() => setTab('monthly')} className={`px-4 py-2 rounded-full text-sm font-bold border ${tab === 'monthly' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Monthly (30 days)</button>
        </div>
        {loading ? <div className="flex justify-center p-12"><Loader /></div>
          : jobs.length === 0 ? <EmptyState />
          : <div className="grid md:grid-cols-2 gap-4 mt-6">{jobs.map((j) => <JobCard key={j._id} job={j} showEligibility />)}</div>}
        <Link to="/jobs" className="inline-block mt-6 text-sm font-bold">Browse all jobs →</Link>
      </div>
    </div>
  );
}
export default WeeklyUpdates;
