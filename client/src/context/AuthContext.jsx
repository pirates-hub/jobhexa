import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { setAccessToken, clearAccessToken } from '../services/tokenStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session restore via httpOnly refresh cookie — access token stays in memory only
    const storedUser = localStorage.getItem('user');
    authService.refresh()
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        if (res.data.data.user) {
          setUser(res.data.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.data.user));
        } else if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      })
      .catch(() => {
        clearAccessToken();
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    const { user: userData, accessToken } = res.data.data;
    setAccessToken(accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    const { user: userData, accessToken } = res.data.data;
    setAccessToken(accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try { await authService.logout(); } catch (e) {}
    clearAccessToken();
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
