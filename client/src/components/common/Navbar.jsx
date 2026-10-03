import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user) {
      api.get('/notifications/unread-count').then(r => setUnread(r.data.data.count)).catch(()=>{});
    } else {
      setUnread(0);
    }
  }, [user]);

  const handleLogout = async () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50">
      {/* premium top accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary-700 via-blue-500 to-indigo-600" />
      <nav className="bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 border-b border-slate-200/70 shadow-sm shadow-slate-200/30">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px]">
            <Link to="/" className="flex items-center gap-3 group" onClick={closeMobile}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-700 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-primary-700/20 group-hover:shadow-lg group-hover:shadow-primary-700/25 transition-all">
                JH
              </div>
              <span className="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900">
                Job<span className="bg-gradient-to-r from-primary-700 to-indigo-600 bg-clip-text text-transparent">Hexa</span>
              </span>
              <span className="hidden lg:inline-flex ml-1.5 items-center rounded-full bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1">
                Premium
              </span>
            </Link>

            <div className="hidden min-[921px]:flex items-center gap-1.5 lg:gap-1">
              <Link to="/jobs" className="px-3.5 py-2 rounded-full text-[14px] font-medium tracking-tight text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">Jobs</Link>
              <Link to="/preparation" className="px-3.5 py-2 rounded-full text-[14px] font-medium tracking-tight text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">Preparation</Link>
              <Link to="/my-plan" className="px-3.5 py-2 rounded-full text-[14px] font-medium tracking-tight text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">My Plan</Link>
              <Link to="/chat" className="px-3.5 py-2 rounded-full text-[14px] font-medium tracking-tight text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">AI Chat</Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="px-3.5 py-2 rounded-full text-[14px] font-medium tracking-tight text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">Dashboard</Link>
                  <Link to="/saved-jobs" className="px-3.5 py-2 rounded-full text-[14px] font-medium tracking-tight text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">Saved</Link>
                  <Link to="/notifications" className="relative ml-1 p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
                    <span className="text-[15px]">🔔</span>
                    {unread > 0 && <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-md shadow-red-500/20 ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
                  </Link>
                  <div className="relative ml-2 pl-3 border-l border-slate-200">
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-sm ring-2 ring-white">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="hidden lg:inline text-sm font-semibold tracking-tight text-slate-700 max-w-[120px] truncate">{user.name}</span>
                      <svg className={`hidden lg:block w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/70 py-2 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" onClick={() => setUserMenuOpen(false)}><span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs">👤</span> Profile</Link>
                        <Link to="/applications" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" onClick={() => setUserMenuOpen(false)}><span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs">📄</span> Applications</Link>
                        {user.role === 'admin' && (
                          <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" onClick={() => setUserMenuOpen(false)}><span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">🛡️</span> Admin Panel</Link>
                        )}
                        <hr className="my-2 border-slate-100" />
                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition"><span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-xs">↗</span> Logout</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Link to="/login" className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition">Login</Link>
                  <Link to="/register" className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/25 hover:from-slate-800 hover:to-slate-700 transition-all">Register</Link>
                </div>
              )}
            </div>

            <button className="min-[921px]:hidden w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg shadow-md" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" aria-expanded={mobileOpen} aria-controls="mobile-nav">
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>

          {mobileOpen && (
            <div id="mobile-nav" className="min-[921px]:hidden border-t border-slate-200/70 py-4 flex flex-col gap-1 pb-6">
              <Link to="/jobs" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Jobs</Link>
              <Link to="/preparation" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Preparation</Link>
              <Link to="/my-plan" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>My Plan</Link>
              <Link to="/chat" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>AI Chat</Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Dashboard</Link>
                  <Link to="/saved-jobs" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Saved Jobs</Link>
                  <Link to="/notifications" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 transition" onClick={closeMobile}>Notifications {unread > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{unread}</span>}</Link>
                  <Link to="/profile" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Profile</Link>
                  <Link to="/applications" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Applications</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Admin Panel</Link>
                  )}
                  <button onClick={handleLogout} className="text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 font-semibold transition">Logout — {user.name}</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition" onClick={closeMobile}>Login</Link>
                  <Link to="/register" className="px-4 py-3 rounded-xl bg-slate-900 text-white font-bold text-center shadow-md transition" onClick={closeMobile}>Register</Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
