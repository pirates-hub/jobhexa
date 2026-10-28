import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';

const PAGE_SIZE = 50;

function VerifyJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/jobs/pending', { params: { page: nextPage, limit: PAGE_SIZE } });
      const data = res.data?.data || {};
      const list = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs((prev) => (append ? [...prev, ...list] : list));
      setTotal(data.total ?? list.length);
      setPage(data.page ?? nextPage);
      setPages(data.pages ?? 1);
    } catch (err) {
      if (!append) setJobs([]);
      setError(
        err.response?.data?.message ||
          (err.response?.status === 401
            ? 'Your admin session expired. Sign in again to load the queue.'
            : 'Could not load the pending queue. Check that the API is running, then retry.')
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const removeRow = (id) => {
    setJobs((prev) => prev.filter((j) => j._id !== id));
    setTotal((t) => Math.max(t - 1, 0));
  };

  const verify = async (id) => {
    setActing(id);
    setNotice('');
    try {
      await api.patch(`/admin/jobs/${id}/verify`);
      removeRow(id);
      setNotice('Approved — now live on /jobs and alerts sent.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Approve failed — try again.');
    } finally {
      setActing(null);
    }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    setActing(id);
    setNotice('');
    try {
      await api.patch(`/admin/jobs/${id}/reject`, { reason });
      removeRow(id);
      setNotice('Rejected — hidden from the public site.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Reject failed — try again.');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 sm:p-8">
            <h1 className="text-xl font-extrabold text-red-800">Pending queue could not load</h1>
            <p className="text-sm font-medium text-red-700 mt-2 break-words">{error}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => load(1)} className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm">Retry</button>
              <a href="/login" className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-700 px-5 py-2.5 rounded-full font-bold text-sm">Sign in again</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (total === 0 && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-[28px] bg-gradient-to-br from-emerald-600 to-teal-600 p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <h1 className="relative text-3xl font-extrabold" style={{ fontFamily: 'Sora' }}>All clear ✓</h1>
            <p className="relative text-white/80 font-medium mt-2">No pending jobs — every submission is verified.</p>
          </div>
          <div className="mt-8 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm">
            <EmptyState title="No pending jobs" description="All jobs are verified. New submissions will appear here." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500 text-white px-3 py-1.5 text-xs font-bold tracking-widest uppercase shadow-md"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> {total} pending</div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{ fontFamily: 'Sora' }}>Pending Verification</h1>
              <p className="text-sm font-medium text-white/65 mt-2">Review details carefully — approve to publish or reject with reason.</p>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 text-slate-900 shadow-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">{total}</div>
              <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Queue</p><p className="text-sm font-extrabold leading-none mt-1">Awaiting review</p></div>
            </div>
          </div>
        </div>

        {notice && <p className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{notice}</p>}

        <p className="mt-5 text-xs font-bold tracking-widest uppercase text-slate-400">Showing {jobs.length} of {total}</p>

        <div className="mt-3 grid gap-5">
          {jobs.map((job) => (
            <div key={job._id} className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden hover:shadow-lg hover:shadow-slate-200/30 transition">
              <div className="p-5 sm:p-7 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 text-xs font-bold">Pending review</span>
                      {job.examType && <span className="inline-flex rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-bold capitalize">{job.examType}</span>}
                      {job.state && <span className="inline-flex rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{job.state}</span>}
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-snug break-words">{job.title}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1 break-words">{job.department} {job.organization ? `• ${job.organization}` : ''}</p>
                    {job.description && <p className="text-sm font-medium text-slate-600 leading-relaxed mt-3 line-clamp-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 break-words">{job.description.substring(0, 400)}{job.description.length > 400 ? '…' : ''}</p>}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {job.totalVacancies && <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-slate-600">{job.totalVacancies.toLocaleString()} vacancies</span>}
                      {job.applicationEndDate && <span className="rounded-full bg-white border border-slate-200 px-3 py-1 font-medium text-slate-600">Deadline: {new Date(job.applicationEndDate).toLocaleDateString('en-IN')}</span>}
                      {job.officialNotificationUrl && <a href={job.officialNotificationUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 font-bold text-blue-700">Source ↗</a>}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => verify(job._id)} disabled={acting === job._id} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-md transition">
                    {acting === job._id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✓'} Approve
                  </button>
                  <button onClick={() => reject(job._id)} disabled={acting === job._id} className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition">✕ Reject</button>
                  <span className="ml-auto text-xs font-medium text-slate-400 self-center">ID: {job._id.slice(-6)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {page < pages && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => load(page + 1, true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : `Load next ${Math.min(PAGE_SIZE, total - jobs.length)} of ${total}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyJobs;
