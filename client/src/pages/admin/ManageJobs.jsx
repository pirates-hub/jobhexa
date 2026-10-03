import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

const emptyForm = {
  title: '', department: '', organization: '', examType: 'ssc', state: 'All India',
  totalVacancies: '', applicationStartDate: '', applicationEndDate: '', examDate: '',
  officialWebsite: '', applyLink: '',
};

function ManageJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [filterExam, setFilterExam] = useState('all');

  useEffect(() => { fetchJobs(); }, []);
  const fetchJobs = async () => {
    try { const res = await api.get('/admin/jobs'); setJobs(res.data.data.jobs); } catch {} finally { setLoading(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    await api.delete(`/admin/jobs/${id}`);
    setJobs(jobs.filter(j => j._id !== id));
  };
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (job) => {
    setEditing(job._id);
    setForm({
      title: job.title || '', department: job.department || '', organization: job.organization || '',
      examType: job.examType || 'ssc', state: job.state || 'All India', totalVacancies: job.totalVacancies || '',
      applicationStartDate: job.applicationStartDate ? job.applicationStartDate.split('T')[0] : '',
      applicationEndDate: job.applicationEndDate ? job.applicationEndDate.split('T')[0] : '',
      examDate: job.examDate ? job.examDate.split('T')[0] : '',
      officialWebsite: job.officialWebsite || '', applyLink: job.applyLink || '',
    });
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        totalVacancies: form.totalVacancies ? Number(form.totalVacancies) : undefined,
        applicationStartDate: form.applicationStartDate || undefined,
        applicationEndDate: form.applicationEndDate || undefined,
        examDate: form.examDate || undefined,
      };
      if (editing) {
        const res = await api.put(`/admin/jobs/${editing}`, payload);
        setJobs(jobs.map(j => j._id === editing ? res.data.data.job : j));
      } else {
        const res = await api.post('/admin/jobs', payload);
        setJobs([res.data.data.job, ...jobs]);
      }
      setShowForm(false);
    } catch (err) { alert(err.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const filtered = jobs.filter(j=> {
    if (filterExam!=='all' && j.examType!==filterExam) return false;
    if (q && !j.title.toLowerCase().includes(q.toLowerCase()) && !j.department.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s) => {
    const m = { verified: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-700 border-amber-200', rejected: 'bg-red-50 text-red-700 border-red-200', active: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return m[s] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-12"><Loader /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-slate-500 shadow-sm">Admin • Jobs</div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900" style={{fontFamily:'Sora'}}>Manage Jobs <span className="text-slate-400 font-bold">• {jobs.length}</span></h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Create, edit and publish verified government notifications</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-slate-800 transition shrink-0">＋ Create Job</button>
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-4 lg:p-5 flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {['all','ssc','upsc','railway','banking','defense','statepsc'].map(v=>(
              <button key={v} onClick={()=>setFilterExam(v)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold capitalize border transition ${filterExam===v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{v}</button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title or department…" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium focus:bg-white focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition" />
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-slate-200/70 shadow-xl shadow-slate-200/20 p-7 lg:p-8 mb-6 max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{editing ? 'Edit Job' : 'Create New Job'}</h3>
              <span className="hidden sm:inline-flex rounded-full bg-slate-900 text-white text-xs font-bold px-3 py-1">{editing ? 'Editing' : 'New'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="e.g., SSC CGL 2026" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Department *</label><input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 focus:ring-4 focus:ring-primary-50 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Organization</label><input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Exam Type *</label><select value={form.examType} onChange={e=>setForm({...form,examType:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition"><option value="ssc">SSC</option><option value="upsc">UPSC</option><option value="railway">Railway</option><option value="banking">Banking</option><option value="defense">Defense</option><option value="teaching">Teaching</option><option value="police">Police</option><option value="statepsc">State PSC</option><option value="psu">PSU</option><option value="central">Central</option><option value="state">State</option><option value="other">Other</option></select></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">State</label><input value={form.state} onChange={e=>setForm({...form,state:e.target.value})} placeholder="All India or Tamil Nadu" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Vacancies</label><input type="number" value={form.totalVacancies} onChange={e=>setForm({...form,totalVacancies:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Application Start</label><input type="date" value={form.applicationStartDate} onChange={e=>setForm({...form,applicationStartDate:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Application End</label><input type="date" value={form.applicationEndDate} onChange={e=>setForm({...form,applicationEndDate:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Exam Date</label><input type="date" value={form.examDate} onChange={e=>setForm({...form,examDate:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Official Website</label><input value={form.officialWebsite} onChange={e=>setForm({...form,officialWebsite:e.target.value})} placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold tracking-widest uppercase text-slate-600 mb-2">Apply Link</label><input value={form.applyLink} onChange={e=>setForm({...form,applyLink:e.target.value})} placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-300 outline-none transition" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving} className="bg-slate-900 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2">{saving?'Saving…': editing?'Update job':'Create job →'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="bg-white border border-slate-200 px-6 py-3 rounded-full text-sm font-bold hover:bg-slate-50 transition">Cancel</button>
            </div>
          </form>
        )}

        {/* desktop table */}
        <div className="hidden lg:block bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><th className="text-left py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-slate-500">Job</th><th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Type</th><th className="text-left py-4 px-4 text-xs font-extrabold tracking-widest uppercase text-slate-500">Status</th><th className="text-right py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-slate-500">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(job=>(
                  <tr key={job._id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6"><p className="font-bold text-slate-900 line-clamp-1">{job.title}</p><p className="text-xs font-medium text-slate-500">{job.department} • {job.state || 'All India'}</p></td>
                    <td className="py-4 px-4"><span className="inline-flex rounded-full bg-slate-900 text-white px-2.5 py-1 text-xs font-bold capitalize">{job.examType}</span></td>
                    <td className="py-4 px-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusBadge(job.verificationStatus || job.jobStatus || 'pending')}`}>{job.verificationStatus || job.jobStatus || 'pending'}</span></td>
                    <td className="py-4 px-6 text-right"><div className="inline-flex gap-2"><button onClick={()=>openEdit(job)} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold hover:bg-slate-50 transition">Edit</button><button onClick={()=>handleDelete(job._id)} className="rounded-full border border-red-200 bg-white text-red-600 px-3.5 py-1.5 text-xs font-bold hover:bg-red-50 transition">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length===0 && <div className="p-12 text-center"><p className="text-sm font-bold text-slate-600">No jobs match your filter</p><p className="text-xs font-medium text-slate-400 mt-1">Try a different search or create a new job</p></div>}
        </div>

        {/* mobile cards */}
        <div className="lg:hidden space-y-3">
          {filtered.map(job=>(
            <div key={job._id} className="bg-white rounded-[20px] border border-slate-200/70 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold text-slate-900 leading-snug">{job.title}</p><p className="text-xs font-medium text-slate-500 mt-1">{job.department} • {job.examType}</p></div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusBadge(job.verificationStatus||job.jobStatus)}`}>{job.verificationStatus||job.jobStatus}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>openEdit(job)} className="flex-1 rounded-full bg-white border border-slate-200 py-2.5 text-xs font-bold">Edit</button>
                <button onClick={()=>handleDelete(job._id)} className="flex-1 rounded-full bg-red-50 border border-red-200 text-red-600 py-2.5 text-xs font-bold">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManageJobs;
