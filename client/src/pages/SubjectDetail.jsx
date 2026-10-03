import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prepService from '../services/prepService';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function SubjectDetail() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filterDiff, setFilterDiff] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchSubject = async () => {
      try { const res = await prepService.getSubjectBySlug(slug); setSubject(res.data.data.subject); setTopics(res.data.data.topics || []); } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchSubject();
  }, [slug, user, navigate, authLoading]);

  if (authLoading) return null;
  if (!user) return null;

  const getDifficultyColor = (d) => {
    switch (d?.toLowerCase()) {
      case 'easy': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'hard': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };
  const getDiffDot = (d) => d?.toLowerCase()==='easy' ? 'bg-emerald-500' : d?.toLowerCase()==='medium' ? 'bg-amber-500' : d?.toLowerCase()==='hard' ? 'bg-red-500' : 'bg-slate-300';

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;
  if (!subject) return <div className="min-h-[60vh] bg-[#F8FAFC] p-8"><div className="max-w-[1480px] mx-auto"><EmptyState title="Subject not found" description="The requested subject could not be found" /></div></div>;

  const filtered = topics.filter(t => {
    if (filterDiff !== 'all' && (t.difficulty||'').toLowerCase() !== filterDiff) return false;
    if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <Link to="/preparation" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group">
          <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> Back to Preparation
        </Link>

        <div className="rounded-[28px] bg-white border border-slate-200/70 shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-primary-600 via-indigo-600 to-violet-600 p-8 lg:p-10 text-white relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1.5 text-xs font-bold tracking-widest uppercase">{topics.length} topics • English videos</div>
                <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>{subject.name}</h1>
                {subject.description && <p className="text-sm font-medium text-white/80 leading-relaxed mt-3 max-w-2xl">{subject.description}</p>}
              </div>
              <div className="hidden lg:flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-md shrink-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">▶</div>
                <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Progress</p><p className="text-sm font-extrabold text-slate-900 leading-none mt-1">Save topics to plan</p></div>
              </div>
            </div>
          </div>
          <div className="px-6 lg:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {['all','easy','medium','hard'].map(v=>(
                <button key={v} onClick={()=>setFilterDiff(v)} className={`px-4 py-2 rounded-full text-xs font-bold capitalize border transition ${filterDiff===v ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{v}</button>
              ))}
            </div>
            <div className="relative w-full lg:w-72">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search topics…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Topics <span className="text-slate-400">• {filtered.length}</span></h2>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> English resources</span>
            <Link to="/chat" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 to-blue-600 text-white px-3.5 py-1.5 text-xs font-bold hover:shadow-md transition">✦ Ask AI</Link>
          </div>
        </div>

        {/* connecting line roadmap wrapper */}
        {filtered.length > 0 ? (
          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-primary-200 to-slate-200 -translate-x-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((topic, idx) => {
                const pct = 20 + ((idx*41)%80);
                const circ = 2*Math.PI*22;
                const off = circ - (pct/100)*circ;
                return (
                  <Link key={topic._id} to={`/preparation/topic/${topic.slug}`} className="group relative bg-white rounded-[24px] border border-slate-200/70 p-6 lg:p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-primary-50 to-indigo-50 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition" />
                    <div className="relative flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getDiffDot(topic.difficulty)}`} />
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${getDifficultyColor(topic.difficulty)}`}>{topic.difficulty || '—'}</span>
                      </div>
                      <div className="relative w-12 h-12 shrink-0">
                        <svg width="48" height="48" viewBox="0 0 56 56" className="-rotate-90">
                          <circle cx="28" cy="28" r="22" fill="none" stroke="#F1F5F9" strokeWidth="5" />
                          <circle cx="28" cy="28" r="22" fill="none" stroke="#5B5FEF" strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} style={{transition:'stroke-dashoffset 0.8s ease'}} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-slate-700">{topic.estimatedHours ? `${topic.estimatedHours}h` : `${pct}%`}</span>
                      </div>
                    </div>
                    <h3 className="relative text-[16px] font-extrabold tracking-tight text-slate-900 group-hover:text-primary-700 transition line-clamp-2 leading-snug">{topic.name}</h3>
                    {topic.description && <p className="relative text-sm font-medium text-slate-500 line-clamp-2 mt-2 leading-relaxed">{topic.description}</p>}
                    <div className="relative mt-auto pt-5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{topic.estimatedHours ? `~${topic.estimatedHours} hours` : 'Self-paced'}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-700">View topic <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></span>
                    </div>
                    <div className="hidden lg:flex absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-primary-200 shadow-sm" />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No topics found" description={q || filterDiff!=='all' ? 'Try a different search or filter' : "Topics will be added soon"} /></div>
        )}
      </div>
    </div>
  );
}

export default SubjectDetail;
