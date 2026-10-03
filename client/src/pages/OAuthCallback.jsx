import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { setAccessToken } from '../services/tokenStore';
import Loader from '../components/common/Loader';

function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loading } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loading) return;
    const err = params.get('error');
    if (err) { navigate(`/login?error=${encodeURIComponent(err)}`); return; }
    // Tokens arrive in httpOnly cookies (never in the URL) — fetch the session
    authService.getMe()
      .then((res) => {
        const user = res.data.data.user;
        localStorage.setItem('user', JSON.stringify({ id: user._id, name: user.name, email: user.email, role: user.role }));
        return authService.refresh().catch(() => null);
      })
      .then((res) => {
        if (res?.data?.data?.accessToken) setAccessToken(res.data.data.accessToken);
        navigate('/dashboard');
      })
      .catch(() => {
        const e = 'Social login did not establish a session — try again';
        setError(e);
        setTimeout(() => navigate('/login?error=oauth_callback'), 1500);
      });
  }, [params, navigate, loading]);

  if (error) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-bold text-red-600">{error}</p></div>;
  return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
}
export default OAuthCallback;
