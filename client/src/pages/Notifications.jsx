import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { formatDate } from '../utils/helpers';

function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = async () => {
    try { const res = await api.get('/notifications'); setNotifs(res.data.data.notifications); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);
  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs(notifs.map(n => n._id === id ? { ...n, isRead: true } : n));
  };
  const markAll = async () => {
    await api.patch('/notifications/read-all');
    setNotifs(notifs.map(n => ({ ...n, isRead: true })));
  };
  const remove = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifs(notifs.filter(n => n._id !== id));
  };
  if (loading) return <Loader />;
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center gap-3">
          {notifs.some(n => !n.isRead) && <button onClick={markAll} className="text-sm text-primary-600 hover:underline">Mark all as read</button>}
          <Link to="/chat" className="text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-blue-600 px-3.5 py-1.5 rounded-full hover:shadow-md transition">✦ Ask AI</Link>
        </div>
      </div>
      {notifs.length === 0 ? <EmptyState title="No notifications" description="You'll see deadline reminders and study plan updates here" /> : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n._id} className={`bg-white border rounded-xl p-4 flex justify-between items-start ${n.isRead ? 'border-gray-200 opacity-75' : 'border-primary-200 bg-primary-50/20'}`}>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                <p className="text-xs text-gray-400 mt-2">{formatDate(n.createdAt)} {n.jobId && <Link to={`/jobs/${n.jobId.slug}`} className="text-primary-600 hover:underline ml-2">View Job →</Link>}</p>
              </div>
              <div className="flex gap-2 ml-3">
                {!n.isRead && <button onClick={()=>markRead(n._id)} className="text-xs bg-primary-600 text-white px-3 py-1 rounded-full">Read</button>}
                <button onClick={()=>remove(n._id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default Notifications;
