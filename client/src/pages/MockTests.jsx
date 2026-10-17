import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import mockTestService from '../services/mockTestService';
import EmptyState from '../components/common/EmptyState';

const difficultyColor = (d) => {
  switch (d?.toLowerCase()) {
    case 'easy': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'hard': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

function MockTests() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchTests = async () => {
      try {
        const res = await mockTestService.getMockTests();
        setTests(res.data.data.tests || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Could not load mock tests');
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [user, navigate, authLoading]);

  if (authLoading) return null;
  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-10 w-64 bg-slate-200 rounded-2xl animate-pulse mb-4" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-white rounded-[24px] border border-slate-200/70 animate-pulse" />)}
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
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Timed practice</div>
              <h1 className="mt-4 text-4xl lg:text-[42px] font-extrabold tracking-[-0.04em] leading-none text-white" style={{ fontFamily: 'Sora' }}>Mock <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Tests</span></h1>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/65 max-w-2xl">Full-length timed tests with instant scoring and detailed explanations. Track your best score and improve weak areas.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{tests.length}</div>
                <div><p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Tests</p><p className="text-sm font-extrabold text-slate-900 leading-none mt-1">Ready now</p></div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-700">{error}</div>
        )}

        {tests.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No mock tests yet" description="Fresh mock tests are being added. Check back soon." /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((t) => (
              <div key={t._id} className="group relative bg-white rounded-[24px] border border-slate-200/70 p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 overflow-hidden flex flex-col">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-primary-50 to-indigo-50 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition" />
                <div className="relative flex-1">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-extrabold text-sm shadow-md">GK</div>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${difficultyColor(t.difficulty)}`}>{t.difficulty || 'medium'}</span>
                  </div>
                  <h3 className="text-[17px] font-extrabold tracking-tight text-slate-900 group-hover:text-primary-700 transition line-clamp-2 leading-snug">{t.title}</h3>
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-1.5">{t.subjectName || 'General'}</p>
                  <p className="text-sm font-medium text-slate-500 line-clamp-2 mt-3 leading-relaxed">{t.description || 'Timed mock test with instant scoring and explanations.'}</p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{t.questionCount} questions</span>
                    <span className="inline-flex rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{t.durationMinutes} min</span>
                    {t.attemptCount > 0 && <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">Best {t.bestScore}/{t.questionCount}</span>}
                  </div>
                </div>

                <div className="relative mt-6 flex items-center justify-between pt-5 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500">{t.attemptCount > 0 ? `${t.attemptCount} attempt${t.attemptCount > 1 ? 's' : ''}` : 'Not attempted'}</span>
                  <Link to={`/mock-tests/${t.slug}`} className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-bold hover:bg-primary-600 transition">
                    {t.attemptCount > 0 ? 'Retake' : 'Start'} <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-[24px] bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">📝</div>
            <div>
              <p className="text-sm font-bold text-slate-900">Free mock tests (external) — practice now</p>
              <p className="text-xs font-medium text-slate-500">Our own full-length mock tests for all exams are coming soon.</p>
            </div>
          </div>
          <a href="https://www.mocktestzone.in/exams" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition">Browse free mock tests ↗</a>
        </div>
      </div>
    </div>
  );
}

export default MockTests;
