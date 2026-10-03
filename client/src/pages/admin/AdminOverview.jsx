import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

const TABS = ['Overview', 'Mails', 'Notifications', 'Crons', 'Videos'];

function AdminOverview() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/overview').then((res) => setData(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center p-12"><Loader /></div>;
  if (!data) return <p className="p-8 text-center text-sm text-slate-500">Failed to load overview.</p>;

  const { stats, byMethod, recentMails, recentNotifs, recentAudits, recentRuns, crons } = data;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] bg-slate-900 text-white p-7 mb-6">
          <h1 className="text-2xl font-extrabold">Admin Overview</h1>
          <p className="text-sm text-white/65 mt-1">Everything in one separate section — mails, notifications, crons, videos, audits.</p>
          <div className="flex gap-4 mt-3 text-xs font-bold text-white/80">
            <span>Jobs {stats.totalJobs}</span><span>Pending {stats.pendingJobs}</span>
            <span>Users {stats.totalUsers}</span><span>Mails {stats.mailTotal}</span>
            <span>Notifs {stats.notifCount}</span><span>Videos {stats.videoCount}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-bold border ${tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{t}</button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border p-5"><h3 className="font-bold">Mail methods</h3>{byMethod.map((m) => <p key={m._id} className="text-sm mt-1">{m._id || '—'}: {m.count}</p>)}</div>
            <div className="bg-white rounded-2xl border p-5"><h3 className="font-bold">Crons</h3>{crons.map((c) => <p key={c.name} className="text-sm mt-1">{c.name} — {c.ist}</p>)}</div>
            <div className="bg-white rounded-2xl border p-5"><h3 className="font-bold">Recent audits</h3>{recentAudits.slice(0, 5).map((a) => <p key={a._id} className="text-xs mt-1">{a.action} by {a.admin?.email}</p>)}</div>
          </div>
        )}

        {tab === 'Mails' && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr><th className="px-4 py-2 text-left">When</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Method</th></tr></thead>
              <tbody>{recentMails.map((l) => <tr key={l._id} className="border-t"><td className="px-4 py-2 text-xs">{new Date(l.createdAt).toLocaleString('en-IN')}</td><td className="px-4 py-2">{l.user?.email}</td><td className="px-4 py-2">{l.notificationType}</td><td className="px-4 py-2">{l.method}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {tab === 'Notifications' && (
          <div className="bg-white rounded-2xl border p-4 space-y-2">{recentNotifs.map((n) => <div key={n._id} className="border-b pb-2"><p className="font-bold text-sm">{n.title}</p><p className="text-xs text-slate-500">{n.user?.email} • {n.type} • {new Date(n.createdAt).toLocaleString('en-IN')}</p></div>)}</div>
        )}

        {tab === 'Crons' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border p-5"><h3 className="font-bold">Schedules</h3>{crons.map((c) => <p key={c.name} className="text-sm mt-2"><b>{c.name}</b> — {c.schedule} ({c.ist})</p>)}</div>
            <div className="bg-white rounded-2xl border p-5"><h3 className="font-bold">Recent collection runs</h3>{recentRuns.length === 0 ? <p className="text-sm text-slate-500">No runs yet.</p> : recentRuns.map((r) => <p key={r._id} className="text-xs mt-1">{r.kind}/{r.source} — {r.status} — found {r.jobsFound}, created {r.jobsCreated}</p>)}</div>
          </div>
        )}

        {tab === 'Videos' && (
          <div className="bg-white rounded-2xl border p-5"><h3 className="font-bold">Prep videos</h3><p className="text-sm mt-2">Total VideoLinks: {stats.videoCount}</p><p className="text-xs text-slate-500 mt-1">Manage via seed reseed:videos. 65 topics × 1 video.</p></div>
        )}
      </div>
    </div>
  );
}

export default AdminOverview;
