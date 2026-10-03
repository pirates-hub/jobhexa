import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

function AdminMails() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ to: 'all', subject: '', message: '', userIds: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/mails/logs?limit=50');
      setLogs(res.data.data.logs || []);
      setTotal(res.data.data.total || 0);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) return alert('Subject and message required');
    setSending(true); setResult(null);
    try {
      const payload = { subject: form.subject, message: form.message };
      if (form.to === 'all') payload.to = 'all';
      else if (form.to === 'custom') payload.to = form.userIds;
      else if (form.to === 'ids') payload.userIds = form.userIds.split(',').map((s)=>s.trim()).filter(Boolean);
      else payload.to = form.to;
      const res = await api.post('/admin/mails/send', payload);
      setResult(res.data.data);
      setForm({ to: 'all', subject: '', message: '', userIds: '' });
      load();
    } catch (err) { setResult({ sent: 0, errors: [err.response?.data?.message || err.message] }); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] bg-slate-900 text-white p-7 lg:p-8 mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Mails & Notifications</h1>
          <p className="text-sm text-white/65 mt-1">See how mails were sent (in_app + email logs) and send manual mails.</p>
          <p className="text-xs text-white/45 mt-2">Total logs: {total} • Showing {logs.length}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <form onSubmit={send} className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
            <h2 className="font-extrabold text-slate-900">Send manual mail</h2>
            <p className="text-xs text-slate-500 mt-1">Sends via SMTP + creates in-app notification. Logged in audit.</p>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mt-4">To</label>
            <select value={form.to} onChange={(e)=>setForm({...form,to:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <option value="all">All users</option>
              <option value="custom">Custom email(s) — comma separated</option>
              <option value="ids">By user IDs — comma separated</option>
            </select>
            {form.to === 'custom' && <input placeholder="a@x.com, b@y.com" value={form.userIds} onChange={(e)=>setForm({...form,userIds:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />}
            {form.to === 'ids' && <input placeholder="userId1, userId2" value={form.userIds} onChange={(e)=>setForm({...form,userIds:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />}
            <input placeholder="Subject" value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <textarea placeholder="Message (supports new lines → HTML)" value={form.message} onChange={(e)=>setForm({...form,message:e.target.value})} rows={4} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <button disabled={sending} className="mt-4 w-full rounded-full bg-slate-900 text-white py-3 font-bold text-sm disabled:opacity-50">{sending ? 'Sending...' : 'Send now'}</button>
            {result && <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs"><p className="font-bold">Sent {result.sent}/{result.total ?? '?'} {result.errors?.length ? `— errors: ${result.errors.slice(0,3).join('; ')}` : '✓'}</p></div>}
          </form>

          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
            <h2 className="font-extrabold text-slate-900">How mails work</h2>
            <ul className="mt-3 text-sm text-slate-600 space-y-2 list-disc pl-5">
              <li><b>Daily 7:30 AM</b> — digest (open jobs)</li>
              <li><b>9 AM</b> — deadline reminders (7/3/1/0 days)</li>
              <li><b>8 AM</b> — study plan Day N (only if user started a plan)</li>
              <li><b>Instant</b> — new job verified → every user notified</li>
            </ul>
            <p className="text-xs text-slate-400 mt-4">Logs below show in_app + email (method: in_app / both). Manual sends are audited.</p>
            <button onClick={load} className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold">Refresh logs</button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">Mail logs (NotificationLog)</h3>
            <span className="text-xs font-bold text-slate-500">{logs.length} rows</span>
          </div>
          {loading ? <div className="p-12 flex justify-center"><Loader /></div> : logs.length === 0 ? <p className="p-8 text-sm text-slate-500 text-center">No mails logged yet — wait for 7:30/9 AM cron or verify a job.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500"><tr><th className="px-4 py-3 text-left">When</th><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-left">Job</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{logs.map((l)=>(
                  <tr key={l._id} className="hover:bg-slate-50/50"><td className="px-4 py-3 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString('en-IN')}</td><td className="px-4 py-3"><span className="font-medium">{l.user?.name || '—'}</span><span className="text-xs text-slate-400 ml-2">{l.user?.email || ''}</span></td><td className="px-4 py-3"><span className="rounded-full bg-slate-900 text-white px-2 py-1 text-xs font-bold">{l.notificationType}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${l.method==='both'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{l.method}</span></td><td className="px-4 py-3 text-xs truncate max-w-[220px]">{l.job?.title || '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default AdminMails;
