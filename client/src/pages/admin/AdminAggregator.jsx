import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';

const TABS = ['new', 'active', 'closing_soon', 'expired', 'all'];
const TAB_LABELS = { new: 'New', active: 'Active', closing_soon: 'Closing soon', expired: 'Expired', all: 'All' };
const BADGE = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closing_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
};

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');
const fmtDateTime = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function AdminAggregator() {
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({});
  const [meta, setMeta] = useState({ total: 0, totalImported: 0, lastFetchedAt: null });
  const [category, setCategory] = useState('new');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/admin/aggregator', { params: { category, q: q.trim() || undefined, limit: 100 } });
      const data = res.data.data;
      setJobs(data.jobs);
      setCounts(data.counts || {});
      setMeta({ total: data.total, totalImported: data.totalImported, lastFetchedAt: data.lastFetchedAt });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load aggregator jobs' });
    } finally {
      setLoading(false);
    }
  }, [category, q]);

  useEffect(() => {
    const t = setTimeout(fetchJobs, 200);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed.jobs || parsed.data?.jobs;
      if (!Array.isArray(list)) throw new Error('Expected jobs.json exported by the aggregator');
      const res = await api.post('/admin/aggregator/import', { jobs: list });
      const r = res.data.data;
      setMessage({
        type: 'success',
        text: `Imported ${r.received} record(s): ${r.created} new, ${r.updated} already present, ${r.skipped} skipped.`,
      });
      setCategory('new');
      await fetchJobs();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Import failed' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (job) => {
    if (!confirm(`Remove "${job.title}" from the aggregator inbox?`)) return;
    setDeleting(job._id);
    try {
      await api.delete(`/admin/aggregator/${job._id}`);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      setMeta((m) => ({ ...m, total: Math.max(m.total - 1, 0), totalImported: Math.max(m.totalImported - 1, 0) }));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Delete failed' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Admin only
              </div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{ fontFamily: 'Sora' }}>Aggregator Inbox</h1>
              <p className="text-sm font-medium text-white/65 mt-2">
                Newly fetched official notifications stay here until an admin verifies them — they are never shown publicly.
              </p>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 text-slate-900 shadow-md">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Last fetch</p>
              <p className="text-sm font-extrabold leading-none mt-1.5">{meta.lastFetchedAt ? fmtDateTime(meta.lastFetchedAt) : 'No imports yet'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          {[
            { key: 'new', label: 'New', tone: 'text-blue-700 bg-blue-50 border-blue-200' },
            { key: 'active', label: 'Active', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { key: 'closing_soon', label: 'Closing soon', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
            { key: 'expired', label: 'Expired', tone: 'text-slate-600 bg-slate-100 border-slate-200' },
            { key: 'total', label: 'Total imported', tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
          ].map((card) => (
            <div key={card.key} className="bg-white rounded-[20px] border border-slate-200/70 shadow-sm p-5">
              <p className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${card.tone}`}>{card.label}</p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 mt-3">
                {(card.key === 'total' ? meta.totalImported : counts[card.key] || 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-5 lg:p-6 mt-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Import aggregator export</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Upload <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">jobs.json</span> from
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mx-1">aggregator/data/</span>
                or the <span className="font-semibold">jobs-export</span> artifact of a GitHub Actions run. Titles are
                quality-checked: recruitment notices are <span className="font-semibold">published immediately</span>,
                junk (nav links, results, corrigenda) is rejected.
              </p>
            </div>
            <div className="shrink-0">
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" id="aggregator-import" />
              <label
                htmlFor="aggregator-import"
                className={`inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-slate-800 transition cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {importing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '↑'}
                {importing ? 'Importing…' : 'Upload jobs.json'}
              </label>
            </div>
          </div>
          {message && (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-4 lg:p-5 flex flex-col lg:flex-row gap-4 lg:items-center justify-between mt-6">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setCategory(tab)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold capitalize border transition ${category === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {TAB_LABELS[tab]} {tab === 'all' ? `(${meta.totalImported})` : `(${counts[tab] || 0})`}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, organization or source…"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium focus:bg-white focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader /></div>
        ) : jobs.length === 0 ? (
          <div className="mt-6 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm">
            <EmptyState
              title={category === 'new' ? 'No new jobs' : 'Nothing here'}
              description={category === 'new' ? 'Upload a fresh jobs.json export to bring in newly fetched notifications.' : 'Try another category or clear the search.'}
            />
          </div>
        ) : (
          <>
            <div className="hidden lg:block mt-6 bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-slate-500">Job</th>
                      <th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Category</th>
                      <th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Last date</th>
                      <th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Fetched</th>
                      <th className="text-right py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job._id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-900 line-clamp-1">{job.title}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            {job.organization || '—'} · {job.state || 'All India'}
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{job.aggregatorMeta?.sourceId || 'source'}</span>
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${BADGE[job.aggregatorMeta?.category] || BADGE.expired}`}>
                            {String(job.aggregatorMeta?.category || 'unknown').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-600">{fmtDate(job.applicationEndDate)}</td>
                        <td className="py-4 px-4 text-xs font-medium text-slate-500">{fmtDateTime(job.aggregatorMeta?.fetchedAt)}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex gap-2">
                            <a href={job.officialNotificationUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold hover:bg-slate-50 transition">Notice</a>
                            <button onClick={() => handleDelete(job)} disabled={deleting === job._id} className="rounded-full border border-red-200 bg-white text-red-600 px-3.5 py-1.5 text-xs font-bold hover:bg-red-50 disabled:opacity-50 transition">
                              {deleting === job._id ? 'Removing…' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:hidden mt-6 space-y-3">
              {jobs.map((job) => (
                <div key={job._id} className="bg-white rounded-[20px] border border-slate-200/70 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-900 leading-snug">{job.title}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${BADGE[job.aggregatorMeta?.category] || BADGE.expired}`}>
                      {String(job.aggregatorMeta?.category || 'unknown').replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-1">{job.organization || '—'} · {job.state || 'All India'}</p>
                  <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Last date: {fmtDate(job.applicationEndDate)}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Fetched: {fmtDateTime(job.aggregatorMeta?.fetchedAt)}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <a href={job.officialNotificationUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-full bg-white border border-slate-200 py-2.5 text-xs font-bold">Notice</a>
                    <button onClick={() => handleDelete(job)} disabled={deleting === job._id} className="flex-1 rounded-full bg-red-50 border border-red-200 text-red-600 py-2.5 text-xs font-bold disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminAggregator;
