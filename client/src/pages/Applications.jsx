import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { formatDate } from '../utils/helpers';

function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => { fetchApps(); }, []);
  const fetchApps = async () => {
    try { const res = await api.get('/applications'); setApps(res.data.data.applications); } catch {} finally { setLoading(false); }
  };
  const updateStatus = async (id, status) => { await api.put(`/applications/${id}`, { status }); fetchApps(); };
  const remove = async (id) => { if(!confirm('Remove from tracker?')) return; await api.delete(`/applications/${id}`); setApps(apps.filter(a=>a._id!==id)); };

  const counts = useMemo(()=> ({
    all: apps.length,
    saved: apps.filter(a=>a.status==='saved').length,
    applied: apps.filter(a=>a.status==='applied').length,
    in_progress: apps.filter(a=>a.status==='in_progress').length,
    completed: apps.filter(a=>a.status==='completed').length,
  }), [apps]);

  const filtered = useMemo(()=> apps.filter(a=> {
    if (filter!=='all' && a.status!==filter) return false;
    if (q && !a.job?.title?.toLowerCase().includes(q.toLowerCase()) && !a.job?.department?.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [apps, filter, q]);

  const statusStyle = {
    saved: 'bg-slate-100 text-slate-700 border-slate-200',
    applied: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    withdrawn: 'bg-red-50 text-red-700 border-red-200',
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80">Application pipeline</div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>My Applications</h1>
              <p className="text-sm font-medium text-white/65 mt-2">Track every stage — saved → applied → in progress → completed.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white rounded-2xl px-5 py-4 shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">{apps.length}</div>
                <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Total tracked</p><p className="text-sm font-extrabold text-slate-900 leading-none mt-1">Jobs in pipeline</p></div>
              </div>
              <Link to="/jobs" className="hidden sm:inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/15 text-white px-6 py-3.5 rounded-full font-bold hover:bg-white/15 transition">Browse jobs →</Link>
              <Link to="/chat" className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-6 py-3.5 rounded-full font-bold hover:shadow-lg transition">✦ Ask AI</Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {id:'all', label:'All', c:counts.all},
            {id:'saved', label:'Saved', c:counts.saved},
            {id:'applied', label:'Applied', c:counts.applied},
            {id:'in_progress', label:'In progress', c:counts.in_progress},
            {id:'completed', label:'Completed', c:counts.completed},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} className={`rounded-2xl border p-4 text-left transition ${filter===f.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200/70 hover:border-slate-200 hover:shadow-sm'}`}>
              <p className={`text-2xl font-extrabold tracking-tight ${filter===f.id ? 'text-white' : 'text-slate-900'}`}>{f.c}</p>
              <p className={`text-xs font-bold tracking-widest uppercase ${filter===f.id ? 'text-white/60' : 'text-slate-500'}`}>{f.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all','saved','applied','in_progress','completed','withdrawn'].map(v=>(
              <button key={v} onClick={()=>setFilter(v)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold capitalize border transition ${filter===v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{v.replace('_',' ')}</button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by title or department…" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition shadow-sm" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm">
            {apps.length===0 ? <EmptyState title="No applications yet" description="Track jobs you have applied for — saved, applied, admit card, exam, result — one pipeline for the whole journey." actionText="Browse Jobs" onAction={()=>window.location.href='/jobs'} /> : <EmptyState title="No results" description={`No applications match “${filter}” ${q? `and “${q}”`:''}`} />}
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {filtered.map(app => (
              <div key={app._id} className="group bg-white rounded-[24px] border border-slate-200/70 p-6 lg:p-7 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold capitalize shadow-sm ${statusStyle[app.status]||'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${app.status==='completed'?'bg-emerald-500':app.status==='applied'?'bg-blue-500':app.status==='in_progress'?'bg-amber-500':'bg-slate-400'}`} />{app.status.replace('_',' ')}
                      </span>
                      <span className="text-xs font-medium text-slate-400">Added {formatDate(app.createdAt)}</span>
                    </div>
                    <Link to={`/jobs/${app.job?.slug || ''}`} className="block mt-3 text-[17px] font-extrabold tracking-tight text-slate-900 group-hover:text-primary-700 transition line-clamp-2 leading-snug">{app.job?.title || 'Job title unavailable'}</Link>
                    <p className="text-sm font-medium text-slate-500 mt-1">{app.job?.department || '—'}</p>
                    {app.job?.state && <span className="inline-flex mt-2 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">{app.job.state}</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                    <select value={app.status} onChange={e=>updateStatus(app._id, e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none">
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <button onClick={()=>remove(app._id)} className="rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition">Remove</button>
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-2">
                  <Link to={`/jobs/${app.job?.slug || ''}`} className="inline-flex rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 transition">View job →</Link>
                  <Link to="/chat" className="inline-flex rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">Ask AI</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Applications;
