import { useState, useMemo } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, register, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && user) return <Navigate to="/dashboard" />;

  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  }, [password]);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const strengthColors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) { setError('Enter your full name'); return; }
    if (!email.includes('@')) { setError('Enter a valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!dateOfBirth) { setError('Select your date of birth'); return; }
    setLoading(true);
    try {
      await register({ name, email, password, dateOfBirth });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F8FAFC] flex">
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
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/20 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Free forever • 2 min setup</div>
            <h1 className="mt-6 text-[42px] font-extrabold tracking-[-0.04em] leading-[1.05] text-white" style={{fontFamily:'Sora'}}>Create your account, <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">start getting matched.</span></h1>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-white/65 max-w-[460px]">One profile to match against every live notification — qualification, age, category and state, automatically.</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[{k:'18k+',l:'Notifications'},{k:'96k+',l:'Checks run'},{k:'28',l:'States'}].map(s=>(
                <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-4">
                  <p className="text-xl font-extrabold text-white leading-none">{s.k}</p>
                  <p className="text-xs font-bold tracking-widest uppercase text-white/60 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[24px] bg-white p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">✓</div>
            <div><p className="text-sm font-bold text-slate-900">No credit card required</p><p className="text-xs font-medium text-slate-500">Get started in under 2 minutes</p></div>
            <span className="ml-auto text-emerald-600 font-bold text-sm">Free →</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-8">
        <div className="w-full max-w-[480px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm">JH</div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">JobHexa</span>
          </div>
          <div className="aura aura-gold rounded-[20px]">
            <div className="card bg-white shadow-xl border border-amber-100 rounded-[18px] overflow-hidden">
              <div className="card-body p-8 lg:p-9 bg-white rounded-[18px]">
            <div className="mb-7">
              <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-slate-900" style={{fontFamily:'Sora'}}>Create account</h2>
              <p className="text-sm font-semibold text-slate-600 mt-1.5">Join 90k+ aspirants — free, secure, 2 minutes</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-semibold mb-5 flex items-start gap-2"><span>⚠</span><span>{error}</span></div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold tracking-widest uppercase text-slate-600 mb-2">Full name</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} required placeholder="Ananya Sharma" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-extrabold tracking-widest uppercase text-slate-600 mb-2">Email address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold tracking-widest uppercase text-slate-600">Password</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${strength>=3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : strength>=2 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>{strengthLabels[strength] || '—'}</span>
                </div>
                <div className="relative">
                  <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="At least 6 characters" className="w-full px-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" />
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">{showPass?'🙈':'👁'}</button>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {[0,1,2,3].map(i=> <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i < strength ? strengthColors[strength] : 'bg-slate-200'}`} />)}
                </div>
                <p className="text-[11px] font-medium text-slate-400 mt-2">Use 8+ characters with a mix of letters, numbers & symbols</p>
              </div>
              <div>
                <label className="block text-xs font-extrabold tracking-widest uppercase text-slate-600 mb-2">Date of birth</label>
                <input type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} required className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" />
                <p className="text-[11px] font-medium text-slate-400 mt-2">Used to calculate eligibility & age relaxation</p>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</> : <>Create account →</>}
              </button>

              <p className="text-center text-sm font-medium text-slate-500">Already have an account? <Link to="/login" className="font-bold text-slate-900 hover:text-primary-700 underline decoration-slate-300 underline-offset-4">Login</Link></p>
            </form>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] font-medium text-slate-400 mt-6">By creating an account you agree to our <span className="font-bold text-slate-600">Terms</span> and <span className="font-bold text-slate-600">Privacy</span></p>
        </div>
      </div>
    </div>
  );
}

export default Register;
