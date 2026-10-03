import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { api.get('/admin/users').then(res=> setUsers(res.data.data.users)).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  const handleDelete = async (id) => { if (!confirm('Delete this user?')) return; await api.delete(`/admin/users/${id}`); setUsers(users.filter(u=>u._id!==id)); };

  const filtered = useMemo(()=> users.filter(u=> {
    if (roleFilter!=='all' && u.role!==roleFilter) return false;
    if (q && !u.name.toLowerCase().includes(q.toLowerCase()) && !u.email.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [users, q, roleFilter]);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-slate-500 shadow-sm">Admin • Users</div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900" style={{fontFamily:'Sora'}}>Manage Users <span className="text-slate-400">• {filtered.length}</span></h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Search, filter and manage all registered accounts</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">{users.length}</div>
            <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Total users</p><p className="text-sm font-extrabold text-slate-900 leading-none mt-1">{users.filter(u=>u.role!=='admin').length} members • {users.filter(u=>u.role==='admin').length} admins</p></div>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-4 lg:p-5 flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-6">
          <div className="flex gap-2">
            {['all','user','admin'].map(v=>(
              <button key={v} onClick={()=>setRoleFilter(v)} className={`px-4 py-2 rounded-full text-xs font-bold capitalize border transition ${roleFilter===v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{v}</button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email…" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium focus:bg-white focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition" />
          </div>
        </div>

        <div className="hidden lg:block bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><th className="text-left py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-slate-500">User</th><th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Email</th><th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Role</th><th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">State</th><th className="text-right py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-slate-500">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(u=>(
                  <tr key={u._id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-sm">{u.name?.charAt(0)?.toUpperCase()}</div>
                        <div><p className="font-bold text-slate-900">{u.name}</p><p className="text-xs font-medium text-slate-500">{u.phone || '—'}</p></div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-600">{u.email}</td>
                    <td className="py-4 px-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${u.role==='admin' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{u.role}</span></td>
                    <td className="py-4 px-4 font-medium text-slate-600">{u.state || '—'}</td>
                    <td className="py-4 px-6 text-right"><button onClick={()=>handleDelete(u._id)} className="rounded-full border border-red-200 bg-white text-red-600 px-3.5 py-1.5 text-xs font-bold hover:bg-red-50 transition">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length===0 && <div className="p-12 text-center"><p className="text-sm font-bold text-slate-600">No users found</p></div>}
        </div>

        <div className="lg:hidden space-y-3">
          {filtered.map(u=>(
            <div key={u._id} className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">{u.name?.charAt(0)}</div>
                <div className="min-w-0"><p className="font-bold text-slate-900 truncate">{u.name}</p><p className="text-xs font-medium text-slate-500 truncate">{u.email}</p><span className={`inline-flex mt-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${u.role==='admin' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{u.role} • {u.state||'—'}</span></div>
              </div>
              <button onClick={()=>handleDelete(u._id)} className="shrink-0 rounded-full border border-red-200 text-red-600 px-3 py-1.5 text-xs font-bold">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManageUsers;
