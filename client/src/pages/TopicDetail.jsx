import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prepService from '../services/prepService';
import api from '../services/api';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function TopicDetail() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);
  const [filter, setFilter] = useState('all');
  const [failedEmbeds, setFailedEmbeds] = useState({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchTopic = async () => {
      try {
        const res = await prepService.getTopicBySlug(slug);
        setTopic(res.data.data.topic);
        setVideos(res.data.data.videos || []);
        try { const s = await prepService.getSavedResources().catch(()=>null); if(s?.data?.data) setSaved((s.data.data.saved || []).map(String));} catch {}
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchTopic();
  }, [slug, user, navigate, authLoading]);

  const getDifficultyColor = (d) => {
    switch (d?.toLowerCase()) {
      case 'easy': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'hard': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const englishVideos = useMemo(()=> videos.filter(v=> (v.language||'').toLowerCase()==='english'), [videos]);
  const displayVideos = useMemo(()=> {
    let list = filter==='english' ? englishVideos : videos;
    if (filter==='saved') return list.filter(v=> saved.includes(v._id));
    return list;
  }, [videos, englishVideos, filter, saved]);

  const toggleSave = async (id) => {
    const idStr = String(id);
    try {
      if (saved.includes(idStr)) { await prepService.removeSavedResource(id); setSaved(saved.filter(x=>x!==idStr)); }
      else { await prepService.saveResource(id); setSaved([...saved, idStr]); }
    } catch {
      setSaved(saved.includes(idStr) ? saved.filter(x=>x!==idStr) : [...saved, idStr]);
    }
  };

  if (authLoading) return null;
  if (!user) return null;
  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;
  if (!topic) return <div className="min-h-[60vh] bg-[#F8FAFC] p-8"><div className="max-w-[1480px] mx-auto"><Link to="/preparation" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group"><span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> Back to Preparation</Link><EmptyState title="Topic not found" description="The requested topic could not be found" /></div></div>;

  const subjectSlug = topic.subject?.slug;
  const subjectName = topic.subject?.name;

  const FREE_RESOURCES = {
    'Indian Polity': [
      { label: 'India Code — Bare Acts (Constitution, laws)', url: 'https://www.indiacode.nic.in', note: 'Official legislation text' },
      { label: 'NCERT eBooks — Polity textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–12 political science' },
    ],
    'History': [{ label: 'NCERT eBooks — History textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–12, ancient to modern' }],
    'Geography': [{ label: 'NCERT eBooks — Geography textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–12 + map skills' }],
    'Economics': [{ label: 'NCERT eBooks — Economics textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 9–12 economy basics' }],
    'General Science': [{ label: 'NCERT eBooks — Science textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–12 physics, chemistry, biology' }],
    'Hindi Language': [{ label: 'NCERT eBooks — Hindi textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Vyakaran + pathyapustak' }],
    'English Language': [{ label: 'NCERT eBooks — English textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Honeydew, First Flight & more' }],
    'Quantitative Aptitude': [{ label: 'NCERT eBooks — Maths textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–10 arithmetic base' }],
    'Reasoning': [{ label: 'NCERT eBooks — Maths & logic base (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–10 reasoning base' }],
    'Statistics': [{ label: 'NCERT eBooks — Statistics chapters (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 11 statistics' }],
    'Descriptive Writing': [{ label: 'NCERT eBooks — English writing practice (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Words & Expressions workbooks' }],
    'Technical Knowledge': [{ label: 'NPTEL — Free IIT video courses', url: 'https://nptel.ac.in', note: 'CS, EE, ME, CE, EC subjects' }],
    'Computer Knowledge': [
      { label: 'NIELIT — Free course material (CCC, O Level)', url: 'https://www.nielit.gov.in', note: 'Govt computer literacy courses' },
      { label: 'NPTEL — Computer Science courses', url: 'https://nptel.ac.in', note: 'Free IIT video courses' },
    ],
    'General Awareness': [
      { label: 'PIB — Official press releases (free)', url: 'https://pib.gov.in', note: 'Source for current affairs' },
      { label: 'NCERT eBooks — Static GK base (free PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Class 6–12 all subjects' },
    ],
  };
  const freeLinks = FREE_RESOURCES[subjectName] || [{ label: 'NCERT eBooks — Free textbooks (PDF)', url: 'https://ncert.nic.in/textbook.php', note: 'Official free study material' }];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 mb-4">
          <Link to="/preparation" className="hover:text-slate-900 transition">Preparation</Link>
          <span aria-hidden="true">/</span>
          {subjectSlug ? (
            <>
              <Link to={`/preparation/subject/${subjectSlug}`} className="hover:text-slate-900 transition">{subjectName || 'Subject'}</Link>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          <span className="text-slate-900">{topic.name}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {subjectSlug ? (
            <Link to={`/preparation/subject/${subjectSlug}`} className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition group">
              <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> Back to {subjectName || 'Subject'}
            </Link>
          ) : (
            <Link to="/preparation" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition group">
              <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> Back to Preparation
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6 lg:gap-8 items-start">
          <div className="bg-white rounded-[28px] border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {topic.difficulty && <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize backdrop-blur bg-white/10 border-white/20 text-white`}>{topic.difficulty}</span>}
                  {topic.estimatedHours && <span className="inline-flex rounded-full bg-white text-slate-900 px-3 py-1 text-xs font-bold">~{topic.estimatedHours} hours</span>}
                  <span className="inline-flex rounded-full bg-emerald-500 text-white px-3 py-1 text-xs font-bold">English only</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>{topic.name}</h1>
                {topic.description && <p className="text-sm font-medium text-white/70 leading-relaxed mt-3 max-w-2xl">{topic.description}</p>}
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${getDifficultyColor(topic.difficulty)}`}>{topic.difficulty || '—'} difficulty</span>
                {topic.estimatedHours && <span className="inline-flex rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Estimated {topic.estimatedHours}h</span>}
                <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700">{englishVideos.length} English videos</span>
                <Link to="/chat" className="inline-flex rounded-full bg-gradient-to-r from-primary-600 to-blue-600 text-white px-3 py-1.5 text-xs font-bold hover:shadow-md transition">✦ Ask AI about this topic</Link>
              </div>
              <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-3">
                <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">✦</span>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">All videos are curated in English and quality-checked. Save favourites to revisit from My Plan and track completion.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-6">
              <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-900">Progress</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative w-14 h-14">
                  <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#5B5FEF" strokeWidth="6" strokeLinecap="round" strokeDasharray={2*Math.PI*22} strokeDashoffset={2*Math.PI*22 * (1 - Math.min(englishVideos.length? (saved.length/englishVideos.length):0,1))} style={{transition:'stroke-dashoffset 0.6s ease'}} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold">{englishVideos.length ? Math.round((saved.length/englishVideos.length)*100) : 0}%</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{saved.length} / {englishVideos.length} saved</p>
                  <p className="text-xs font-medium text-slate-500">Save videos to track learning</p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-600 to-indigo-600 transition-all" style={{width: `${englishVideos.length ? (saved.length/englishVideos.length)*100 : 0}%`}} /></div>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-6">
              <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-900">Saved resources</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Quick access to your bookmarked videos</p>
              {saved.length===0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm font-bold text-slate-700">No saved yet</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Tap ♡ on any video to save</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {videos.filter(v=>saved.includes(v._id)).slice(0,4).map(v=>(
                    <div key={v._id} className="flex gap-3 p-3 rounded-2xl border border-slate-200/70 bg-slate-50/50">
                      <div className="w-16 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs">▶</div>
                      <div className="min-w-0"><p className="text-xs font-bold text-slate-900 line-clamp-1">{v.title}</p><p className="text-[11px] font-medium text-slate-500 truncate">{v.channelName}</p></div>
                    </div>
                  ))}
                  {saved.length>4 && <p className="text-xs font-bold text-center text-slate-500">+{saved.length-4} more</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Free syllabus resources</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Official free material for {subjectName || 'this subject'} — no cost, no login</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-xs font-bold">100% FREE</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {freeLinks.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 hover:bg-white hover:shadow-md hover:border-slate-300 transition">
                <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">◈</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 group-hover:text-primary-700 transition line-clamp-2">{r.label} <span aria-hidden>↗</span></span>
                  <span className="block text-xs font-medium text-slate-500 mt-1">{r.note}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">YouTube Videos <span className="text-sm font-bold text-slate-400">• {filter==='english' ? englishVideos.length : filter==='saved' ? displayVideos.length : videos.length} {filter}</span></h2>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                {id:'all', label:`All (${videos.length})`},
                {id:'english', label:`English (${englishVideos.length})`},
                {id:'saved', label:`Saved (${saved.length})`},
              ].map(f=>(
                <button key={f.id} onClick={()=>setFilter(f.id)} className={`px-4 py-2 rounded-full text-xs font-bold border transition ${filter===f.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{f.label}</button>
              ))}
            </div>
          </div>

          {displayVideos.length === 0 ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 border border-dashed border-slate-200 p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">▶</div>
              <h3 className="text-sm font-bold text-slate-700">No videos in this filter</h3>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-md mx-auto">Curated English video resources for this topic are being added. Check back soon or try another filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {displayVideos.map(video => (
                <div key={video._id} className="group bg-slate-50 rounded-[24px] border border-slate-200/70 overflow-hidden hover:shadow-xl hover:shadow-slate-200/30 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="relative aspect-video bg-black overflow-hidden">
                    {failedEmbeds[video._id] ? (
                      <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-white p-6 text-center">
                        <img src={`https://i.ytimg.com/vi/${video.youtubeVideoId}/hqdefault.jpg`} alt={video.title} className="absolute inset-0 w-full h-full object-cover opacity-40" loading="lazy" />
                        <span className="relative text-sm font-bold">This video can't be embedded here</span>
                        <span className="relative inline-flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-bold">Watch on YouTube ↗</span>
                      </a>
                    ) : (
                      <iframe src={`https://www.youtube.com/embed/${video.youtubeVideoId}`} title={video.title} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onError={() => setFailedEmbeds((p) => ({ ...p, [video._id]: true }))} />
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="rounded-full bg-black/70 backdrop-blur text-white px-2.5 py-1 text-[11px] font-bold border border-white/20">English</span>
                      {video.quality && <span className="rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-slate-800">{video.quality}</span>}
                    </div>
                    <button onClick={()=>toggleSave(video._id)} className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur border flex items-center justify-center text-sm shadow-md transition ${saved.includes(video._id) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/90 border-white text-slate-700 hover:bg-white'}`} title="Save">
                      {saved.includes(video._id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <div className="p-5 bg-white">
                    <h3 className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-primary-700 transition">{video.title}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-2 line-clamp-1">{video.channelName} • {video.language} {video.quality ? `• ${video.quality}` : ''}</p>
                    <div className="mt-4 flex gap-2">
                      <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-800 transition">Watch on YouTube ↗</a>
                      <button onClick={()=>toggleSave(video._id)} className={`inline-flex items-center gap-1.5 border px-4 py-2 rounded-full text-xs font-bold transition ${saved.includes(video._id) ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{saved.includes(video._id) ? 'Saved ♥' : 'Save ♡'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopicDetail;
