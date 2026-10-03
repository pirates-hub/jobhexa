import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import CentralJobs from './pages/CentralJobs';
import StateJobs from './pages/StateJobs';
import WeeklyUpdates from './pages/WeeklyUpdates';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import SavedJobs from './pages/SavedJobs';
import Applications from './pages/Applications';
import Preparation from './pages/Preparation';
import ExamDetail from './pages/ExamDetail';
import SubjectDetail from './pages/SubjectDetail';
import TopicDetail from './pages/TopicDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOverview from './pages/admin/AdminOverview';
import ManageJobs from './pages/admin/ManageJobs';
import VerifyJobs from './pages/admin/VerifyJobs';
import ManageUsers from './pages/admin/ManageUsers';
import AdminMails from './pages/admin/AdminMails';
import Chat from './pages/Chat';
import MyPlan from './pages/MyPlan';
import PdfUpload from './pages/admin/PdfUpload';
import Notifications from './pages/Notifications';
import OAuthCallback from './pages/OAuthCallback';
import NotFound from './pages/NotFound';

function FloatingAI() {
  const loc = useLocation();
  if (loc.pathname === '/chat') return null;
  return (
    <>
      <Link
        to="/chat"
        title="AI Assistant"
        aria-label="Open AI Assistant"
        className="ai-fab fixed z-40 w-14 h-14 rounded-full flex items-center justify-center text-white"
        style={{ bottom: '24px', right: '24px' }}
      >
        <span className="ai-fab-icon">✦</span>
        <span className="ai-fab-ring"></span>
      </Link>
      <style>{`
  .ai-fab {
    position: fixed;
    isolation: isolate;
    overflow: visible;
    background: linear-gradient(135deg, #7c3aed, #2563eb, #06b6d4, #7c3aed);
    background-size: 300% 300%;
    box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5);
    animation: gradientMove 5s ease infinite, glowPulse 2.5s ease-in-out infinite;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .ai-fab:hover {
    transform: scale(1.12) rotate(4deg);
    box-shadow: 0 12px 35px rgba(37, 99, 235, 0.6), 0 0 25px rgba(99, 102, 241, 0.7);
  }
  .ai-fab-icon {
    position: relative;
    z-index: 2;
    font-size: 1.5rem;
    animation: sparkle 2s ease-in-out infinite;
  }
  .ai-fab-ring {
    position: absolute;
    inset: -6px;
    z-index: -1;
    border: 2px solid rgba(96, 165, 250, 0.55);
    border-radius: 9999px;
    animation: ringPulse 2s ease-out infinite;
  }
  .ai-fab::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.45), transparent 80%);
    transform: translateX(-130%);
    animation: shine 3s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes gradientMove {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5); }
    50% { box-shadow: 0 8px 30px rgba(37, 99, 235, 0.6), 0 0 0 10px rgba(99, 102, 241, 0); }
  }
  @keyframes ringPulse {
    0% { opacity: 0.8; transform: scale(0.9); }
    100% { opacity: 0; transform: scale(1.45); }
  }
  @keyframes sparkle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.25) rotate(180deg); }
  }
  @keyframes shine {
    0%, 65% { transform: translateX(-130%); }
    85%, 100% { transform: translateX(130%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ai-fab, .ai-fab-icon, .ai-fab-ring, .ai-fab::after { animation: none; }
    .ai-fab:hover { transform: none; }
  }
      `}</style>
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      <Navbar />
      <FloatingAI />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/central-jobs" element={<CentralJobs />} />
          <Route path="/weekly-updates" element={<WeeklyUpdates />} />
          <Route path="/state-jobs/:stateName" element={<StateJobs />} />
          <Route path="/jobs/:slug" element={<JobDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/saved-jobs" element={<SavedJobs />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/preparation/:slug" element={<ExamDetail />} />
          <Route path="/preparation/subject/:slug" element={<SubjectDetail />} />
          <Route path="/preparation/topic/:slug" element={<TopicDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/overview" element={<AdminOverview />} />
          <Route path="/admin/jobs" element={<ManageJobs />} />
          <Route path="/admin/verify" element={<VerifyJobs />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/mails" element={<AdminMails />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/my-plan" element={<MyPlan />} />
          <Route path="/admin/pdf" element={<PdfUpload />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
