import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import JobCard from '../components/jobs/JobCard';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => { fetchSavedJobs(); }, []);
  const fetchSavedJobs = async () => {
    try { const res = await api.get('/saved-jobs'); setSavedJobs(res.data.data.savedJobs); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleRemove = async (jobId) => {
    try { await api.delete(`/saved-jobs/${jobId}`); setSavedJobs(savedJobs.filter(s=>s.job._id!==jobId)); } catch {}
  };

  const filtered = useMemo(()=> savedJobs.filter(s=> !q || s.job.title.toLowerCase().includes(q.toLowerCase()) || s.job.department?.toLowerCase().includes(q.toLowerCase())), [savedJobs, q]);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80">Bookmarks</div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>Saved Jobs</h1>
              <p className="text-sm font-medium text-white/65 mt-2">Your shortlist — revisit, compare and apply before deadlines.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-2xl px-5 py-4 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">◈</div>
                <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Saved</p><p className="text-lg font-extrabold text-slate-900 leading-none mt-1">{savedJobs.length} jobs</p></div>
              </div>
              <Link to="/jobs" className="hidden sm:inline-flex bg-white/10 backdrop-blur border border-white/15 text-white px-6 py-3.5 rounded-full font-bold hover:bg-white/15 transition">Browse jobs →</Link>
              <Link to="/chat" className="hidden sm:inline-flex bg-gradient-to-r from-primary-600 to-blue-600 text-white px-6 py-3.5 rounded-full font-bold hover:shadow-lg transition">✦ Ask AI</Link>
            </div>
          </div>
        </div>

        {savedJobs.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <p className="text-sm font-bold text-slate-700">{filtered.length} saved • <span className="font-medium text-slate-500">Keep track before deadlines close</span></p>
            <div className="relative w-full sm:w-80">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search saved jobs…" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition shadow-sm" />
            </div>
          </div>
        )}

        {savedJobs.length === 0 ? (
          <div className="mt-6 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm">
            <EmptyState title="No saved jobs yet" description="Save jobs you’re interested in to find them here — we’ll also remind you before deadlines." actionText="Browse Jobs" onAction={()=>window.location.href='/jobs'} />
            <div className="mt-8 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                {t:'Save with one tap', d:'Bookmark any job card'},
                {t:'Get reminded', d:'Deadlines tracked automatically'},
                {t:'Apply faster', d:'One-click to official site'},
              ].map(s=>(
                <div key={s.t} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
                  <p className="text-sm font-bold text-slate-900">{s.t}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length===0 ? (
          <div className="mt-6 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No matches" description={`No saved jobs match “${q}”`} /></div>
        ) : (
          <div className="mt-6 space-y-5">
            {filtered.map(saved => (
              <div key={saved._id} className="group bg-white rounded-[24px] border border-slate-200/70 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                <div className="p-6 lg:p-7 pb-0">
                  <JobCard job={saved.job} hideSave />
                </div>
                <div className="px-6 lg:px-7 py-4 bg-slate-50/70 border-t border-slate-100 mt-5 flex flex-wrap gap-3 justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Saved • <Link to={`/jobs/${saved.job.slug}`} className="font-bold text-slate-900 hover:text-primary-700">View details →</Link>
                  </div>
                  <div className="flex gap-2">
                    {saved.job.applyLink && <a href={saved.job.applyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-800 transition">Apply now ↗</a>}
                    <button onClick={()=>handleRemove(saved.job._id)} className="inline-flex bg-white border border-red-200 text-red-600 px-4 py-2 rounded-full text-xs font-bold hover:bg-red-50 transition">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedJobs;
