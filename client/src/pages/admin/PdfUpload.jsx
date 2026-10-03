import { useState } from 'react';
import api from '../../services/api';

function PdfUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async () => {
    if (!file) { setError('Select a PDF file'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const res = await api.post('/pdf/extract', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data.data);
    } catch (e) { setError(e.response?.data?.message || 'Upload failed'); } finally { setLoading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type==='application/pdf') setFile(f);
    else setError('Please drop a PDF file');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-primary-600 via-indigo-600 to-violet-600 p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-primary-600/20">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1.5 text-xs font-bold tracking-widest uppercase">✦ AI Powered</div>
            <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-[-0.04em]" style={{fontFamily:'Sora'}}>AI PDF Extraction</h1>
            <p className="text-sm font-medium text-white/80 mt-2 max-w-2xl">Upload a government notification PDF — AI extracts job data, dates, fees and generates a plain-language summary in seconds.</p>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8 items-start">
          <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-7 lg:p-8">
            <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">Upload notification PDF</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Drag & drop or choose file • Max 10 MB • PDF only</p>

            <div
              onDragOver={e=>{e.preventDefault(); setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={onDrop}
              className={`mt-6 rounded-[24px] border-2 border-dashed p-8 lg:p-10 text-center transition ${dragOver ? 'border-primary-400 bg-primary-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 text-xl">📄</div>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">{(file.size/1024/1024).toFixed(2)} MB • PDF</p>
                  <button onClick={()=>setFile(null)} className="mt-3 text-xs font-bold text-red-600 hover:text-red-700">Remove</button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-700">Drop PDF here</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">or click to browse</p>
                </div>
              )}
              <label className="mt-5 inline-flex cursor-pointer bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
                <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])} className="hidden" />
                Choose file
              </label>
            </div>

            <button onClick={handleUpload} disabled={loading} className="mt-6 w-full bg-slate-900 text-white py-3.5 rounded-full font-bold text-sm shadow-md hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing with AI…</> : 'Upload & Extract →'}
            </button>
            {error && <p className="mt-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-semibold">{error}</p>}
            <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✦</span>
              <p className="text-xs font-medium text-indigo-900 leading-relaxed">AI extracts title, department, vacancies, dates, eligibility, fee and syllabus — then summarizes key points. Verify before publishing.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm p-7">
              <h3 className="text-sm font-extrabold tracking-widest uppercase text-slate-900">How it works</h3>
              <div className="mt-5 space-y-4">
                {[
                  {n:'01', t:'Upload PDF', d:'Official notification from SSC/UPSC/etc.'},
                  {n:'02', t:'AI extraction', d:'Text + structured fields + summary'},
                  {n:'03', t:'Verify & publish', d:'Review and push to Manage Jobs'},
                ].map(s=>(
                  <div key={s.n} className="flex gap-4">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.n}</span>
                    <div><p className="text-sm font-bold text-slate-900">{s.t}</p><p className="text-xs font-medium text-slate-500">{s.d}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
              <p className="text-xs font-bold tracking-widest uppercase text-white/60">Tip</p>
              <p className="text-sm font-medium leading-relaxed mt-2 text-white/90">For best results, upload text-based PDFs (not scanned images). Scanned PDFs may need OCR.</p>
            </div>
          </div>
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold tracking-tight text-slate-900">AI Summary</h3>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-xs font-bold">✓ Generated</span>
              </div>
              <div className="p-7">
                <p className="text-sm font-medium leading-7 text-slate-700 whitespace-pre-line">{result.summary?.summary || 'No summary'}</p>
                {result.summary?.keyPoints?.length > 0 && (
                  <ul className="mt-5 grid sm:grid-cols-2 gap-2">
                    {result.summary.keyPoints.map((p,i)=> <li key={i} className="flex gap-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"><span className="text-primary-600 mt-0.5">•</span>{p}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Extracted Data</h3><p className="text-xs font-medium text-slate-500">JSON — verify before publishing</p></div>
                <div className="p-7"><pre className="text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-auto max-h-96 leading-relaxed">{JSON.stringify(result.extraction, null, 2)}</pre></div>
              </div>
              <div className="bg-white rounded-[24px] border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Extracted Text</h3><p className="text-xs font-medium text-slate-500">First 5000 chars • {result.pages} pages</p></div>
                <div className="p-7"><p className="text-xs font-medium text-slate-600 whitespace-pre-line max-h-96 overflow-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 leading-relaxed">{result.text?.substring(0, 5000)}</p></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfUpload;
