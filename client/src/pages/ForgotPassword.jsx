import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg(res.data.data.message || 'Reset link sent — check inbox + spam.');
    } catch (err) { setMsg(err.response?.data?.message || 'Failed — try again'); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white rounded-3xl border shadow-sm p-8 w-full max-w-md">
        <Link to="/login" className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900">← Back to Login</Link>
        <h1 className="text-2xl font-extrabold mt-3 text-slate-900">Forgot password</h1>
        <p className="text-sm text-slate-500 mt-1">Enter your account email — we send a 10-minute reset link.</p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <button type="submit" disabled={sending} className="mt-4 w-full rounded-full bg-slate-900 text-white py-3 font-bold text-sm disabled:opacity-50 hover:bg-slate-800">{sending ? 'Sending…' : 'Send reset link'}</button>
        {msg && <p className="text-sm font-medium text-slate-700 bg-slate-50 border rounded-xl p-3 mt-4">{msg}</p>}
      </form>
    </div>
  );
}
export default ForgotPassword;
