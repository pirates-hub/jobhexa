import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import mockTestService from '../services/mockTestService';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function MockTestRunner() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [bestScore, setBestScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [phase, setPhase] = useState('intro'); // intro | active | result
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchTest = async () => {
      try {
        const res = await mockTestService.getMockTest(slug);
        setTest(res.data.data.test);
        setAttempts(res.data.data.attempts || []);
        setBestScore(res.data.data.bestScore);
      } catch (e) {
        setError(e.response?.data?.message || 'Could not load this mock test');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [slug, user, navigate, authLoading]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!test || submitting || phase !== 'active') return;
    if (!auto) {
      const unanswered = test.questions.length - Object.keys(answers).length;
      if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    }
    setSubmitting(true);
    try {
      const payload = {
        answers: test.questions.map((_, i) => ({ questionIndex: i, selectedIndex: answers[i] ?? null })),
        timeTakenSeconds: test.durationMinutes * 60 - remaining,
      };
      const res = await mockTestService.submitMockTest(test.slug, payload);
      setResult(res.data.data);
      setPhase('result');
    } catch (e) {
      alert(e.response?.data?.message || 'Could not submit the test');
    } finally {
      setSubmitting(false);
    }
  }, [test, submitting, phase, answers, remaining]);

  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'active' && remaining === 0) handleSubmit(true);
  }, [remaining, phase, handleSubmit]);

  const start = () => {
    setAnswers({});
    setCurrent(0);
    setRemaining((test?.durationMinutes || 30) * 60);
    setResult(null);
    setPhase('active');
  };

  if (authLoading) return null;
  if (!user) return null;

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  if (error || !test) {
    return (
      <div className="min-h-[60vh] bg-[#F8FAFC] p-8"><div className="max-w-[1480px] mx-auto">
        <Link to="/mock-tests" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group"><span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> Back to Mock Tests</Link>
        <EmptyState title="Mock test not found" description={error || 'The requested test could not be found'} />
      </div></div>
    );
  }

  const total = test.questions.length;
  const answeredCount = Object.keys(answers).length;

  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Link to="/mock-tests" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group"><span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> All Mock Tests</Link>

          <div className="bg-white rounded-[28px] border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
              <div className="relative">
                <span className="inline-flex rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest">{test.subjectName || 'General'}</span>
                <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{ fontFamily: 'Sora' }}>{test.title}</h1>
                {test.description && <p className="text-sm font-medium text-white/70 leading-relaxed mt-3 max-w-2xl">{test.description}</p>}
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="grid grid-cols-3 gap-3">
                {[{ l: 'Questions', v: total }, { l: 'Duration', v: `${test.durationMinutes} min` }, { l: 'Difficulty', v: (test.difficulty || 'medium') }].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
                    <p className="text-lg font-extrabold text-slate-900 capitalize">{s.v}</p>
                    <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">i</span>
                <ul className="text-xs font-medium text-slate-600 leading-relaxed space-y-1">
                  <li>The timer starts as soon as you press Start and auto-submits at 0:00.</li>
                  <li>You can move between questions freely; answers are saved as you go.</li>
                  <li>Correct answers and explanations are shown after you submit.</li>
                </ul>
              </div>

              {bestScore !== null && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">★</span>
                  <p className="text-sm font-bold text-emerald-800">Your best score so far: {bestScore}/{total}</p>
                </div>
              )}

              <button onClick={start} className="mt-6 w-full rounded-2xl bg-slate-900 text-white px-6 py-4 text-base font-extrabold hover:bg-primary-600 transition shadow-lg shadow-slate-900/10">
                Start Test →
              </button>

              {attempts.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-900">Recent attempts</h3>
                  <div className="mt-3 space-y-2">
                    {attempts.slice(0, 5).map((a) => (
                      <div key={a._id} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
                        <span className="text-sm font-bold text-slate-800">{a.score}/{a.total} correct</span>
                        <span className="text-xs font-medium text-slate-500">{new Date(a.submittedAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- RESULT ----------
  if (phase === 'result' && result) {
    const pct = result.percentage;
    const passed = pct >= 60;
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Link to="/mock-tests" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition mb-6 group"><span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300">←</span> All Mock Tests</Link>

          <div className="bg-white rounded-[28px] border border-slate-200/70 shadow-sm p-8 text-center">
            <div className={`inline-flex w-24 h-24 rounded-full items-center justify-center text-2xl font-extrabold ${passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{pct}%</div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{passed ? 'Well done!' : 'Keep practising'}</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">You scored <span className="font-bold text-slate-900">{result.score}</span> out of {result.total}.</p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4"><p className="text-lg font-extrabold text-emerald-700">{result.score}</p><p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mt-0.5">Correct</p></div>
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4"><p className="text-lg font-extrabold text-red-700">{result.total - result.score}</p><p className="text-xs font-bold uppercase tracking-widest text-red-600 mt-0.5">Wrong</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-lg font-extrabold text-slate-700">{fmtTime(test.durationMinutes * 60 - remaining)}</p><p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-0.5">Time</p></div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={start} className="rounded-2xl bg-slate-900 text-white px-6 py-3 text-sm font-bold hover:bg-primary-600 transition">Retake test</button>
              <Link to="/mock-tests" className="rounded-2xl bg-white border border-slate-200 text-slate-700 px-6 py-3 text-sm font-bold hover:bg-slate-50 transition">Back to Mock Tests</Link>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Answer review</h2>
            <div className="mt-4 space-y-4">
              {result.review.map((r, i) => (
                <div key={i} className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-6">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${r.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.isCorrect ? '✓' : '✗'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 leading-snug">Q{i + 1}. {r.text}</p>
                      <div className="mt-3 space-y-2">
                        {r.options.map((opt, oi) => {
                          const isCorrect = oi === r.correctIndex;
                          const isChosen = oi === r.selectedIndex;
                          let cls = 'border-slate-200 bg-white text-slate-600';
                          if (isCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                          else if (isChosen) cls = 'border-red-300 bg-red-50 text-red-800';
                          return (
                            <div key={oi} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium ${cls}`}>
                              <span className="w-6 h-6 rounded-lg bg-white/70 border border-current/30 flex items-center justify-center text-xs font-bold shrink-0">{LETTERS[oi]}</span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <span className="text-xs font-bold">Correct answer</span>}
                              {isChosen && !isCorrect && <span className="text-xs font-bold">Your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                      {r.explanation && (
                        <p className="mt-3 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed"><span className="font-bold text-slate-800">Explanation: </span>{r.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- ACTIVE ----------
  const q = test.questions[current];
  const lowTime = remaining <= 60;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 line-clamp-1">{test.title}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-0.5">{answeredCount}/{total} answered</p>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 font-extrabold tabular-nums border ${lowTime ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-white text-slate-900 border-slate-200 shadow-sm'}`}>
            <span className="text-xs font-bold uppercase tracking-widest">⏱</span> {fmtTime(remaining)}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
          <div className="bg-white rounded-[28px] border border-slate-200/70 shadow-sm p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex rounded-full bg-slate-900 text-white px-3.5 py-1.5 text-xs font-bold">Question {current + 1} of {total}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{q.options.length} options</span>
            </div>

            <p className="mt-5 text-lg lg:text-xl font-bold text-slate-900 leading-snug">{q.text}</p>

            <div className="mt-6 space-y-3">
              {q.options.map((opt, oi) => {
                const selected = answers[current] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((prev) => ({ ...prev, [current]: oi }))}
                    className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition ${selected ? 'border-primary-500 bg-primary-50 text-primary-900 ring-2 ring-primary-100' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${selected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{LETTERS[oi]}</span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
              {current < total - 1 ? (
                <button onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))} className="rounded-2xl bg-slate-900 text-white px-6 py-3 text-sm font-bold hover:bg-slate-800 transition">Next →</button>
              ) : (
                <button onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-2xl bg-emerald-600 text-white px-6 py-3 text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit Test ✓'}</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-6 lg:sticky lg:top-24">
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-900">Question palette</h3>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {test.questions.map((_, i) => {
                const isAnswered = answers[i] !== undefined;
                const isCurrent = i === current;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-9 rounded-lg text-xs font-bold transition border ${isCurrent ? 'bg-slate-900 text-white border-slate-900' : isAnswered ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                  >{i + 1}</button>
                );
              })}
            </div>
            <div className="mt-5 space-y-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200" /> Answered ({answeredCount})</div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-slate-50 border border-slate-200" /> Not answered ({total - answeredCount})</div>
            </div>
            <button onClick={() => handleSubmit(false)} disabled={submitting} className="mt-6 w-full rounded-2xl bg-emerald-600 text-white px-5 py-3 text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit Test'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MockTestRunner;
