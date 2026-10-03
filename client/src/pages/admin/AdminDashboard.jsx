import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/admin/dashboard').then(res=> setStats(res.data.data)).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  const cards = [
    { label:'Total Jobs', value: stats?.totalJobs || 0, sub:'All postings', icon:'◈', grad:'from-slate-900 to-slate-700', bg:'bg-white' },
    { label:'Pending', value: stats?.pendingJobs || 0, sub:'Needs verification', icon:'⬢', grad:'from-amber-500 to-orange-500', bg:'bg-gradient-to-br from-amber-50 to-orange-50' },
    { label:'Active', value: stats?.activeJobs || 0, sub:'Live now', icon:'✦', grad:'from-emerald-500 to-teal-600', bg:'bg-gradient-to-br from-emerald-50 to-teal-50' },
    { label:'Total Users', value: stats?.totalUsers || 0, sub:'Registered', icon:'👤', grad:'from-indigo-600 to-violet-600', bg:'bg-gradient-to-br from-indigo-50 to-violet-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20 mb-8">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Admin control center</div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>Admin Dashboard</h1>
              <p className="text-sm font-medium text-white/65 mt-2">Monitor jobs, verifications and users — everything in one place.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/overview" className="inline-flex bg-white text-slate-900 px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-slate-50 transition">Overview →</Link>
              <Link to="/admin/jobs" className="inline-flex bg-white/10 backdrop-blur border border-white/15 text-white px-6 py-3 rounded-full font-bold hover:bg-white/15 transition">Manage jobs →</Link>
              <Link to="/admin/verify" className="hidden sm:inline-flex bg-white/10 backdrop-blur border border-white/15 text-white px-6 py-3 rounded-full font-bold hover:bg-white/15 transition">Verify ({stats?.pendingJobs || 0})</Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {cards.map(c=>(
            <div key={c.label} className={`${c.bg} rounded-[24px] border border-white shadow-sm p-6 lg:p-7 relative overflow-hidden group hover:shadow-lg hover:shadow-slate-200/40 transition`}>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-white font-bold shadow-md mb-4`}>{c.icon}</div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">{c.value.toLocaleString()}</p>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mt-1">{c.label}</p>
              <p className="text-xs font-medium text-slate-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Link to="/admin/jobs" className="group bg-white rounded-[24px] border border-slate-200/70 p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/30 hover:-translate-y-1 hover:border-slate-200 transition-all">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">◈</div>
            <h3 className="font-extrabold text-slate-900 mt-4">Manage Jobs</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Create, edit, delete jobs with rich details</p>
            <span className="inline-flex mt-4 text-xs font-bold text-primary-700 group-hover:gap-1.5 gap-1 transition">Open →</span>
          </Link>
          <Link to="/admin/verify" className="group bg-white rounded-[24px] border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">⬢</div>
            <h3 className="font-extrabold text-slate-900 mt-4 flex items-center gap-2">Verify Jobs {stats?.pendingJobs ? <span className="rounded-full bg-amber-500 text-white text-xs px-2 py-0.5 font-bold">{stats.pendingJobs}</span> : null}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Approve pending submissions</p>
            <span className="inline-flex mt-4 text-xs font-bold text-amber-700">Review now →</span>
          </Link>
          <Link to="/admin/users" className="group bg-white rounded-[24px] border border-slate-200/70 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">👤</div>
            <h3 className="font-extrabold text-slate-900 mt-4">Manage Users</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">View, search and manage accounts</p>
            <span className="inline-flex mt-4 text-xs font-bold text-slate-600">View users →</span>
          </Link>
          <Link to="/admin/pdf" className="group bg-gradient-to-br from-primary-600 to-indigo-600 rounded-[24px] p-7 shadow-lg shadow-primary-600/20 hover:shadow-xl hover:scale-[1.01] transition-all text-white">
            <div className="w-11 h-11 rounded-xl bg-white text-primary-700 flex items-center justify-center font-bold shadow-md">✦</div>
            <h3 className="font-extrabold mt-4">PDF Extraction</h3>
            <p className="text-sm font-medium text-white/80 mt-1">Upload PDF → AI extracts & summarizes</p>
            <span className="inline-flex mt-4 text-xs font-bold bg-white text-primary-700 px-3 py-1.5 rounded-full">Upload now →</span>
          </Link>
          <Link to="/admin/mails" className="group bg-white rounded-[24px] border border-slate-200/70 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">✉</div>
            <h3 className="font-extrabold text-slate-900 mt-4">Mails</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">How mails sent & send manual mails</p>
            <span className="inline-flex mt-4 text-xs font-bold text-emerald-700">Open →</span>
          </Link>
        </div>

        <div className="mt-8 rounded-[24px] bg-white border border-slate-200/70 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">✓</div>
            <div><p className="text-sm font-bold text-slate-900">System healthy</p><p className="text-xs font-medium text-slate-500">All services operational • Data refreshed just now</p></div>
          </div>
          <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 text-xs font-bold">● Live</span>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
