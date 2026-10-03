import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import profileService from '../services/profileService';
import { INDIAN_STATES, CATEGORIES, EXAM_TYPES, QUALIFICATIONS } from '../utils/constants';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('personal');

  const [form, setForm] = useState({
    name: '', email: '', phone: '', dateOfBirth: '', gender: '',
    qualification: { highest: '', field: '', yearOfPassing: '', percentage: '', university: '' },
    state: '', district: '', category: '', preferredExamTypes: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await profileService.getProfile();
        const u = res.data.data.user;
        setForm({
          name: u.name || '', email: u.email || '', phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
          gender: u.gender || '',
          qualification: u.qualification || { highest: '', field: '', yearOfPassing: '', percentage: '', university: '' },
          state: u.state || '', district: u.district || '', category: u.category || '',
          preferredExamTypes: u.preferredExamTypes || [],
        });
      } catch { setMessage({ type: 'error', text: 'Failed to load profile' }); } finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const completion = useMemo(() => {
    const checks = [
      form.name, form.email, form.phone, form.dateOfBirth, form.gender,
      form.qualification.highest, form.qualification.field, form.state, form.category,
      form.preferredExamTypes.length
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled/checks.length)*100);
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('qualification.')) {
      const field = name.split('.')[1];
      setForm({ ...form, qualification: { ...form.qualification, [field]: value } });
    } else setForm({ ...form, [name]: value });
  };
  const handleExamToggle = (slug) => {
    const cur = form.preferredExamTypes;
    setForm({ ...form, preferredExamTypes: cur.includes(slug) ? cur.filter(e=>e!==slug) : [...cur, slug] });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage({type:'',text:''});
    try { await profileService.updateProfile(form); setMessage({type:'success',text:'Profile updated successfully — eligibility matching improved!'}); setTimeout(()=>setMessage({type:'',text:''}),4000);} catch (err) { setMessage({type:'error',text: err.response?.data?.message || 'Update failed'});} finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[60vh] bg-[#F8FAFC] flex items-center justify-center"><div className="bg-white rounded-3xl border border-slate-200/70 p-12 flex flex-col items-center gap-4 shadow-sm"><div className="w-10 h-10 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" /><p className="text-sm font-bold text-slate-600">Loading profile…</p></div></div>;

  const tabs = [
    {id:'personal', label:'Personal', icon:'👤'},
    {id:'qualification', label:'Qualification', icon:'🎓'},
    {id:'location', label:'Location', icon:'📍'},
    {id:'preferences', label:'Preferences', icon:'🎯'},
  ];

  const circ = 2*Math.PI*36;
  const dashOffset = circ - (completion/100)*circ;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* header */}
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/20 mb-8">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex gap-6 items-center">
              <div className="w-16 h-16 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-xl font-extrabold shadow-md">{form.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-[-0.03em]" style={{fontFamily:'Sora'}}>{form.name || 'Your Profile'}</h1>
                <p className="text-sm font-medium text-white/70 mt-1">{form.email} • {form.state || 'Add state'} • {form.category || 'Select category'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-xs font-bold">{form.qualification.highest || 'Qualification — add'}</span>
                  <span className="inline-flex rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-xs font-bold">{form.preferredExamTypes.length} exam types</span>
                  <Link to="/chat" className="inline-flex rounded-full bg-white text-slate-900 px-3 py-1 text-xs font-bold hover:bg-slate-100 transition">✦ Ask AI about my eligibility</Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 bg-white/10 backdrop-blur-xl border border-white/15 rounded-[24px] p-5 shrink-0">
              <div className="relative w-[88px] h-[88px] shrink-0">
                <svg width="88" height="88" viewBox="0 0 100 100" className="-rotate-90 block">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset} style={{transition:'stroke-dashoffset 0.8s ease'}} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className="text-lg font-extrabold leading-none">{completion}%</span>
                  <span className="text-[9px] font-bold leading-none tracking-wide uppercase text-white/70">COMPLETE</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-extrabold">Profile strength</p>
                <p className="text-xs font-medium text-white/70 mt-1 max-w-[180px]">{completion < 100 ? 'Complete all sections for best job matching.' : 'Excellent — you’re fully matched!'}</p>
                <div className="mt-2 h-1.5 w-32 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white transition-all" style={{width:`${completion}%`}} /></div>
              </div>
            </div>
          </div>
        </div>

        {message.text && <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${message.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}><span>{message.type==='success' ? '✓' : '⚠'}</span>{message.text}</div>}

        <div className="grid lg:grid-cols-[260px_1fr] gap-6 lg:gap-8 items-start">
          <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-3 sticky top-[88px]">
            <p className="px-3 py-2 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Sections</p>
            <div className="space-y-1">
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition ${activeTab===t.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${activeTab===t.id ? 'bg-white/15' : 'bg-slate-100'}`}>{t.icon}</span>{t.label}
                  {activeTab===t.id && <span className="ml-auto w-2 h-2 rounded-full bg-white" />}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-100 p-4">
              <p className="text-xs font-extrabold tracking-widest uppercase text-primary-700">Pro tip</p>
              <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">Accurate DOB, category & state unlock precise eligibility checks.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-7 lg:px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">{tabs.find(t=>t.id===activeTab)?.label}</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Keep this accurate for better matching</p>
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-slate-900 text-white text-xs font-bold px-3 py-1.5">{completion}% done</span>
            </div>

            <div className="p-7 lg:p-8">
              {activeTab==='personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Full name</label><input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Ananya Sharma" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Email</label><input type="email" value={form.email} disabled className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-medium text-slate-500" /><p className="text-[11px] text-slate-400 mt-1 font-medium">Email can’t be changed</p></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Phone</label><input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98..." className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Date of birth</label><input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Gender</label><select name="gender" value={form.gender} onChange={handleChange} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 outline-none transition"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Category</label><select name="category" value={form.category} onChange={handleChange} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 outline-none transition"><option value="">Select</option>{CATEGORIES.map(c=> <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                </div>
              )}

              {activeTab==='qualification' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Highest qualification</label><select name="qualification.highest" value={form.qualification.highest} onChange={handleChange} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 outline-none transition"><option value="">Select</option>{QUALIFICATIONS.map(q=> <option key={q.value} value={q.value}>{q.label}</option>)}</select></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Field / Specialization</label><input type="text" name="qualification.field" value={form.qualification.field} onChange={handleChange} placeholder="B.Tech Computer Science" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">University</label><input type="text" name="qualification.university" value={form.qualification.university} onChange={handleChange} placeholder="University name" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Percentage / CGPA</label><input type="number" name="qualification.percentage" value={form.qualification.percentage} onChange={handleChange} placeholder="76" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Year of passing</label><input type="number" name="qualification.yearOfPassing" value={form.qualification.yearOfPassing} onChange={handleChange} placeholder="2023" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div className="md:col-span-2 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3"><span className="text-amber-600">💡</span><p className="text-xs font-medium text-amber-800 leading-relaxed">Your qualification is matched against every job’s eligibility. Keep field & year accurate.</p></div>
                </div>
              )}

              {activeTab==='location' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">State</label><select name="state" value={form.state} onChange={handleChange} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 outline-none transition"><option value="">Select state</option>{INDIAN_STATES.map(s=> <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">District</label><input type="text" name="district" value={form.district} onChange={handleChange} placeholder="District" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
                  <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-3"><span>📍</span><p className="text-xs font-medium text-slate-600 leading-relaxed">State domicile is used for state-level jobs and category relaxation. Update if you move.</p></div>
                </div>
              )}

              {activeTab==='preferences' && (
                <div>
                  <p className="text-sm font-bold text-slate-900">Preferred exam types</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">We’ll prioritize these in matching & recommendations</p>
                  <div className="flex flex-wrap gap-2.5 mt-5">
                    {EXAM_TYPES.map(exam=>(
                      <button key={exam.value} type="button" onClick={()=>handleExamToggle(exam.value)} className={`px-4 py-2.5 rounded-full text-sm font-bold border transition ${form.preferredExamTypes.includes(exam.value) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                        {exam.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3"><span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✦</span><p className="text-xs font-medium text-indigo-900 leading-relaxed">Select at least 2–3 exam types you’re actively preparing for. You can change anytime.</p></div>
                </div>
              )}
            </div>

            <div className="px-7 lg:px-8 py-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-medium text-slate-500">Changes are encrypted & used only for eligibility matching.</p>
              <div className="flex gap-3">
                <button type="button" onClick={()=>window.location.reload()} className="px-6 py-3 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Reset</button>
                <button type="submit" disabled={saving} className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2">
                  {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save changes →'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
