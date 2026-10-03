import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prepService from '../services/prepService';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function Preparation() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchExams = async () => {
      try { const res = await prepService.getExams(); setExams(res.data.data.exams); } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchExams();
  }, [user, navigate]);

  const filtered = exams.filter(e => !query || e.name.toLowerCase().includes(query.toLowerCase()) || e.conductingBody?.toLowerCase().includes(query.toLowerCase()));

  if (authLoading) return null;
  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-10 w-64 bg-slate-200 rounded-2xl animate-pulse mb-4" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i=> <div key={i} className="h-56 bg-white rounded-[24px] border border-slate-200/70 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 relative overflow-hidden shadow-xl shadow-slate-900/20 mb-8">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(91,95,239,0.15),transparent_50%)]" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Curated learning paths</div>
              <h1 className="mt-4 text-4xl lg:text-[42px] font-extrabold tracking-[-0.04em] leading-none text-white" style={{fontFamily:'Sora'}}>Exam <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Preparation</span></h1>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/65 max-w-2xl">Browse exams, subjects and topics — roadmap with progress rings, English video resources and saved materials.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{exams.length}</div>
                <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Exams</p><p className="text-sm font-extrabold text-slate-900 leading-none mt-1">Available now</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* roadmap line desktop */}
        <div className="hidden lg:block relative mb-10">
          <div className="absolute top-1/2 left-8 right-8 h-px bg-gradient-to-r from-slate-200 via-primary-200 to-slate-200" />
          <div className="relative grid grid-cols-4 gap-4">
            {[
              {n:'01', t:'Pick exam', d:'Choose your target'},
              {n:'02', t:'Master subjects', d:'Topic-wise depth'},
              {n:'03', t:'Watch & learn', d:'English videos only'},
              {n:'04', t:'Track progress', d:'Save & revisit'},
            ].map(s=>(
              <div key={s.n} className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm text-center">
                <span className="inline-flex w-8 h-8 rounded-full bg-slate-900 text-white items-center justify-center text-xs font-extrabold">{s.n}</span>
                <p className="text-sm font-bold text-slate-900 mt-2">{s.t}</p>
                <p className="text-xs font-medium text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">All exams</h2>
            <p className="text-sm font-medium text-slate-500">{filtered.length} exams • English resources • Updated weekly</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative w-full sm:w-80">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search exams or bodies…" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition shadow-sm" />
          </div>
          <Link to="/chat" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition whitespace-nowrap">✦ Ask AI about exams</Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No exams found" description={query ? `No results for “${query}”` : "Exam data will be added soon"} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((exam) => (
              <Link key={exam._id} to={`/preparation/${exam.slug}`} className="group relative bg-white rounded-[24px] border border-slate-200/70 p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 overflow-hidden flex flex-col">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-primary-50 to-indigo-50 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-extrabold text-sm shadow-md">{exam.name.slice(0,2).toUpperCase()}</div>
                    <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">{exam.examLevel || 'national'}</span>
                  </div>
                  <h3 className="text-[17px] font-extrabold tracking-tight text-slate-900 group-hover:text-primary-700 transition line-clamp-1">{exam.name}</h3>
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-1">{exam.conductingBody || '—'}</p>
                  <p className="text-sm font-medium text-slate-500 line-clamp-2 mt-3 leading-relaxed">{exam.description || exam.fullName || 'Curated preparation roadmap with subjects, topics and English video lessons.'}</p>
                </div>
                <div className="relative mt-6 flex items-center justify-between pt-5 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700">View subjects <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></span>
                  <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs group-hover:bg-primary-600 transition">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-[24px] bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">▶</div>
            <div><p className="text-sm font-bold text-slate-900">All videos are English-only, curated and quality-checked</p><p className="text-xs font-medium text-slate-500">Save resources to revisit — progress syncs to My Plan</p></div>
          </div>
          <Link to="/my-plan" className="inline-flex bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition">Go to My Plan →</Link>
        </div>
      </div>
    </div>
  );
}

export default Preparation;
