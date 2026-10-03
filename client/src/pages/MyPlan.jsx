import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function MyPlan() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => { if (authLoading) return;
    if (!user) { navigate('/login'); return; } api.get('/chat/study-plan').then(res => setPlan(res.data.data.plan)).catch(()=>{}).finally(()=>setLoading(false)); }, [user, navigate]);

  const completeDay = async () => {
    setAdvancing(true);
    try {
      const res = await api.post('/chat/study-plan/complete-day');
      setPlan(res.data.data.plan);
    } catch {} finally { setAdvancing(false); }
  };

  const progress = useMemo(()=> plan ? Math.round((plan.currentDay / plan.plan.length) * 100) : 0, [plan]);
  const filteredPlan = useMemo(()=> {
    if (!plan) return [];
    if (filter==='upcoming') return plan.plan.filter(d=> d.day >= plan.currentDay);
    if (filter==='completed') return plan.plan.filter(d=> d.day < plan.currentDay);
    if (filter==='today') return plan.plan.filter(d=> d.day === plan.currentDay);
    return plan.plan;
  }, [plan, filter]);

  if (authLoading) return null;
  if (!user) return null;
  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;
  if (!plan || !plan.plan?.length) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <h1 className="text-3xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>My Study Plan</h1>
            <p className="text-white/70 font-medium mt-2">Your personalized 30-day roadmap - calendar timeline, progress & daily reminders.</p>
          </div>
          <div className="mt-8 bg-white rounded-[24px] border border-slate-200/70 p-10 shadow-sm"><EmptyState title="No study plan yet" description="Create a personalized 30-day plan via AI chat - pick exam, level and daily hours." actionText="Go to AI Chat" onAction={()=>window.location.href='/chat'} /></div>
        </div>
      </div>
    );
  }

  const circ = 2*Math.PI*36;
  const off = circ - (progress/100)*circ;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white/80"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 30-day plan - Daily 8 AM IST</div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>My Study Plan</h1>
              <p className="text-sm font-medium text-white/70 mt-2">{plan.exam} - {plan.plan.length} days - Started {new Date(plan.startDate).toLocaleDateString('en-IN')} - Day {plan.currentDay} of {plan.plan.length}</p>
              <div className="mt-4 h-2 max-w-md bg-white/15 rounded-full overflow-hidden"><div className="h-full bg-white transition-all" style={{width:`${progress}%`}} /></div>
              <p className="text-xs font-bold text-white/60 mt-2">{progress}% complete - {plan.plan.length - plan.currentDay} days remaining</p>
            </div>
            <div className="flex items-center gap-5 bg-white text-slate-900 rounded-[24px] p-5 shadow-lg shrink-0 max-w-full">
              <div className="relative w-24 h-24 shrink-0">
                <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90 block overflow-visible">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#5B5FEF" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} style={{transition:'stroke-dashoffset 0.8s ease'}} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center w-full text-center leading-tight">
                  <span className="text-[17px] font-extrabold tracking-tight whitespace-nowrap">{progress}%</span>
                  <span className="text-[8px] font-bold tracking-[0.14em] uppercase text-slate-500 whitespace-nowrap">complete</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">Today: Day {plan.currentDay}</p>
                <p className="text-sm font-bold text-primary-700 line-clamp-1">{plan.plan[plan.currentDay-1]?.topic}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">{plan.plan[plan.currentDay-1]?.hours}h - {plan.plan[plan.currentDay-1]?.subject}</p>
              </div>
            </div>
          </div>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold">Daily 8 AM notification</span>
            <button onClick={completeDay} disabled={advancing} className="inline-flex rounded-full bg-white text-slate-900 px-4 py-1.5 text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50">{advancing ? 'Advancing…' : `Mark Day ${plan.currentDay} complete → Day ${Math.min(plan.currentDay + 1, plan.plan.length)}`}</button>
            <button onClick={async()=>{ if(!confirm('Remove this plan? Daily notifications will stop.')) return; await api.delete('/chat/study-plan'); setPlan(null); }} className="inline-flex rounded-full bg-white/10 backdrop-blur border border-white/15 text-white px-4 py-1.5 text-xs font-bold hover:bg-white/15 transition">Remove plan</button>
            <Link to="/chat" className="inline-flex rounded-full bg-white text-slate-900 px-4 py-1.5 text-xs font-bold hover:bg-slate-50 transition">Regenerate in AI Chat</Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 flex gap-3">
          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">Cal</span>
          <p className="text-sm font-medium text-blue-900 leading-relaxed">Daily notification at 8 AM IST for <b>Day {plan.currentDay}: {plan.plan[plan.currentDay-1]?.topic}</b> - stay consistent, we will remind you.</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {[
            {id:'all', label:`All (${plan.plan.length})`},
            {id:'today', label:`Today (1)`},
            {id:'upcoming', label:`Upcoming (${plan.plan.length - plan.currentDay + (plan.currentDay <= plan.plan.length ? 1 : 0)})`},
            {id:'completed', label:`Completed (${Math.max(0, plan.currentDay - 1)})`},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} className={`px-4 py-2 rounded-full text-xs font-bold border transition ${filter===f.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{f.label}</button>
          ))}
          <span className="ml-auto hidden sm:inline-flex rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Calendar timeline - {filteredPlan.length} days</span>
        </div>

        <div className="mt-6 relative">
          <div className="hidden lg:block absolute left-[28px] top-4 bottom-4 w-px bg-gradient-to-b from-slate-200 via-primary-200 to-slate-200" />
          {filteredPlan.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center">
              <p className="text-sm font-medium text-slate-600">No {filter} days to show</p>
              <p className="text-xs text-slate-400 mt-1">Try another filter - Current: Day {plan.currentDay}</p>
            </div>
          ) : (
          <div className="space-y-4">
            {filteredPlan.map(d => {
              const isCurrent = d.day === plan.currentDay;
              const isPast = d.day < plan.currentDay;
              return (
                <div key={d.day} className={`relative lg:ml-8 lg:pl-10 group rounded-[28px] border p-7 lg:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${isCurrent ? 'bg-gradient-to-br from-white via-primary-50/40 to-indigo-50/60 border-primary-200 shadow-lg shadow-primary-500/10' : isPast ? 'bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-200/70' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'}`}>
                  <div className={`hidden lg:flex absolute -left-6 top-8 w-12 h-12 rounded-full border-2 bg-white items-center justify-center text-sm font-extrabold shadow-sm ring-4 ring-[#F8FAFC] ${isCurrent ? 'border-primary-600 text-primary-700' : isPast ? 'border-emerald-400 text-emerald-700' : 'border-slate-300 text-slate-500'}`}>
                    {isPast ? '?' : d.day}
                  </div>
                  <div className="flex flex-wrap justify-between gap-3 items-start">
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold border shadow-sm ${isCurrent ? 'bg-slate-900 text-white border-slate-900' : isPast ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-700 border-slate-200'}`}>{isCurrent ? 'Day ' + d.day + ' - Current' : isPast ? 'Day ' + d.day + ' - Done' : 'Day ' + d.day}</span>
                      <span className="lg:hidden inline-flex w-8 h-8 rounded-full bg-slate-900 text-white items-center justify-center text-xs font-bold">{isPast ? '?' : d.day}</span>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm">{d.hours}h - {d.subject}</span>
                  </div>
                  <p className="font-bold text-slate-900 mt-4 text-[15px] leading-snug tracking-tight">{d.topic}</p>
                  <ul className="mt-4 grid sm:grid-cols-2 gap-2.5">
                    {d.tasks?.slice(0,4).map((t,i)=>(
                      <li key={i} className={`flex gap-3 text-xs font-medium rounded-xl px-4 py-3 border transition ${isCurrent ? 'bg-white border-primary-100 text-slate-700 shadow-sm' : isPast ? 'bg-white/70 border-emerald-100 text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isPast ? 'bg-emerald-500' : isCurrent ? 'bg-primary-500' : 'bg-slate-300'}`} />{t}
                      </li>
                    ))}
                  </ul>
                  {d.tasks?.length > 4 && <p className="text-xs font-bold text-slate-500 mt-3 flex items-center gap-1">+{d.tasks.length - 4} more tasks <span className="text-slate-300">-</span> Expand on click</p>}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyPlan;
