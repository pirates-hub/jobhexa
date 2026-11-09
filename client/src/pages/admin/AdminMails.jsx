import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

const FLOW_LABELS = {
  eligible_digest: 'Daily eligible jobs',
  deadline_reminder: 'Deadline reminders',
  study_plan: 'Study plan daily',
  welcome: 'Welcome',
  password_reset: 'Password reset',
  admin_manual: 'Admin manual',
  admin_test: 'Admin test',
};

const FLOW_SCHEDULES = {
  eligible_digest: '7:00 AM IST · retry 7:45',
  deadline_reminder: '9:00 AM IST',
  study_plan: '8:00 AM IST',
};

const fmt = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const flowLabel = (flow) => FLOW_LABELS[flow] || flow || '—';

const statusPill = (status) => {
  if (status === 'sent') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-rose-100 text-rose-700';
  if (status === 'sending') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

function AdminMails() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [running, setRunning] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [manual, setManual] = useState({ to: 'all', subject: '', message: '', userIds: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/mails/status');
      setStatus(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load mail status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendTest = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/admin/mails/test', { to: testTo || undefined });
      setTestResult({ ok: true, ...res.data.data });
      load();
    } catch (err) {
      setTestResult({ ok: false, error: err.response?.data?.message || err.message });
    } finally {
      setTesting(false);
    }
  };

  const runFlow = async (flow) => {
    if (!window.confirm(`Run "${flowLabel(flow)}" now? This can send real email.`)) return;
    setRunning(flow);
    setRunResult(null);
    try {
      const res = await api.post(`/admin/mails/run/${flow}`);
      setRunResult({ ok: true, flow, ...res.data.data });
      load();
    } catch (err) {
      setRunResult({ ok: false, flow, error: err.response?.data?.message || err.message });
    } finally {
      setRunning('');
    }
  };

  const sendManual = async (e) => {
    e.preventDefault();
    if (!manual.subject || !manual.message) return alert('Subject and message are required');
    setSending(true);
    setSendResult(null);
    try {
      const payload = { subject: manual.subject, message: manual.message };
      if (manual.to === 'all') payload.to = 'all';
      else if (manual.to === 'custom') payload.to = manual.userIds;
      else payload.userIds = manual.userIds.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.post('/admin/mails/send', payload);
      setSendResult({ ok: true, ...res.data.data });
      setManual({ to: 'all', subject: '', message: '', userIds: '' });
      load();
    } catch (err) {
      setSendResult({ ok: false, sent: 0, errors: [err.response?.data?.message || err.message] });
    } finally {
      setSending(false);
    }
  };

  const config = status?.config;
  const chain = config?.chain || [];
  const configuredProviders = (config?.providers || []).filter((p) => p.configured);
  const primarySender = configuredProviders[0]?.from;
  const stats = status?.stats || { sent: 0, failed: 0, sending: 0, byFlow: {} };
  const resend = status?.resend;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] bg-slate-900 text-white p-7 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Mails & Delivery</h1>
              <p className="text-sm text-white/65 mt-1">Provider health, scheduled flows, delivery rows and one-click test sends.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className={`rounded-full px-3 py-1.5 ${config?.paused ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                {config?.paused ? 'Paused' : 'Live'}
              </span>
              <span className={`rounded-full px-3 py-1.5 ${config?.dryRun ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-white/80'}`}>
                {config?.dryRun ? 'Dry run' : 'Real sends'}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/80">
                Queue {status?.queue?.pending ?? 0}
              </span>
              <button onClick={load} disabled={loading} className="rounded-full bg-white text-slate-900 px-4 py-1.5 disabled:opacity-50">
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        {!loading && config && chain.length === 0 && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
            <p className="font-extrabold">No mail provider is configured.</p>
            <p className="mt-1">Add <b>RESEND_API_KEY</b> (recommended) on Render. Brevo needs <b>BREVO_ENABLED=true</b>; SMTP needs <b>ALLOW_SMTP=true</b> and does not work on Render.</p>
          </div>
        )}

        {loading && !status ? (
          <div className="bg-white rounded-[24px] border border-slate-200 p-16 flex justify-center"><Loader /></div>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                <h2 className="font-extrabold text-slate-900">Provider chain</h2>
                {chain.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chain.map((provider, index) => (
                      <span key={provider} className={`rounded-full px-3 py-1.5 text-xs font-bold ${index === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {index + 1}. {provider}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-rose-600">Nothing configured</p>
                )}
                <div className="mt-4 space-y-2 text-xs">
                  <p className="flex justify-between gap-3"><span className="text-slate-500 font-medium">Sender</span><span className="font-bold text-slate-800 text-right break-all">{primarySender || '—'}</span></p>
                  <p className="flex justify-between gap-3"><span className="text-slate-500 font-medium">Last success</span><span className="font-bold text-slate-800 text-right">{status?.lastSuccess ? `${flowLabel(status.lastSuccess.flow)} · ${fmt(status.lastSuccess.sentAt)}` : 'Never'}</span></p>
                  <p className="flex justify-between gap-3"><span className="text-slate-500 font-medium">Delay between sends</span><span className="font-bold text-slate-800">{config?.sendDelayMs} ms</span></p>
                </div>
              </div>

              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                <h2 className="font-extrabold text-slate-900">Last 7 days</h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ['Sent', stats.sent, 'text-emerald-600'],
                    ['Failed', stats.failed, 'text-rose-600'],
                    ['Sending', stats.sending, 'text-amber-600'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 text-xs">
                  {Object.entries(stats.byFlow || {}).map(([flow, counts]) => (
                    <p key={flow} className="flex justify-between gap-3">
                      <span className="font-medium text-slate-600">{flowLabel(flow)}</span>
                      <span className="font-bold text-slate-800">{counts.sent} sent · {counts.failed} failed</span>
                    </p>
                  ))}
                  {!Object.keys(stats.byFlow || {}).length && <p className="text-slate-400 font-medium">No deliveries recorded yet.</p>}
                </div>
              </div>

              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                <h2 className="font-extrabold text-slate-900">Resend domains</h2>
                {!resend?.configured ? (
                  <p className="mt-3 text-sm font-medium text-slate-500">RESEND_API_KEY is not set.</p>
                ) : !resend.ok ? (
                  <p className="mt-3 text-sm font-medium text-rose-600 break-words">{resend.error}</p>
                ) : resend.domains.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-amber-700">No domain verified. Use onboarding@resend.dev for a test to the account owner only.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {resend.domains.map((domain) => (
                      <div key={domain.id || domain.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <span className="text-xs font-bold text-slate-800 break-all">{domain.name}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${domain.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{domain.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">A verified domain is required to show “JobHexa” in the inbox and send to recipients other than the Resend account owner.</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <form onSubmit={sendTest} className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                <h2 className="font-extrabold text-slate-900">Send a test email</h2>
                <p className="text-xs text-slate-500 mt-1">Uses the real provider chain. Leave blank to send to your admin account.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <button disabled={testing} className="rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
                    {testing ? 'Sending…' : 'Send test'}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-3 rounded-xl border p-3 text-xs ${testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                    {testResult.ok
                      ? <>Sent via <b>{testResult.provider}</b> to {testResult.to} · message id {testResult.messageId}</>
                      : <>Failed: {testResult.error}</>}
                  </div>
                )}
              </form>

              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                <h2 className="font-extrabold text-slate-900">Run a flow now</h2>
                <p className="text-xs text-slate-500 mt-1">Already-sent users are skipped by the delivery idempotency key.</p>
                <div className="mt-4 space-y-2">
                  {[
                    ['eligible_digest', 'Daily eligible jobs'],
                    ['deadline_reminder', 'Deadline reminders'],
                    ['study_plan', 'Study plan daily'],
                  ].map(([flow, label]) => (
                    <button
                      key={flow}
                      onClick={() => runFlow(flow)}
                      disabled={Boolean(running) || config?.paused}
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-bold text-slate-800">{label}</span>
                        <span className="block text-[11px] font-medium text-slate-500">{FLOW_SCHEDULES[flow]}</span>
                      </span>
                      <span className="text-xs font-extrabold text-slate-500">{running === flow ? 'Running…' : 'Run →'}</span>
                    </button>
                  ))}
                </div>
                {runResult && (
                  <div className={`mt-3 rounded-xl border p-3 text-xs ${runResult.ok ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                    {runResult.ok
                      ? <><b>{flowLabel(runResult.flow)}</b> — sent {runResult.sent || 0}, skipped {runResult.skipped || 0}, failed {runResult.failed || 0}{runResult.paused ? ' (mail is paused)' : ''}</>
                      : <>Failed: {runResult.error}</>}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={sendManual} className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm mb-6">
              <h2 className="font-extrabold text-slate-900">Send a manual mail</h2>
              <p className="text-xs text-slate-500 mt-1">Every recipient gets the branded template, an unsubscribe link and an in-app notification on success.</p>
              <div className="grid lg:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">To</label>
                  <select value={manual.to} onChange={(e) => setManual({ ...manual, to: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="all">All users</option>
                    <option value="custom">Custom email(s)</option>
                    <option value="ids">By user IDs</option>
                  </select>
                  {manual.to !== 'all' && (
                    <input
                      value={manual.userIds}
                      onChange={(e) => setManual({ ...manual, userIds: e.target.value })}
                      placeholder={manual.to === 'custom' ? 'a@x.com, b@y.com' : 'userId1, userId2'}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Subject</label>
                  <input value={manual.subject} onChange={(e) => setManual({ ...manual, subject: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Message</label>
                  <textarea value={manual.message} onChange={(e) => setManual({ ...manual, message: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button disabled={sending} className="rounded-full bg-slate-900 text-white px-6 py-2.5 text-sm font-bold disabled:opacity-50">
                  {sending ? 'Sending…' : 'Send mail'}
                </button>
                {sendResult && (
                  <p className={`text-xs font-bold ${sendResult.ok && !sendResult.errors?.length ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Sent {sendResult.sent}/{sendResult.total ?? '?'}
                    {sendResult.errors?.length ? ` — ${sendResult.errors.slice(0, 2).join('; ')}` : ' ✓'}
                  </p>
                )}
              </div>
            </form>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900">Delivery rows</h3>
                  <p className="text-xs text-slate-500 mt-0.5">One row per user + flow + period. This is the idempotency gate.</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{status?.deliveryTotal ?? 0} total · showing {status?.deliveries?.length ?? 0}</span>
              </div>
              {!status?.deliveries?.length ? (
                <p className="p-8 text-sm text-slate-500 text-center">No deliveries yet. Send a test or run a flow above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">When</th>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-left">Flow</th>
                        <th className="px-4 py-3 text-left">Period key</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Provider</th>
                        <th className="px-4 py-3 text-left">Tries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {status.deliveries.map((row) => (
                        <tr key={row._id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(row.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800">{row.user?.name || '—'}</span>
                            <span className="block text-[11px] text-slate-400">{row.user?.email || row.toDomain || ''}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{flowLabel(row.flow)}</td>
                          <td className="px-4 py-3 text-[11px] text-slate-500 break-all max-w-[220px]">{row.periodKey}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusPill(row.status)}`}>{row.status}</span></td>
                          <td className="px-4 py-3 text-xs text-slate-600">{row.provider || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{row.attempts || 0}{row.lastError ? <span className="block text-[10px] text-rose-500 max-w-[220px] truncate" title={row.lastError}>{row.lastError}</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900">Provider attempts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">HTTP status and error for every provider try (no recipient local-part stored).</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{status?.attemptTotal ?? 0} total · showing {status?.attempts?.length ?? 0}</span>
              </div>
              {!status?.attempts?.length ? (
                <p className="p-8 text-sm text-slate-500 text-center">No provider attempts recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">When</th>
                        <th className="px-4 py-3 text-left">Provider</th>
                        <th className="px-4 py-3 text-left">Flow</th>
                        <th className="px-4 py-3 text-left">Result</th>
                        <th className="px-4 py-3 text-left">Domain</th>
                        <th className="px-4 py-3 text-left">Subject / error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {status.attempts.map((row) => (
                        <tr key={row._id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(row.createdAt)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{row.provider}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{flowLabel(row.flow)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {row.ok ? 'ok' : `fail${row.statusCode ? ` ${row.statusCode}` : ''}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{row.toDomain || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 max-w-[360px]">
                            <span className="block truncate" title={row.subject}>{row.subject || '—'}</span>
                            {row.error && <span className="block text-[10px] text-rose-500 truncate" title={row.error}>{row.error}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminMails;
