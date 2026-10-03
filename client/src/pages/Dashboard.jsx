import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';
import profileService from '../services/profileService';
import api from '../services/api';
import Loader from '../components/common/Loader';
import JobCard from '../components/jobs/JobCard';
import { formatDate, daysUntil, getDeadlineColor } from '../utils/helpers';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [eligibleCentral, setEligibleCentral] = useState(null);
  const [eligibleState, setEligibleState] = useState(null);
  const [homeState, setHomeState] = useState('');
  const [forYou, setForYou] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchData = async () => {
      try {
        const [deadRes, savedRes, appRes, profRes] = await Promise.all([
          jobService.getUpcomingDeadlines(),
          api.get('/saved-jobs').catch(() => ({ data: { data: { savedJobs: [] } } })),
          api.get('/applications').catch(() => ({ data: { data: { applications: [] } } })),
          profileService.getProfile().catch(()=>null),
        ]);
        setDeadlines(deadRes.data.data.jobs || []);
        setSavedCount(savedRes.data.data.savedJobs?.length || 0);
        setAppCount(appRes.data.data.applications?.length || 0);
        setApps(appRes.data.data.applications || []);
        const st = profRes?.data?.data?.user?.state || user.state || '';
        setHomeState(st);
        // Eligible-for-you counts for Central + own State pages
        try {
          const c = await api.get('/jobs/recommended?level=central&limit=50');
          setEligibleCentral((c.data.data.jobs || []).filter((s) => s.eligible).length);
        } catch {}
        if (st) {
          try {
            const s = await api.get(`/jobs/recommended?state=${encodeURIComponent(st)}&limit=50`);
            setEligibleState((s.data.data.jobs || []).filter((x) => x.eligible).length);
          } catch {}
        }
        // Jobs visible right after login: top eligible picks for this user
        try {
          const r = await api.get('/jobs/recommended?limit=6');
          setForYou((r.data.data.jobs || []).filter((x) => x.eligible).slice(0, 4).map((x) => x.job));
        } catch {}
        if (profRes?.data?.data?.user) {
          const u = profRes.data.data.user;
          const fields = [u.name, u.email, u.phone, u.dateOfBirth, u.gender, u.state, u.category, u.qualification?.highest, u.preferredExamTypes?.length];
          const filled = fields.filter(Boolean).length;
          setProfileCompletion(Math.round((filled/fields.length)*100));
        } else {
          // fallback heuristic
          const fields = [user.name, user.email, user.phone, user.state, user.category];
          const filled = fields.filter(Boolean).length;
          setProfileCompletion(Math.round((filled/5)*100) || 65);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user, navigate]);

  if (authLoading) return null;
  if (!user) return null;

  const stats = [
    { label: 'Saved Jobs', value: String(savedCount), icon: '◈', sub: 'Bookmarked for later', gradient: 'from-amber-400 via-orange-400 to-yellow-400', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500', textColor: 'text-amber-900', subColor: 'text-amber-700/70', link: '/saved-jobs' },
    { label: 'Applications', value: String(appCount), icon: '✦', sub: 'Submitted & tracking', gradient: 'from-emerald-400 via-teal-400 to-cyan-400', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600', textColor: 'text-emerald-900', subColor: 'text-emerald-700/70', link: '/applications' },
    { label: 'Upcoming Deadlines', value: String(deadlines.length), icon: '⬢', sub: 'Closing soon', gradient: 'from-blue-500 via-indigo-500 to-violet-500', bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600', textColor: 'text-blue-900', subColor: 'text-blue-700/70', link: '/jobs' },
  ];

  const quickLinks = [
    { label: 'Browse Jobs', path: '/jobs', description: 'Find government job openings', icon: '🔍', accent: 'bg-slate-900' },
    { label: 'New weekly updates', path: '/weekly-updates', description: 'Added in last 7 / 30 days', icon: '🆕', accent: 'bg-rose-600' },
    { label: 'Central Jobs eligible', path: '/central-jobs', description: eligibleCentral === null ? 'All-India jobs with your eligibility' : `${eligibleCentral} eligible for you`, icon: '🏛️', accent: 'bg-blue-600' },
    { label: homeState ? `${homeState} Jobs eligible` : 'State Jobs eligible', path: homeState ? `/state-jobs/${homeState}` : '/jobs', description: eligibleState === null ? 'Your state jobs with your eligibility' : `${eligibleState} eligible for you`, icon: '📍', accent: 'bg-emerald-600' },
    { label: 'AI Assistant', path: '/chat', description: 'Ask about jobs, eligibility, preparation', icon: '✨', accent: 'bg-indigo-600' },
    { label: 'Preparation', path: '/preparation', description: 'Study materials and resources', icon: '📚', accent: 'bg-emerald-600' },
    { label: 'My Plan', path: '/my-plan', description: 'Your personalized study plan', icon: '🎯', accent: 'bg-amber-500' },
    { label: 'My Profile', path: '/profile', description: 'Update your profile details', icon: '👤', accent: 'bg-slate-700' },
    { label: 'Saved Jobs', path: '/saved-jobs', description: 'Jobs you bookmarked', icon: '◈', accent: 'bg-violet-600' },
  ];

  const pipeline = [
    { key: 'saved', label: 'Saved', color: 'bg-slate-200' },
    { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
    { key: 'in_progress', label: 'In progress', color: 'bg-amber-500' },
    { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
  ];
  const pipelineCounts = pipeline.map(p => ({ ...p, count: apps.filter(a => a.status===p.key).length }));

  const ringCirc = 2 * Math.PI * 44;
  const ringOffset = ringCirc - (profileCompletion/100)*ringCirc;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* welcome banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 mb-8 shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.04] to-transparent" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3.5 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Career command center
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.03em] text-white leading-tight" style={{fontFamily:'Sora'}}>
                Welcome back, <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{user.name || 'User'}</span>
              </h1>
              <p className="text-[15px] font-medium text-white/65 mt-3 max-w-xl leading-relaxed">
                Manage your job search and preparation — track deadlines, review saved roles, and keep momentum every day.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/jobs" className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-black/10 hover:bg-slate-50 transition">
                  Explore jobs <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link to="/chat" className="hidden sm:inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-white/15 transition">Ask AI</Link>
                <span className="hidden lg:inline-flex items-center gap-2 text-white/60 text-xs font-semibold ml-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{deadlines.length} deadlines • {savedCount} saved • {appCount} tracking</span>
              </div>
            </div>

            {/* profile completion ring */}
            <div className="shrink-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-6 lg:p-7 flex items-center gap-6 shadow-lg">
              <div className="relative w-[96px] h-[96px] shrink-0">
                <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#5B5FEF" strokeWidth="10" strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} style={{transition:'stroke-dashoffset 1s ease'}} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-white leading-none">{profileCompletion}%</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/70">complete</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-extrabold text-white tracking-tight">Profile completion</p>
                <p className="text-xs font-medium text-white/65 mt-1 max-w-[180px] leading-relaxed">Complete your profile to unlock better matching & eligibility scores.</p>
                <Link to="/profile" className="inline-flex mt-3 bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-50 transition">Complete profile →</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.link} className={`${stat.bg} relative rounded-[24px] p-7 lg:p-8 border border-white shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden group block`}>
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/60 rounded-full blur-2xl group-hover:bg-white/80 transition" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center text-white font-extrabold text-sm shadow-md mb-4`}>{stat.icon}</div>
                  <p className={`text-[11px] font-extrabold tracking-[0.14em] uppercase ${stat.subColor}`}>{stat.label}</p>
                  <p className={`text-4xl font-extrabold tracking-[-0.04em] mt-1 ${stat.textColor}`}>{stat.value}</p>
                  <p className={`text-xs font-semibold mt-1.5 ${stat.subColor}`}>{stat.sub}</p>
                </div>
                <div className={`hidden lg:block w-20 h-20 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-10 group-hover:opacity-15 transition`} />
              </div>
              <div className={`mt-5 h-1.5 rounded-full bg-gradient-to-r ${stat.gradient} opacity-80`} />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          <div className="space-y-6">
            {forYou.length > 0 && (
              <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/70 p-7 lg:p-8">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-[13px] font-extrabold tracking-widest uppercase text-slate-900">Jobs eligible for you</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Matched to your profile — visible right after login</p>
                  </div>
                  <Link to="/jobs" className="hidden sm:inline-flex text-xs font-bold text-primary-700 hover:text-primary-800">View all →</Link>
                </div>
                <div className="grid gap-4 mt-4">
                  {forYou.map((j) => <JobCard key={j._id} job={j} showEligibility />)}
                </div>
              </div>
            )}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/70 p-7 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[13px] font-extrabold tracking-widest uppercase text-slate-900">Application pipeline</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Where your applications stand</p>
                </div>
                <Link to="/applications" className="hidden sm:inline-flex text-xs font-bold text-primary-700 hover:text-primary-800">View all →</Link>
              </div>
              {apps.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm font-bold text-slate-700">No applications yet</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Start tracking jobs to see your pipeline here</p>
                  <Link to="/jobs" className="inline-flex mt-4 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold">Browse jobs</Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {pipelineCounts.map(p => (
                      <div key={p.key} className="rounded-2xl bg-slate-50 border border-slate-200/60 p-4 text-center">
                        <div className={`w-2 h-2 rounded-full mx-auto ${p.color}`} />
                        <p className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2">{p.count}</p>
                        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mt-1">{p.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-1.5">
                    {pipelineCounts.map(p => (
                      <div key={p.key} className={`h-2 rounded-full ${p.color} transition-all`} style={{width: `${appCount ? (p.count/appCount)*100 : 0}%`, minWidth: p.count ? '12px' : '0'}} />
                    ))}
                  </div>
                  <div className="mt-6 space-y-3">
                    {apps.slice(0,3).map(a => (
                      <Link key={a._id} to={`/jobs/${a.job?.slug || ''}`} className="flex items-center justify-between rounded-2xl border border-slate-200/70 p-4 hover:bg-slate-50 transition">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.job?.title || 'Job'}</p>
                          <p className="text-xs font-medium text-slate-500 truncate">{a.job?.department || ''}</p>
                        </div>
                        <span className={`shrink-0 ml-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize bg-white ${a.status==='applied' ? 'border-blue-200 text-blue-700' : a.status==='completed' ? 'border-emerald-200 text-emerald-700' : a.status==='in_progress' ? 'border-amber-200 text-amber-700' : 'border-slate-200 text-slate-600'}`}>{a.status.replace('_',' ')}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/70 p-7 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[13px] font-extrabold tracking-widest uppercase text-slate-900">Quick actions</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Jump to your most used areas</p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full bg-slate-900 text-white text-xs font-bold px-3 py-1.5">{quickLinks.length} shortcuts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickLinks.map((link) => (
                  <Link key={link.path} to={link.path} className="group relative flex gap-4 p-5 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-300">
                    <div className={`w-11 h-11 rounded-xl ${link.accent} flex items-center justify-center text-white text-lg shadow-md shrink-0 group-hover:scale-105 transition`}>{link.icon}</div>
                    <div className="min-w-0">
                      <p className="font-bold tracking-tight text-slate-900 group-hover:text-primary-700 transition text-[15px] leading-none">{link.label}</p>
                      <p className="text-[13px] font-medium text-slate-500 leading-relaxed mt-1.5 line-clamp-2">{link.description}</p>
                    </div>
                    <svg className="absolute right-4 top-5 w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/70 p-7 lg:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[13px] font-extrabold tracking-widest uppercase text-slate-900">Deadline timeline</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Don’t miss what’s closing soon</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{deadlines.length} active
              </span>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-12"><Loader size="sm" /></div>
            ) : deadlines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm mb-3">📭</div>
                <p className="text-sm font-bold text-slate-700">No upcoming deadlines</p>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-[260px]">You’re all clear — new deadlines will appear here once you save jobs.</p>
                <Link to="/jobs" className="mt-4 inline-flex bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold">Explore jobs</Link>
              </div>
            ) : (
              <div className="space-y-0">
                <div className="relative pl-7">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  {deadlines.slice(0, 6).map((job) => {
                    const days = daysUntil(job.applicationEndDate);
                    const urgent = days <= 3;
                    const soon = days <= 7;
                    return (
                      <Link key={job._id} to={`/jobs/${job.slug}`} className="relative block group py-3 first:pt-0 last:pb-0">
                        <span className={`absolute -left-7 top-4 w-3 h-3 rounded-full border-2 bg-white shadow-sm ${urgent ? 'border-red-400 bg-red-500' : soon ? 'border-amber-300 bg-amber-400' : 'border-slate-300 bg-slate-200'}`} />
                        <div className="rounded-2xl border border-slate-200/70 bg-white group-hover:bg-slate-50 group-hover:shadow-md group-hover:border-slate-200 transition-all p-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold tracking-tight text-slate-900 group-hover:text-primary-700 transition truncate text-[14.5px]">{job.title}</p>
                              <p className="text-[13px] font-medium text-slate-500 truncate mt-0.5">{job.department}</p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold tracking-wide shadow-sm bg-white ${urgent ? 'border-red-200 text-red-700' : soon ? 'border-amber-200 text-amber-700' : 'border-slate-200 text-slate-700'}`}>
                              {days > 0 ? `${days}d left` : days === 0 ? 'Today!' : 'Passed'}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Deadline: {formatDate(job.applicationEndDate)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {deadlines.length > 6 && <Link to="/jobs" className="block text-center text-sm font-bold text-primary-700 hover:text-primary-800 py-3 mt-2">View all deadlines →</Link>}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-slate-200/70 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md">✓</div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Stay ahead of every deadline</p>
              <p className="text-xs font-medium text-slate-500">Enable browser notifications and sync your saved jobs daily.</p>
            </div>
          </div>
          <Link to="/saved-jobs" className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-bold shadow-md hover:bg-slate-800 transition">Go to Saved Jobs →</Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
