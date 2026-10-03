import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prepService from '../services/prepService';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function ExamDetail() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchData = async () => {
      try {
        const [examRes, subjRes, progRes] = await Promise.all([
          prepService.getExamBySlug(slug),
          prepService.getSubjects(),
          prepService.getProgressBySubject().catch(() => null),
        ]);
        setExam(examRes.data.data.exam);
        setSubjects(subjRes.data.data.subjects || []);
        const map = {};
        (progRes?.data?.data?.progress || []).forEach((p) => {
          map[p.subject] = p.totalVideos ? Math.round((p.savedVideos / p.totalVideos) * 100) : 0;
        });
        setProgressMap(map);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [slug, user, navigate, authLoading]);

  if (authLoading) return null;
  if (!user) return null;

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><div className="bg-white rounded-3xl border border-slate-200/70 p-12 flex flex-col items-center gap-4 shadow-sm"><Loader /></div></div>;
  if (!exam) return <div className="min-h-[60vh] bg-[#F8FAFC] p-8"><div className="max-w-[1480px] mx-auto"><EmptyState title="Exam not found" description="The requested exam could not be found" /></div></div>;

  const filtered = subjects.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <Link to="/preparation" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group">
          <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> Back to Preparation
        </Link>

        <div className="rounded-[28px] bg-white border border-slate-200/70 shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap gap-2 mb-4">
                {exam.examLevel && <span className="rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-xs font-bold capitalize tracking-widest">{exam.examLevel}</span>}
                {exam.frequency && <span className="rounded-full bg-white text-slate-900 px-3 py-1 text-xs font-bold capitalize tracking-widest">{exam.frequency}</span>}
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>{exam.name}</h1>
              {exam.fullName && <p className="text-white/70 font-medium mt-2">{exam.fullName}</p>}
              {exam.conductingBody && <p className="text-sm font-bold text-white/60 mt-1">Conducted by {exam.conductingBody}</p>}
              {exam.description && <p className="text-sm font-medium text-white/65 leading-relaxed mt-4 max-w-3xl">{exam.description}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                {exam.officialWebsite && <a href={exam.officialWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-50 transition">Official website ↗</a>}
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/15 text-white px-5 py-2.5 rounded-full text-sm font-bold">{subjects.length} subjects</span>
                <Link to="/chat" className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg transition">✦ Ask AI about this exam</Link>
              </div>
            </div>
          </div>
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">◈</div>
              <div><p className="text-sm font-bold text-slate-900">Subjects roadmap</p><p className="text-xs font-medium text-slate-500">Pick a subject to view topics & videos</p></div>
            </div>
            <div className="relative w-full sm:w-72">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search subjects…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Subjects <span className="text-slate-400 font-bold">• {filtered.length}</span></h2>
          <span className="hidden sm:inline-flex rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Animated roadmap • Progress sync</span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((subject, idx) => {
              // Real saved-video progress for this subject (0% until the user saves videos)
              const progress = progressMap[subject._id] ?? 0;
              const circ = 2*Math.PI*28;
              const off = circ - (progress/100)*circ;
              return (
                <Link key={subject._id} to={`/preparation/subject/${subject.slug}`} className="group bg-white rounded-[24px] border border-slate-200/70 p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-primary-50 to-indigo-50 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">{String(idx+1).padStart(2,'0')}</div>
                    <div className="relative w-14 h-14 shrink-0">
                      <svg width="56" height="56" viewBox="0 0 64 64" className="-rotate-90">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#5B5FEF" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} style={{transition:'stroke-dashoffset 0.8s ease'}} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-slate-900">{progress}%</span>
                    </div>
                  </div>
                  <h3 className="relative text-[17px] font-extrabold tracking-tight text-slate-900 group-hover:text-primary-700 transition mt-4 line-clamp-1">{subject.name}</h3>
                  <p className="relative text-xs font-bold tracking-widest uppercase text-slate-400 mt-1">Subject • Tap to explore</p>
                  {subject.description && <p className="relative text-sm font-medium text-slate-500 line-clamp-2 mt-3 leading-relaxed">{subject.description}</p>}
                  <div className="relative mt-6 flex items-center justify-between pt-5 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700">View topics <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></span>
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs group-hover:bg-primary-600 transition">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No subjects found" description={q ? `No results for “${q}”` : "Subjects will be added soon"} /></div>
        )}
      </div>
    </div>
  );
}

export default ExamDetail;
