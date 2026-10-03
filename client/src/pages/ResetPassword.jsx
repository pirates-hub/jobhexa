import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setMsg('Password must be at least 6 characters'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setMsg(res.data.data.message || 'Reset done');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) { setMsg(err.response?.data?.message || 'Failed — link may be expired'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white rounded-3xl border shadow-sm p-8 w-full max-w-md">
        <Link to="/login" className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900">← Back to Login</Link>
        <h1 className="text-2xl font-extrabold mt-3 text-slate-900">Set new password</h1>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 6)" className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <button type="submit" disabled={saving} className="mt-4 w-full rounded-full bg-slate-900 text-white py-3 font-bold text-sm disabled:opacity-50 hover:bg-slate-800">{saving ? 'Saving…' : 'Reset password'}</button>
        {msg && <p className="text-sm font-medium text-slate-700 bg-slate-50 border rounded-xl p-3 mt-4">{msg}</p>}
      </form>
    </div>
  );
}
export default ResetPassword;
