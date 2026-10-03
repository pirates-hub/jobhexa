import { useState, useMemo } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed — check your credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F8FAFC] flex">
      {/* left premium visual */}
      <div className="hidden lg:flex w-[52%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-12 xl:p-16 flex-col justify-between">
        <div className="absolute -right-32 -top-32 w-[520px] h-[520px] bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-[420px] h-[420px] bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(91,95,239,0.18),transparent_50%)]" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-slate-900 font-extrabold text-sm shadow-md">JH</div>
            <span className="text-xl font-extrabold tracking-tight text-white">JobHexa</span>
            <span className="ml-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase text-white">Premium</span>
          </Link>
          <div className="mt-16 max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80">Trusted by 90k+ aspirants</div>
            <h1 className="mt-6 text-[42px] font-extrabold tracking-[-0.04em] leading-[1.05] text-white" style={{fontFamily:'Sora'}}>Your government job journey, <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">all in one place.</span></h1>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-white/65 max-w-[460px]">Track deadlines, check eligibility instantly, and never miss a notification again. Secure, fast, built for Bharat.</p>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[24px] bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex -space-x-2">
                {[1,2,3].map(i=> <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-700">{String.fromCharCode(64+i)}</div>)}
              </div>
              <div className="text-xs font-bold text-white">★★★★★ <span className="font-medium text-white/70 ml-1">4.9/5 from 2,400 reviews</span></div>
            </div>
            <p className="text-sm font-medium leading-relaxed text-white/85">“JobHexa reminded me 3 days before the SSC CGL deadline. I would have missed it otherwise.”</p>
            <p className="text-xs font-bold text-white mt-3">— Ananya R., Uttar Pradesh</p>
          </div>
          <p className="text-[11px] font-medium text-white/40 mt-4">© 2026 JobHexa • Privacy • Terms • Secure & encrypted</p>
        </div>
      </div>

      {/* right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-12">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm">JH</div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">JobHexa</span>
          </div>
          <div className="aura aura-gold rounded-[20px]">
            <div className="card bg-white shadow-xl border border-amber-100 rounded-[18px] overflow-hidden">
              <div className="card-body p-8 lg:p-9 bg-white rounded-[18px]">
            <div className="mb-7">
              <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-slate-900" style={{fontFamily:'Sora'}}>Welcome back</h2>
              <p className="text-sm font-semibold text-slate-600 mt-1.5">Login to your career command center</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-semibold mb-5 flex items-start gap-2"><span className="mt-0.5">⚠</span><span>{error}</span></div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold tracking-widest uppercase text-slate-600 mb-2">Email address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12l-4-4-4 4m8 0l-4 4-4-4" transform="rotate(90 12 12)" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </span>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold tracking-widest uppercase text-slate-600">Password</label>
                  <Link to="/forgot-password" className="text-xs font-bold text-primary-700 hover:text-primary-800">Forgot?</Link>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                  </span>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" />
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 text-xs font-bold">
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                <p className="text-[11px] font-medium text-slate-400 mt-2">Must be at least 6 characters</p>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Logging in...</> : <>Continue →</>}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs font-bold tracking-widest uppercase text-slate-400">or</span></div>
              </div>

              <a href={`${import.meta.env.VITE_API_URL || '/api'}/auth/google`} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2">Continue with google →</a>
              <Link to="/register" className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl py-3 text-sm font-bold text-slate-700 hover:bg-white transition">Create account</Link>

              <p className="text-center text-sm font-medium text-slate-500 pt-1">Don’t have an account? <Link to="/register" className="font-bold text-slate-900 hover:text-primary-700 underline decoration-slate-300 underline-offset-4">Register</Link></p>
            </form>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] font-medium text-slate-400 mt-6">By continuing you agree to our <span className="font-bold text-slate-600">Terms</span> and <span className="font-bold text-slate-600">Privacy</span></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
