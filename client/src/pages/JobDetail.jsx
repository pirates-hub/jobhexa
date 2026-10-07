import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import jobService from '../services/jobService';
import Loader from '../components/common/Loader';
import Badge from '../components/common/Badge';
import EligibilityBadge from '../components/jobs/EligibilityBadge';
import { formatDate, formatCurrency, daysUntil, getDeadlineColor, getJobStatusBadge } from '../utils/helpers';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function JobDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState('');
  const [related, setRelated] = useState([]);

  const handleTrack = async () => {
    if (!user) { setTrackMsg('Please login to track'); return; }
    if (!job?._id) { setTrackMsg('Job not loaded yet'); return; }
    setTracking(true);
    try {
      await api.post('/applications', { jobId: job._id, status: 'saved' });
      try { await api.post(`/saved-jobs/${job._id}`); } catch (_) {}
      setTrackMsg('Added to tracker & saved!');
    } catch (e) {
      const msg = e.response?.data?.message || '';
      if (msg.includes('Already tracking')) {
        setTrackMsg('Already in your tracker - view in Applications');
      } else {
        setTrackMsg(msg || 'Failed to track');
      }
    } finally { setTracking(false); setTimeout(() => setTrackMsg(''), 4000); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await jobService.getJobBySlug(slug);
        const j = res.data.data.job;
        setJob(j);
        if (j?.examType) {
          try {
            const r = await jobService.getJobsByExamType(j.examType);
            const list = (r.data.data.jobs || []).filter(x => x.slug !== slug).slice(0, 3);
            setRelated(list);
          } catch {}
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [slug, user, navigate, authLoading]);

  if (authLoading) return null;
  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse mb-6" />
          <div className="bg-white rounded-[28px] border border-slate-200/70 p-8 lg:p-10 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="h-8 w-2/3 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-4 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />)}
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-[1.7fr_0.9fr] gap-6 mt-6">
            <div className="space-y-6">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-3xl border border-slate-200/70 animate-pulse" />)}
            </div>
            <div className="h-[420px] bg-white rounded-3xl border border-slate-200/70 animate-pulse sticky top-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-[#F8FAFC] flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white rounded-[28px] border border-slate-200/70 shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5 text-red-600 text-xl">!</div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900" style={{fontFamily:'Sora'}}>Something went wrong</h2>
          <p className="text-sm font-medium text-slate-500 mt-2">{error}</p>
          <Link to="/jobs" className="inline-flex mt-6 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-slate-800 transition shadow-md">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const status = getJobStatusBadge(job.jobStatus);
  const appEndDays = job.applicationEndDate ? daysUntil(job.applicationEndDate) : null;
  const examDays = job.examDate ? daysUntil(job.examDate) : null;
  const deadlineTone = appEndDays !== null ? (appEndDays <= 3 ? 'red' : appEndDays <= 7 ? 'amber' : 'emerald') : null;

  const timeline = [
    job.applicationStartDate && { label: 'Application starts', date: job.applicationStartDate, icon: '◐', tone: 'slate' },
    job.applicationEndDate && { label: 'Application ends', date: job.applicationEndDate, icon: '⬢', tone: deadlineTone === 'red' ? 'red' : deadlineTone === 'amber' ? 'amber' : 'slate', badge: appEndDays !== null ? (appEndDays > 0 ? `${appEndDays}d left` : appEndDays === 0 ? 'Today' : 'Passed') : null },
    job.examDate && { label: 'Exam date', date: job.examDate, icon: '✦', tone: 'indigo', badge: examDays !== null ? (examDays > 0 ? `${examDays}d to go` : 'Today/passed') : null },
    job.resultDate && { label: 'Result date', date: job.resultDate, icon: '◎', tone: 'emerald' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-0">
      {/* hero */}
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-indigo-50/60" />
        <div className="absolute -right-24 -top-24 w-[520px] h-[520px] bg-gradient-to-br from-primary-200/40 via-indigo-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute -left-24 -bottom-24 w-[420px] h-[420px] bg-gradient-to-tr from-violet-200/30 to-transparent rounded-full blur-3xl" />
        <div className="relative max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <Link to="/jobs" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group">
            <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300 transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></span>
            Back to Jobs
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide border shadow-sm bg-white ${status.color.includes('green') ? 'border-emerald-200 text-emerald-700' : status.color.includes('blue') ? 'border-blue-200 text-blue-700' : status.color.includes('red') ? 'border-red-200 text-red-700' : 'border-slate-200 text-slate-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.color.includes('green') ? 'bg-emerald-500' : status.color.includes('blue') ? 'bg-blue-500' : 'bg-slate-400'}`} />{status.text}
                </span>
                {job.examType && <span className="inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-extrabold tracking-widest uppercase">{job.examType}</span>}
                {job.state && <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">{job.state}</span>}
                {deadlineTone && <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${deadlineTone==='red' ? 'bg-red-50 border-red-200 text-red-700' : deadlineTone==='amber' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{appEndDays > 0 ? `${appEndDays} days left` : appEndDays===0 ? 'Last day today!' : 'Deadline passed'} • closes {formatDate(job.applicationEndDate)}</span>}
              </div>

              <h1 className="text-[28px] lg:text-[42px] font-extrabold tracking-[-0.04em] leading-[1.05] text-slate-900" style={{fontFamily:'Sora'}}>
                {job.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
                <span className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-2 shadow-sm">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">{(job.department||'D').charAt(0)}</span>
                  {job.department}{job.organization ? ` • ${job.organization}` : ''}
                </span>
                {job.totalVacancies && <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3.5 py-2 shadow-sm"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {job.totalVacancies.toLocaleString()} vacancies</span>}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {job.applicationFee && Object.entries(job.applicationFee).slice(0,3).map(([k,v])=> v!=null && <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 capitalize shadow-sm">{k}: <b className="text-slate-900">{formatCurrency(v)}</b></span>)}
                {job.eligibility?.ageMax && <span className="inline-flex rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">Age {job.eligibility.ageMin||18}–{job.eligibility.ageMax} yrs</span>}
              </div>
            </div>

            <div className="hidden lg:block w-[380px] shrink-0">
              <div className="rounded-[28px] bg-white border border-slate-200/70 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl" />
                  <p className="relative text-xs font-bold tracking-widest uppercase text-white/60">Apply panel</p>
                  <p className="relative text-lg font-extrabold tracking-tight mt-1">Don’t miss the deadline</p>
                  <p className="relative text-sm text-white/70 font-medium mt-1">Track, apply and get reminded automatically</p>
                </div>
                <div className="p-6">
                  {trackMsg && <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-3">{trackMsg}</div>}
                  <div className="space-y-3">
                    {job.applyLink && <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-md shadow-primary-600/20 hover:shadow-lg hover:from-primary-700 hover:to-indigo-700 transition">Apply Now <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></a>}
                    <button onClick={handleTrack} disabled={tracking} className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition shadow-md"> {tracking ? 'Saving...' : '✦ Track this job'}</button>
                    <Link to="/chat" className="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition">Ask AI about this job</Link>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    {job.officialWebsite && <a href={job.officialWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white transition">Official site ↗</a>}
                    {job.notificationPdfUrl && <a href={job.notificationPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">Notification PDF</a>}
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 text-center mt-3">Links open in new tab • verify on official site</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-6 lg:gap-8 items-start">
          {/* left content */}
          <div className="space-y-6">
            {/* timeline */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-7 lg:px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Important dates</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Timeline of this notification</p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-bold px-3 py-1.5">{timeline.length} milestones</span>
              </div>
              <div className="p-7 lg:p-8">
                <div className="relative pl-8">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
                  <div className="space-y-6">
                    {timeline.map((t, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        <div className={`absolute -left-8 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center text-[10px] font-bold shadow-sm ${t.tone==='red' ? 'border-red-200 text-red-600' : t.tone==='amber' ? 'border-amber-200 text-amber-600' : t.tone==='indigo' ? 'border-indigo-200 text-indigo-600' : t.tone==='emerald' ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-600'}`}>
                          {t.icon}
                        </div>
                        <div className="flex-1 flex flex-wrap items-start justify-between gap-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl px-5 py-4 hover:bg-white hover:shadow-sm transition">
                          <div>
                            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">{t.label}</p>
                            <p className="text-[15px] font-bold text-slate-900 mt-1">{formatDate(t.date)}</p>
                          </div>
                          {t.badge && <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${t.tone==='red' ? 'bg-red-50 border-red-200 text-red-700' : t.tone==='amber' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-700'}`}>{t.badge}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* eligibility check */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-7 lg:px-8 py-6 border-b border-slate-100">
                <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Eligibility check</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">See instantly if you qualify</p>
              </div>
              <div className="p-7 lg:p-8">
                <EligibilityBadge slug={slug} />
              </div>
            </div>

            {/* vacancies */}
            {job.totalVacancies && (
              <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-7 lg:px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Vacancies</h2>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-xs font-bold">{job.totalVacancies.toLocaleString()} total</span>
                </div>
                <div className="p-7 lg:p-8">
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">{job.totalVacancies.toLocaleString()}</span>
                    <span className="text-sm font-medium text-slate-500">total posts</span>
                  </div>
                  {job.categoryWiseVacancies && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(job.categoryWiseVacancies).map(([cat,count])=> count>0 && (
                        <div key={cat} className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4">
                          <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500">{cat}</p>
                          <p className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">{count.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* eligibility details */}
            {job.eligibility && (
              <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-7 lg:px-8 py-6 border-b border-slate-100">
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Eligibility criteria</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Qualification, age and relaxation</p>
                </div>
                <div className="p-7 lg:p-8 space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {job.eligibility.qualifications?.length > 0 && (
                      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-5">
                        <p className="text-[11px] font-extrabold tracking-widest uppercase text-indigo-600">Qualification</p>
                        <p className="font-bold text-slate-900 mt-2 leading-relaxed">{job.eligibility.qualifications.map(q=>q.level).join(' or ')}</p>
                      </div>
                    )}
                    {job.eligibility.ageMax && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5">
                        <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500">Age limit</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-2">{job.eligibility.ageMin || 18} – {job.eligibility.ageMax} <span className="text-sm font-semibold text-slate-500">years</span></p>
                        <p className="text-xs font-medium text-slate-500 mt-1">Calculated as per notification cutoff</p>
                      </div>
                    )}
                    {job.eligibility.gender && job.eligibility.gender !== 'any' && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5">
                        <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500">Gender</p>
                        <p className="font-bold text-slate-900 capitalize mt-2">{job.eligibility.gender}</p>
                      </div>
                    )}
                    {job.eligibility.experience && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5">
                        <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-500">Experience</p>
                        <p className="font-medium text-slate-700 mt-2 text-sm leading-relaxed">{job.eligibility.experience}</p>
                      </div>
                    )}
                  </div>
                  {job.eligibility.ageRelaxation && Object.values(job.eligibility.ageRelaxation).some(v=>v>0) && (
                    <div>
                      <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-700 mb-3">Age relaxation</h3>
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr><th className="text-left py-3 px-4 font-bold text-slate-600 text-xs tracking-widest uppercase">Category</th><th className="text-right py-3 px-4 font-bold text-slate-600 text-xs tracking-widest uppercase">Relaxation</th></tr>
                          </thead>
                          <tbody>
                            {Object.entries(job.eligibility.ageRelaxation).map(([cat,years])=> years>0 && (
                              <tr key={cat} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"><td className="py-3 px-4 capitalize font-medium text-slate-700">{cat}</td><td className="py-3 px-4 text-right font-bold text-slate-900">+{years} years</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {job.applicationFee && (
              <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-7 lg:px-8 py-6 border-b border-slate-100">
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Application fee</h2>
                </div>
                <div className="p-7 lg:p-8">
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(job.applicationFee).map(([cat, amount])=> amount!==null && amount!==undefined && (
                      <div key={cat} className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4 text-center hover:bg-white hover:shadow-sm transition">
                        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 capitalize">{cat}</p>
                        <p className="font-extrabold text-slate-900 mt-1.5 text-lg">{formatCurrency(amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {job.syllabus?.sections?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-7 lg:px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Syllabus</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{job.syllabus.sections.length} sections • {job.syllabus.sections.reduce((a,s)=>a+(s.topics?.length||0),0)} topics</p>
                  </div>
                  {job.syllabus.negativeMarking && <span className="hidden sm:inline-flex rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 text-xs font-bold">Neg. marking: {job.syllabus.negativeMarking}</span>}
                </div>
                <div className="p-7 lg:p-8">
                  <div className="grid gap-4">
                    {job.syllabus.sections.map((section,i)=>(
                      <div key={i} className="group rounded-2xl border border-slate-200/70 overflow-hidden hover:shadow-md hover:border-slate-200 transition bg-white">
                        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-slate-900 pr-2">{section.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {section.marks && <span className="inline-flex rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">Marks: {section.marks}</span>}
                              {section.duration && <span className="inline-flex rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">{section.duration} min</span>}
                            </div>
                          </div>
                          <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0">{String(i+1).padStart(2,'0')}</span>
                        </div>
                        {section.topics?.length > 0 && (
                          <ul className="px-6 py-5 grid sm:grid-cols-2 gap-2">
                            {section.topics.map((topic,j)=>(
                              <li key={j} className="flex items-start gap-2.5 text-sm font-medium text-slate-600 bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />{topic}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                  {job.syllabus.negativeMarking && <p className="sm:hidden text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">Negative marking: {job.syllabus.negativeMarking}</p>}
                </div>
              </div>
            )}

            {job.description && (
              <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-7 lg:p-8">
                <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900 mb-4">About this recruitment</h2>
                <p className="text-[15px] leading-7 text-slate-600 whitespace-pre-line font-medium">{job.description}</p>
              </div>
            )}

            {/* official source + aggregator details — never invent, show Not specified */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-7 lg:p-8">
              <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900 mb-1">Official notification</h2>
              <p className="text-xs font-medium text-slate-500 mb-5">Always verify in the original notification before applying.</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 border p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Advertisement No.</p><p className="font-bold mt-1">{job.advertisementNumber || 'Not specified'}</p></div>
                <div className="rounded-2xl bg-slate-50 border p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Post name</p><p className="font-bold mt-1">{job.postName || 'Not specified'}</p></div>
                <div className="rounded-2xl bg-slate-50 border p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Salary / Pay scale</p><p className="font-bold mt-1">{job.salary || job.payScale || 'Not specified'}</p></div>
                <div className="rounded-2xl bg-slate-50 border p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Selection process</p><p className="font-bold mt-1">{job.selectionProcess?.length ? job.selectionProcess.join(', ') : 'Not specified'}</p></div>
                <div className="rounded-2xl bg-slate-50 border p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Published on</p><p className="font-bold mt-1">{job.publicationDate ? formatDate(job.publicationDate) : 'Not specified'}</p></div>
                <div className="rounded-2xl bg-slate-50 border p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Last verified</p><p className="font-bold mt-1">{job.lastVerifiedDate ? formatDate(job.lastVerifiedDate) : 'Not specified'}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {job.officialWebsite && <a href={job.officialWebsite} target="_blank" rel="noopener noreferrer" className="rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-bold">Official website ↗</a>}
                {job.officialNotificationUrl && <a href={job.officialNotificationUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold">Notification URL ↗</a>}
                {job.officialApplyUrl && <a href={job.officialApplyUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold">Application URL ↗</a>}
                {job.notificationPdfUrl && <a href={job.notificationPdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold">Notification PDF ↗</a>}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-4">Disclaimer: JobHexa is not an official government website. Details are collected from official notifications — verify everything in the original notification before applying.</p>
            </div>

            {/* how to apply — shown especially when link is the homepage, not a direct form */}
            {job.howToApply?.length > 0 && (
              <div id="how-to-apply" className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-7 lg:p-8 scroll-mt-24">
                <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900 mb-1">How to apply</h2>
                <p className="text-xs font-medium text-slate-500 mb-5">
                  {(job.applyLink || job.officialApplyUrl) && (job.applyLink || job.officialApplyUrl) !== job.officialWebsite
                    ? 'Direct application portal below — follow the steps.'
                    : 'Applications run on the official site (no direct form link) — follow the steps.'}
                </p>
                <ol className="space-y-3">
                  {job.howToApply.map((step, i) => (
                    <li key={i} className="flex gap-3.5 text-sm font-medium text-slate-700 bg-slate-50/70 border border-slate-100 rounded-2xl px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <span className="leading-relaxed">
                        {String(step).split(/(https?:\/\/[^\s)]+)/g).map((part, k) =>
                          /^https?:\/\//.test(part)
                            ? <a key={k} href={part} target="_blank" rel="noopener noreferrer" className="text-primary-700 font-bold underline break-all">{part}</a>
                            : <span key={k}>{part}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
                {(job.applyLink || job.officialApplyUrl) && (
                  <a href={job.applyLink || job.officialApplyUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md text-sm">
                    {(job.applyLink || job.officialApplyUrl) !== job.officialWebsite ? 'Apply Now ↗' : 'Open Official Site ↗'}
                  </a>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-primary-600 via-indigo-600 to-violet-600 rounded-3xl p-7 lg:p-8 text-white shadow-lg shadow-primary-600/20 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">Need a plain-language summary?</h3>
                  <p className="text-sm font-medium text-white/80 mt-1 max-w-xl">Ask the AI assistant for eligibility, documents and fee breakdown in seconds.</p>
                </div>
                <Link to="/chat" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-bold shadow-md hover:bg-slate-50 transition shrink-0">✦ Ask AI assistant</Link>
              </div>
            </div>
          </div>

          {/* right sticky aside desktop */}
          <div className="hidden lg:block space-y-6 sticky top-[88px]">
            {/* deadline card duplicate for sticky scroll */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-6">
              <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-900">Quick facts</h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">🗓️</div>
                  <div><p className="text-xs font-bold tracking-widest uppercase text-slate-500">Department</p><p className="text-sm font-bold text-slate-900">{job.department}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 text-primary-700 flex items-center justify-center font-bold">◈</div>
                  <div><p className="text-xs font-bold tracking-widest uppercase text-slate-500">Exam type</p><p className="text-sm font-bold text-slate-900 capitalize">{job.examType || '-'}</p></div>
                </div>
                {job.categoryWiseVacancies && <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4"><p className="text-xs font-extrabold tracking-widest uppercase text-slate-500 mb-2">Vacancies split</p><div className="space-y-1.5">{Object.entries(job.categoryWiseVacancies).filter(([,v])=>v>0).slice(0,5).map(([k,v])=> <div key={k} className="flex justify-between text-xs"><span className="font-medium text-slate-600 capitalize">{k}</span><span className="font-bold text-slate-900">{v}</span></div>)}</div></div>}
              </div>
            </div>

            {related.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-6">
                <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-900">Related jobs</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">More in {job.examType}</p>
                <div className="mt-5 space-y-3">
                  {related.map(r => (
                    <Link key={r._id} to={`/jobs/${r.slug}`} className="block rounded-2xl border border-slate-200/70 p-4 hover:bg-slate-50 hover:border-slate-200 transition group">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-primary-700 transition line-clamp-2 leading-snug">{r.title}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 truncate">{r.department}</p>
                      <span className="inline-flex mt-2 text-xs font-bold text-primary-700">View →</span>
                    </Link>
                  ))}
                </div>
                <Link to="/jobs" className="mt-4 block text-center text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900">Browse all jobs →</Link>
              </div>
            )}

            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 p-6">
              <p className="text-xs font-extrabold tracking-widest uppercase text-amber-700">Before you apply</p>
              <ul className="mt-3 space-y-2 text-sm font-medium text-amber-900/80 leading-relaxed list-disc pl-5">
                <li>Verify details on the official notification PDF</li>
                <li>Keep category & domicile certificates ready</li>
                <li>Track the job to get deadline reminders</li>
              </ul>
            </div>
          </div>
        </div>

        {/* related mobile */}
        {related.length > 0 && (
          <div className="lg:hidden mt-8 bg-white rounded-3xl border border-slate-200/70 shadow-sm p-6">
            <h3 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Related jobs</h3>
            <div className="mt-4 grid gap-3">
              {related.map(r=>(
                <Link key={r._id} to={`/jobs/${r.slug}`} className="block rounded-2xl border border-slate-200/70 p-4 hover:bg-slate-50 transition">
                  <p className="text-sm font-bold text-slate-900 line-clamp-2">{r.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{r.department}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] px-4 py-3">
        <div className="flex gap-3">
          <button onClick={handleTrack} disabled={tracking} className="flex-1 inline-flex items-center justify-center bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50">
            {tracking ? 'Saving...' : 'Track'}
          </button>
          {job.applyLink ? (
            <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="flex-[1.4] inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl font-bold text-sm shadow-md">Apply Now <span aria-hidden>↗</span></a>
          ) : (
            <Link to="/chat" className="flex-[1.4] inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl font-bold text-sm">Ask AI</Link>
          )}
        </div>
        {trackMsg && <p className="text-xs font-semibold text-emerald-600 text-center mt-2">{trackMsg}</p>}
      </div>
    </div>
  );
}

export default JobDetail;
