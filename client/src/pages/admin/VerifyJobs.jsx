import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';

function VerifyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => { fetchPending(); }, []);
  const fetchPending = async () => {
    try { const res = await api.get('/admin/jobs/pending'); setJobs(res.data.data.jobs); } catch {} finally { setLoading(false); }
  };
  const verify = async (id) => {
    setActing(id);
    try { await api.patch(`/admin/jobs/${id}/verify`); setJobs(jobs.filter(j=>j._id!==id)); } finally { setActing(null); }
  };
  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason===null) return;
    setActing(id);
    try { await api.patch(`/admin/jobs/${id}/reject`, { reason }); setJobs(jobs.filter(j=>j._id!==id)); } finally { setActing(null); }
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;
  if (jobs.length===0) return <div className="min-h-screen bg-[#F8FAFC]"><div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10"><div className="rounded-[28px] bg-gradient-to-br from-emerald-600 to-teal-600 p-10 text-white shadow-xl relative overflow-hidden"><div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" /><h1 className="relative text-3xl font-extrabold" style={{fontFamily:'Sora'}}>All clear ✓</h1><p className="relative text-white/80 font-medium mt-2">No pending jobs — every submission is verified.</p></div><div className="mt-8 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No pending jobs" description="All jobs are verified. New submissions will appear here." /></div></div></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500 text-white px-3 py-1.5 text-xs font-bold tracking-widest uppercase shadow-md"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> {jobs.length} pending</div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>Pending Verification</h1>
              <p className="text-sm font-medium text-white/65 mt-2">Review details carefully — approve to publish or reject with reason.</p>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 text-slate-900 shadow-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">{jobs.length}</div>
              <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Queue</p><p className="text-sm font-extrabold leading-none mt-1">Awaiting review</p></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          {jobs.map(job=>(
            <div key={job._id} className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden hover:shadow-lg hover:shadow-slate-200/30 transition">
              <div className="p-7 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 text-xs font-bold">Pending review</span>
                      {job.examType && <span className="inline-flex rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-bold capitalize">{job.examType}</span>}
                      {job.state && <span className="inline-flex rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{job.state}</span>}
                    </div>
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900 leading-snug">{job.title}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{job.department} {job.organization ? `• ${job.organization}` : ''}</p>
                    {job.description && <p className="text-sm font-medium text-slate-600 leading-relaxed mt-3 line-clamp-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">{job.description.substring(0, 400)}{job.description.length>400?'…':''}</p>}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {job.totalVacancies && <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-slate-600">{job.totalVacancies.toLocaleString()} vacancies</span>}
                      {job.applicationEndDate && <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-medium text-slate-600">Deadline: {new Date(job.applicationEndDate).toLocaleDateString('en-IN')}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={()=>verify(job._id)} disabled={acting===job._id} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-md transition">
                    {acting===job._id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✓'} Approve
                  </button>
                  <button onClick={()=>reject(job._id)} disabled={acting===job._id} className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition">✕ Reject</button>
                  <span className="ml-auto text-xs font-medium text-slate-400 self-center">ID: {job._id.slice(-6)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VerifyJobs;
