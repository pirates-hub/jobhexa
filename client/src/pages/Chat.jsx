import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../services/tokenStore';
import api from '../services/api';
import jobService from '../services/jobService';
import JobCard from '../components/jobs/JobCard';
import Badge from '../components/common/Badge';
import { formatDate, formatCurrency, daysUntil, getDeadlineColor, getJobStatusBadge } from '../utils/helpers';

function renderWithLinks(text, jobIndex = {}) {
  const parts = text.split(/(\[.*?\]\(.*?\)|https?:\/\/[^\s)]+)/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(.*?)\]\((.*?)\)/);
    if (match) {
      let href = match[2];
      // Repair model-written job URLs: /jobs/<raw title> -> /jobs/<slug>
      if (href.startsWith('/jobs/')) {
        const key = href.slice(6).trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(key) || !jobIndex[key]) {
          const byTitle = jobIndex[key];
          href = byTitle ? `/jobs/${byTitle}` : '/jobs';
        }
      }
      return <a key={i} href={href} className="text-primary-600 hover:underline font-medium">{match[1]}</a>;
    }
    if (/^https?:\/\//.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium break-all">{part}</a>;
    }
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="font-semibold text-gray-900">{bp.slice(2, -2)}</strong>;
      }
      return <span key={`${i}-${j}`} className="whitespace-pre-wrap">{bp}</span>;
    });
  });
}

function RightPanel({ data, onSaveJob }) {
  const [started, setStarted] = useState(false);
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
          <span className="text-3xl">✨</span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Your results will appear here</h3>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">Ask about upcoming exams, eligibility, job details, official links, or preparation topics. I'll show structured results here.</p>
          <div className="mt-8 grid grid-cols-1 gap-2.5 text-xs w-full max-w-sm">
            {[
              { q: 'Upcoming exams?', icon: '📅', desc: 'Browse all active jobs' },
              { q: 'Am I eligible for SSC CGL?', icon: '✅', desc: 'Check eligibility' },
              { q: 'Give me SSC CGL details', icon: '📄', desc: 'Full job details' },
              { q: 'Official link for IBPS PO', icon: '🔗', desc: 'Official website & PDF' },
              { q: 'What topics for SSC CGL?', icon: '📚', desc: 'Syllabus & missing topics' },
              { q: 'Recommend jobs for me', icon: '⭐', desc: 'AI ranked by your profile' },
              { q: '30-day plan for SSC CGL', icon: '🗓️', desc: 'Personalized study plan' },
              { q: 'Interview questions for SSC CGL', icon: '🎤', desc: 'Mock interview prep' },
            ].map(item => (
              <div key={item.q} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 text-left">
                <span className="text-base">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{item.q}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
      </div>
    );
  }

  if (data.type === 'jobs') {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900">Upcoming Exams</h3>
          <span className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full font-medium">{data.jobs.length} jobs</span>
        </div>
        <div className="space-y-3">
          {data.jobs.map(job => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'eligibility') {
    const r = data.result;
    return (
      <div className="p-5 space-y-5">
        <div>
          <h3 className="font-bold text-lg text-gray-900">Eligibility Check</h3>
          <p className="text-sm text-gray-500 mt-1">{data.jobTitle}</p>
        </div>
        <div className={`rounded-2xl p-5 border-2 ${r.eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${r.eligible ? 'bg-green-100' : 'bg-red-100'}`}>{r.eligible ? '✓' : '✗'}</span>
            <div>
              <p className={`font-bold ${r.eligible ? 'text-green-800' : 'text-red-800'}`}>{r.eligible ? 'You are eligible' : 'Not eligible'}</p>
              <p className="text-xs text-gray-600">Score: {r.score}% • {r.eligible ? 'All criteria met' : 'Some criteria not met'}</p>
            </div>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all ${r.eligible ? 'bg-green-500' : r.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${r.score}%`}}></div>
          </div>
          {r.reasons?.length > 0 && <ul className="text-sm text-green-700 mt-3 space-y-1.5">{r.reasons.map((x,i)=><li key={i} className="flex gap-2"><span>•</span><span>{x}</span></li>)}</ul>}
          {r.warnings?.length > 0 && <ul className="text-sm text-red-600 mt-3 space-y-1.5">{r.warnings.map((x,i)=><li key={i} className="flex gap-2"><span>•</span><span>{x}</span></li>)}</ul>}
        </div>
        {r.breakdown && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-900">Detailed Checks</h4>
            {Object.entries(r.breakdown).map(([k,v]) => (
              <div key={k} className={`p-4 rounded-xl border flex items-start gap-3 ${v.met ? 'bg-green-50 border-green-200' : v.score>0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${v.met ? 'bg-green-100' : v.score>0 ? 'bg-yellow-100' : 'bg-red-100'}`}>{v.met ? '✓' : '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm capitalize text-gray-900">{k}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{v.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (data.type === 'eligibleJobs') {
    return (
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900">Exams You Are Eligible For</h3>
          <p className="text-sm text-gray-500 mt-1">{data.jobs.length} matches • Based on your profile</p>
        </div>
        {data.jobs.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
            <p className="text-sm text-yellow-800 font-medium">No eligible exams found</p>
            <p className="text-xs text-yellow-600 mt-1">Complete your profile (qualification, age, category, state) or check other exams.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.jobs.map(({ job, eligibility }) => (
              <div key={job._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition group">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <Link to={`/jobs/${job.slug}`} className="font-semibold text-primary-700 hover:underline text-sm leading-tight group-hover:text-primary-800">{job.title}</Link>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${eligibility.eligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {eligibility.score}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{job.department} • {job.examType?.toUpperCase()} • {job.state}</p>
                <div className="flex gap-2">
                  <Link to={`/jobs/${job.slug}`} className="text-xs bg-primary-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-primary-700 transition">View Details</Link>
                  <button onClick={() => onSaveJob(job)} className="text-xs border border-gray-200 bg-white px-3.5 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition">Save</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (data.type === 'jobDetails') {
    const job = data.job;
    const status = getJobStatusBadge(job.jobStatus);
    return (
      <div className="p-5 space-y-5">
        <div>
          <h3 className="font-bold text-lg text-gray-900 leading-tight">{job.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{job.department} {job.organization && `— ${job.organization}`}</p>
          <div className="flex gap-2 mt-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>{status.text}</span>
            {job.examType && <Badge color="blue" size="sm">{job.examType.toUpperCase()}</Badge>}
          </div>
        </div>
        {job.description && <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed border border-gray-100">{job.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl"><p className="text-xs text-gray-400 font-medium mb-1">Qualification</p><p className="font-semibold text-gray-900">{job.eligibility?.qualifications?.map(q=>q.level).join(', ') || '-'}</p></div>
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl"><p className="text-xs text-gray-400 font-medium mb-1">Age Limit</p><p className="font-semibold text-gray-900">{job.eligibility ? `${job.eligibility.ageMin||18}-${job.eligibility.ageMax} yrs` : '-'}</p></div>
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl"><p className="text-xs text-gray-400 font-medium mb-1">Vacancies</p><p className="font-semibold text-gray-900">{job.totalVacancies?.toLocaleString() || '-'}</p></div>
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl"><p className="text-xs text-gray-400 font-medium mb-1">State</p><p className="font-semibold text-gray-900">{job.state || 'All India'}</p></div>
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl"><p className="text-xs text-gray-400 font-medium mb-1">Deadline</p><p className="font-semibold text-gray-900">{job.applicationEndDate ? formatDate(job.applicationEndDate) : '-'}</p><p className={`text-xs mt-1 font-medium ${getDeadlineColor(job.applicationEndDate)}`}>{job.applicationEndDate ? `${daysUntil(job.applicationEndDate)} days left` : ''}</p></div>
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl"><p className="text-xs text-gray-400 font-medium mb-1">Exam Date</p><p className="font-semibold text-gray-900">{job.examDate ? formatDate(job.examDate) : '-'}</p></div>
        </div>
        {job.applicationFee && (
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Application Fee</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(job.applicationFee).map(([k,v])=> v!=null && <div key={k} className="bg-white border border-gray-200 p-3 rounded-xl text-center"><p className="text-xs text-gray-400 capitalize mb-1">{k}</p><p className="text-sm font-bold text-gray-900">{formatCurrency(v)}</p></div>)}
            </div>
          </div>
        )}
        {job.syllabus?.sections?.length>0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Syllabus</h4>
            <div className="space-y-3">
              {job.syllabus.sections.map((s,i)=>(
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200"><p className="font-medium text-sm text-gray-900">{s.name}</p><p className="text-xs text-gray-500 mt-1">{s.marks} marks • {s.duration} min</p></div>
                  {s.topics?.length>0 && <ul className="px-4 py-3 space-y-1.5">{s.topics.map((t,j)=><li key={j} className="text-xs text-gray-700 flex gap-2"><span className="text-primary-500 mt-0.5">•</span><span>{t}</span></li>)}</ul>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2.5 pt-2">
          <Link to={`/jobs/${job.slug}`} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-sm">View Job</Link>
          {job.officialWebsite && <a href={job.officialWebsite} target="_blank" rel="noopener noreferrer" className="border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Official Website ↗</a>}
          {job.notificationPdfUrl && <a href={job.notificationPdfUrl} target="_blank" rel="noopener noreferrer" className="border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">PDF ↗</a>}
          <button onClick={()=>onSaveJob(job)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition shadow-sm">Save Job</button>
        </div>
      </div>
    );
  }

  if (data.type === 'officialLink') {
    return (
      <div className="p-5 space-y-5">
        <div>
          <h3 className="font-bold text-lg text-gray-900">Official Links</h3>
          <p className="text-sm text-gray-500 mt-1">{data.job.title}</p>
        </div>
        <div className="space-y-3">
          {data.job.officialWebsite && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
              <p className="text-xs font-medium text-gray-400 mb-3">Official Website</p>
              <a href={data.job.officialWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-sm">
                Open Official Website ↗
              </a>
              <p className="text-xs text-gray-400 mt-3 break-all bg-gray-50 p-2 rounded-lg">{data.job.officialWebsite}</p>
            </div>
          )}
          {data.job.applyLink && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
              <p className="text-xs font-medium text-gray-400 mb-3">Apply Link</p>
              <a href={data.job.applyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition shadow-sm">
                Apply Now ↗
              </a>
            </div>
          )}
          {data.job.notificationPdfUrl ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-400 mb-3">Notification PDF</p>
              <a href={data.job.notificationPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
                View Notification PDF ↗
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">No notification PDF available for this job.</p>
          )}
        </div>
      </div>
    );
  }

  if (data.type === 'preparation') {
    const isCommon = data.isCommon;
    return (
      <div className="p-5 space-y-5">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{isCommon ? 'Common Topics Across Exams' : 'Preparation'}</h3>
          {data.exam && <p className="text-sm text-gray-500 mt-1">{isCommon ? data.exam.fullName : `Exam: ${data.exam.name} (${data.exam.fullName})`}</p>}
          {isCommon && <p className="text-xs text-gray-400 mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3">These topics are reusable across SSC, Banking, Railway, and other exams. Master them once, apply to multiple exams.</p>}
        </div>
        {isCommon ? (
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Most Common Topics</h4>
            <div className="space-y-2">
              {data.missingTopics?.length>0 ? data.missingTopics.map(t=>(
                <Link key={t._id} to={`/preparation/topic/${t.slug}`} className="block bg-white border border-primary-100 rounded-xl p-4 hover:shadow-sm hover:border-primary-200 transition group">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm text-gray-900 group-hover:text-primary-700">{t.name}</p>
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full ml-2 whitespace-nowrap">Common</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t.subject?.name || 'Quant/Reasoning'} • <span className="capitalize">{t.difficulty}</span> • ~{t.estimatedHours}h • Used in multiple exams</p>
                </Link>
              )) : <p className="text-sm text-gray-500">Loading common topics...</p>}
            </div>
          </div>
        ) : (
          <>
            {data.subjects?.length>0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-3">Subjects</h4>
                <div className="space-y-2.5">
                  {data.subjects.slice(0,6).map(s=>(
                    <Link key={s._id} to={`/preparation/subject/${s.slug}`} className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition group">
                      <p className="font-medium text-sm text-gray-900 group-hover:text-primary-700">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {data.missingTopics?.length>0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-3">Missing Topics</h4>
                <div className="space-y-2">
                  {data.missingTopics.map(t=>(
                    <Link key={t._id} to={`/preparation/topic/${t.slug}`} className="block bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 hover:shadow-sm transition">
                      <p className="font-medium text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{t.subject?.name} • <span className="capitalize">{t.difficulty}</span> • ~{t.estimatedHours}h</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (data.type === 'studyPlan') {
    const [starting, setStarting] = useState(false);
    const [startedMsg, setStartedMsg] = useState('');
    const handleStart = async () => {
      setStarting(true);
      try {
        const res = await api.post('/chat/study-plan/start');
        setStartedMsg(res.data.data.message || 'Plan started! Daily 8 AM from Day 1.');
        setTimeout(()=>setStartedMsg(''), 4000);
      } catch (e) {
        setStartedMsg(e.response?.data?.message || 'Failed to start');
        setTimeout(()=>setStartedMsg(''), 4000);
      } finally { setStarting(false); }
    };
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900">{data.exam?.includes('Day') ? data.exam : `${data.plan?.length || 30}-Day Study Plan`}</h3>
          <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">Daily 8 AM</span>
        </div>
        <p className="text-sm text-gray-500">{data.exam} • {data.plan?.length || 0} days • Personalized</p>
        {startedMsg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{startedMsg}</p>}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-900">Your plan is ready!</p>
          <p className="text-xs text-blue-600 mt-1">Click Start to begin from Day 1 and get daily notifications at 8 AM IST.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleStart} disabled={starting} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {starting ? 'Starting...' : '▶ Start Plan Now'}
            </button>
            <Link to="/my-plan" className="border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Go to My Plan →</Link>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Preview (first 3 days):</p>
          {data.plan?.slice(0,3).map(d => (
            <div key={d.day} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold bg-primary-100 text-primary-700 px-2 py-1 rounded-full">Day {d.day}</span>
                <span className="text-xs text-gray-500">{d.hours}h • {d.subject}</span>
              </div>
              <p className="font-medium text-sm text-gray-900">{d.topic}</p>
            </div>
          ))}
          <p className="text-xs text-center text-gray-400">+ {(data.plan?.length || 30) - 3} more days on My Plan page</p>
        </div>
      </div>
    );
  }

  if (data.type === 'recommended') {
    return (
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Recommended for You</h3>
        <p className="text-sm text-gray-500">Ranked by eligibility score • Top matches</p>
        <div className="space-y-3">
          {data.jobs?.map(({job, score}) => (
            <div key={job._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition">
              <div className="flex justify-between items-start gap-3 mb-1">
                <Link to={`/jobs/${job.slug}`} className="font-semibold text-sm text-primary-700 hover:underline leading-tight">{job.title}</Link>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">{score}%</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{job.department} • {job.examType?.toUpperCase()} • {job.state}</p>
              <div className="flex gap-2">
                <Link to={`/jobs/${job.slug}`} className="text-xs bg-primary-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-primary-700">View</Link>
                <button onClick={()=>onSaveJob(job)} className="text-xs border border-gray-200 bg-white px-3.5 py-1.5 rounded-lg hover:bg-gray-50">Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'interview') {
    return (
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Interview Prep</h3>
        <p className="text-sm text-gray-500">{data.jobTitle} • 5 questions</p>
        <div className="space-y-3">
          {data.questions?.map((q,i)=>(
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
              <p className="text-xs font-medium text-primary-600 mb-2">{q.category} • Q{i+1}</p>
              <p className="font-medium text-sm text-gray-900 leading-relaxed">{q.question}</p>
              <p className="text-xs text-gray-600 mt-3 bg-yellow-50 border border-yellow-100 rounded-xl p-3 leading-relaxed">💡 <span className="font-medium">Tip:</span> {q.tip}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'studyPlan') {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900">30-Day Study Plan</h3>
          <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">Daily notifs 8 AM</span>
        </div>
        <p className="text-sm text-gray-500">{data.exam} • {data.plan?.length || 0} days • Personalized • 🔔 Daily at 8 AM IST</p>
        {!started ? (
          <button onClick={()=>setStarted(true)} className="w-full bg-primary-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-700 shadow-sm">▶ Start Plan Now</button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-sm font-medium text-green-800">✓ Plan Started!</p>
            <p className="text-xs text-green-600 mt-1">You'll get daily notifications at 8 AM for Day 1: {data.plan?.[0]?.topic}</p>
          </div>
        )}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {data.plan?.slice(0,30).map(d => (
            <div key={d.day} className={`bg-white border rounded-xl p-4 hover:shadow-sm transition ${started && d.day===1 ? 'border-green-300 bg-green-50/30' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${started && d.day===1 ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}`}>Day {d.day}</span>
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">{d.hours}h • {d.subject}</span>
              </div>
              <p className="font-medium text-sm text-gray-900">{d.topic}</p>
              <ul className="text-xs text-gray-600 mt-2.5 space-y-1 bg-gray-50 p-2.5 rounded-lg">{d.tasks?.slice(0,3).map((t,i)=><li key={i} className="flex gap-2"><span className="text-primary-500">•</span><span>{t}</span></li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'recommended') {
    return (
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Recommended for You</h3>
        <p className="text-sm text-gray-500">Ranked by eligibility score • Top matches</p>
        <div className="space-y-3">
          {data.jobs?.map(({job, score}) => (
            <div key={job._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition">
              <div className="flex justify-between items-start gap-3 mb-1">
                <Link to={`/jobs/${job.slug}`} className="font-semibold text-sm text-primary-700 hover:underline leading-tight">{job.title}</Link>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">{score}%</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{job.department} • {job.examType?.toUpperCase()} • {job.state}</p>
              <div className="flex gap-2">
                <Link to={`/jobs/${job.slug}`} className="text-xs bg-primary-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-primary-700">View</Link>
                <button onClick={()=>onSaveJob(job)} className="text-xs border border-gray-200 bg-white px-3.5 py-1.5 rounded-lg hover:bg-gray-50">Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'interview') {
    return (
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Interview Prep</h3>
        <p className="text-sm text-gray-500">{data.jobTitle} • 5 questions</p>
        <div className="space-y-3">
          {data.questions?.map((q,i)=>(
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
              <p className="text-xs font-medium text-primary-600 mb-2">{q.category} • Q{i+1}</p>
              <p className="font-medium text-sm text-gray-900 leading-relaxed">{q.question}</p>
              <p className="text-xs text-gray-600 mt-3 bg-yellow-50 border border-yellow-100 rounded-xl p-3 leading-relaxed">💡 <span className="font-medium">Tip:</span> {q.tip}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function Chat() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (authLoading) return; if (!user) navigate('/login'); }, [user, navigate, authLoading]);
  const getStorageKey = () => `jobhexa_chat_${user?._id || user?.id || 'guest'}`;
  const [messages, setMessages] = useState(() => {
    try {
      const key = `jobhexa_chat_${JSON.parse(localStorage.getItem('user') || '{}')?._id || JSON.parse(localStorage.getItem('user') || '{}')?.id || 'guest'}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved).messages || [];
      // Migrate old common key if exists
      const old = localStorage.getItem('jobhexa_chat_history');
      if (old) {
        localStorage.removeItem('jobhexa_chat_history');
        return JSON.parse(old).messages || [];
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rightData, setRightData] = useState(() => {
    try {
      const key = `jobhexa_chat_${JSON.parse(localStorage.getItem('user') || '{}')?._id || JSON.parse(localStorage.getItem('user') || '{}')?.id || 'guest'}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved).rightData || null;
    } catch {}
    return null;
  });
  const [mobileTab, setMobileTab] = useState('chat');
  const [saveMsg, setSaveMsg] = useState('');
  const messagesEndRef = useRef(null);

  // slug/title index to repair model-written /jobs/<raw title> links
  const jobIndex = useMemo(() => {
    const map = {};
    const jobs = rightData?.type === 'jobs' ? rightData.jobs || [] : [];
    jobs.forEach((j) => {
      if (j.slug) map[j.slug.toLowerCase()] = j.slug;
      if (j.title) map[j.title.trim().toLowerCase()] = j.slug;
    });
    return map;
  }, [rightData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.messages || []);
        setRightData(parsed.rightData || null);
      } else {
        setMessages([]);
        setRightData(null);
      }
    } catch {
      setMessages([]);
      setRightData(null);
    }
  }, [user?._id]);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify({ messages, rightData }));
    } catch {}
  }, [messages, rightData]);

  const handleSaveJob = async (job) => {
    try {
      await api.post(`/saved-jobs/${job._id}`);
      setSaveMsg(`Saved ${job.title}`);
      setTimeout(()=>setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg(e.response?.data?.message?.includes('already') ? 'Already saved' : 'Failed to save');
      setTimeout(()=>setSaveMsg(''), 3000);
    }
  };

  const fetchRightPanel = async (userMessage) => {
    const lower = userMessage.toLowerCase();
    const findJob = async (query) => {
      try {
        const res = await jobService.getJobs({ search: query, limit: 1 });
        return res.data.data.jobs[0];
      } catch { return null; }
    };

    try {
      if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('for me') && lower.includes('job')) {
        try {
          const res = await api.get('/jobs/recommended');
          setRightData({ type: 'recommended', jobs: res.data.data.jobs });
          setMobileTab('results');
          return;
        } catch {}
      }

      if (lower.includes('study plan') || lower.includes('day plan') || lower.includes(' day ') || lower.includes('days')) {
        try {
          let exam = 'SSC CGL';
          if (lower.includes('upsc')) exam = 'UPSC';
          else if (lower.includes('ibps')) exam = 'IBPS PO';
          else if (lower.includes('rrb')) exam = 'RRB NTPC';
          else if (lower.includes('tnpsc')) exam = 'TNPSC';
          const daysMatch = lower.match(/(\d+)\s*day/);
          const days = daysMatch ? Math.min(Math.max(parseInt(daysMatch[1]), 1), 90) : 30;
          const res = await api.post('/chat/study-plan', { exam, days });
          const planData = res.data.data.plan;
          const planArray = Array.isArray(planData) ? planData : planData.plan || planData;
          setRightData({ type: 'studyPlan', plan: planArray, exam: `${days}-Day ${exam} Plan` });
          setMobileTab('results');
          return;
        } catch (e) {
          setMessages(prev => [...prev, { role: 'ai', text: e.response?.data?.message || 'Study-plan generation failed — please try again.' }]);
        }
      }

      if (lower.includes('interview')) {
        try {
          let jobTitle = 'SSC CGL';
          const m = userMessage.match(/for\s+(.+?)(\?|$)/i);
          if (m) jobTitle = m[1].trim();
          const res = await api.post('/chat/interview', { jobTitle });
          setRightData({ type: 'interview', questions: res.data.data.questions, jobTitle });
          setMobileTab('results');
          return;
        } catch {}
      }

      if (lower.includes('upcoming') || lower.includes('exams') || lower.includes('jobs') && !lower.includes('eligible') && !lower.includes('details') && !lower.includes('official') && !lower.includes('topic') && !lower.includes('syllabus')) {
        const res = await jobService.getJobs({ limit: 10 });
        setRightData({ type: 'jobs', jobs: res.data.data.jobs });
        setMobileTab('results');
        return;
      }

      if (lower.includes('elig')) {
        const isGeneric = lower.includes('what') || lower.includes('which') || lower.includes('list') || !lower.includes('for');
        if (isGeneric) {
          try {
            const res = await jobService.getJobs({ limit: 20 });
            const jobs = res.data.data.jobs;
            const eligibleJobs = [];
            for (const j of jobs) {
              try {
                const er = await api.get(`/jobs/${j.slug}/eligibility`);
                if (er.data.data.eligible) eligibleJobs.push({ job: j, eligibility: er.data.data });
              } catch {}
            }
            setRightData({ type: 'eligibleJobs', jobs: eligibleJobs });
            setMobileTab('results');
            return;
          } catch {}
        }
        const match = userMessage.match(/for\s+(.+?)(\?|$)/i);
        let job = null;
        if (match) job = await findJob(match[1].trim());
        if (!job) {
          const res = await jobService.getJobs({ limit: 1 });
          job = res.data.data.jobs[0];
        }
        if (job) {
          try {
            const res = await api.get(`/jobs/${job.slug}/eligibility`);
            setRightData({ type: 'eligibility', result: res.data.data, jobTitle: job.title });
          } catch {
            setRightData({ type: 'eligibility', result: { eligible: false, score: 0, reasons: [], warnings: ['Login to check eligibility'], breakdown: {} }, jobTitle: job.title });
          }
          setMobileTab('results');
          return;
        }
      }

      if (lower.includes('details') || lower.includes('give me') && !lower.includes('official') && !lower.includes('topic')) {
        let query = lower.replace(/give me|details|about|job|exam/gi, '').trim();
        if (!query) query = 'SSC CGL';
        let job = await findJob(query);
        if (!job) {
          const res = await jobService.getJobs({ limit: 1 });
          job = res.data.data.jobs[0];
        }
        if (job) {
          const full = await jobService.getJobBySlug(job.slug);
          setRightData({ type: 'jobDetails', job: full.data.data.job });
          setMobileTab('results');
          return;
        }
      }

      if (lower.includes('official') && (lower.includes('link') || lower.includes('website') || lower.includes('pdf'))) {
        let query = lower.replace(/official|link|website|pdf|give|me|the/gi, '').trim();
        if (!query) query = 'SSC CGL';
        let job = await findJob(query);
        if (!job) {
          const res = await jobService.getJobs({ limit: 1 });
          job = res.data.data.jobs[0];
        }
        if (job) {
          const full = await jobService.getJobBySlug(job.slug);
          setRightData({ type: 'officialLink', job: full.data.data.job });
          setMobileTab('results');
          return;
        }
      }

      if (lower.includes('topic') || lower.includes('syllabus') || lower.includes('study') || lower.includes('preparation') || lower.includes('subject') || lower.includes('common')) {
        try {
          const isCommon = lower.includes('common');
          let examSlug = 'ssc-cgl';
          if (lower.includes('upsc')) examSlug = 'upsc-cse';
          else if (lower.includes('ibps')) examSlug = 'ibps-po';
          else if (lower.includes('rrb')) examSlug = 'rrb-ntpc';
          const [subjRes, missingRes, topicsRes] = await Promise.all([
            api.get('/prep/subjects').catch(()=>({data:{data:{subjects:[]}}})),
            api.get('/prep/missing-topics').catch(()=>({data:{data:{missingTopics:[]}}})),
            isCommon ? api.get('/prep/subjects/quantitative-aptitude').catch(()=>({data:{data:{topics:[]}}})) : Promise.resolve({data:{data:{topics:[]}}}),
          ]);
          // For common topics, show topics that are reusable across exams (Quant + Reasoning)
          let commonTopics = [];
          if (isCommon) {
            try {
              const qaRes = await api.get('/prep/subjects/quantitative-aptitude').catch(()=>({data:{data:{topics:[]}}}));
              const reRes = await api.get('/prep/subjects/reasoning').catch(()=>({data:{data:{topics:[]}}}));
              commonTopics = [...(qaRes.data.data.topics||[]), ...(reRes.data.data.topics||[])].slice(0,8);
            } catch {}
          }
          setRightData({
            type: 'preparation',
            subjects: subjRes.data.data.subjects || [],
            missingTopics: isCommon ? commonTopics : (missingRes.data.data.missingTopics || []),
            topics: topicsRes.data.data.topics || [],
            exam: { name: isCommon ? 'Common Topics' : examSlug.toUpperCase(), fullName: isCommon ? 'Topics common across SSC, Banking, Railway, etc.' : examSlug },
            isCommon,
          });
          setMobileTab('results');
          return;
        } catch {}
      }
    } catch (e) {
      console.error('Right panel fetch failed', e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);
    fetchRightPanel(userText);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken() || ''}` },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      const reply = data.data?.reply || 'No reply';
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI unavailable. Ensure Ollama is running at http://localhost:11434 with qwen2.5-coder:7b.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f8fafc]">
      <div className="md:hidden flex border-b border-gray-200 bg-white">
        <button onClick={()=>setMobileTab('chat')} className={`flex-1 py-3.5 text-sm font-medium transition ${mobileTab==='chat' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-700'}`}>💬 Chat</button>
        <button onClick={()=>setMobileTab('results')} className={`flex-1 py-3.5 text-sm font-medium transition ${mobileTab==='results' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-700'}`}>📊 Results {rightData ? '•' : ''}</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${mobileTab==='chat' ? 'flex' : 'hidden'} md:flex flex-col flex-1 md:w-[45%] lg:w-[46%] bg-white border-r border-gray-200/60`}>
          <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">JobHexa AI</h1>
              <p className="text-xs text-gray-500 mt-1">Your government job assistant</p>
              {saveMsg && <p className="text-xs text-green-600 mt-2 bg-green-50 px-3 py-2 rounded-full inline-block">{saveMsg}</p>}
            </div>
            {messages.length > 0 && (
              <button onClick={()=>{ setMessages([]); setRightData(null); localStorage.removeItem(getStorageKey()); localStorage.removeItem('jobhexa_chat_history'); }} className="text-xs text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 px-3 py-1.5 rounded-full transition">Clear</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 bg-[#fcfcfd]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                  <span className="text-2xl">✦</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">How can I help?</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">Ask about jobs, check eligibility, get details, or find study topics.</p>
                <div className="grid grid-cols-1 gap-2.5 text-left max-w-sm mx-auto">
                  {[
                    { q: 'Upcoming exams?', icon: '🗓️' },
                    { q: 'Am I eligible for SSC CGL?', icon: '✓' },
                    { q: 'Give me SSC CGL details', icon: '📋' },
                    { q: 'Official link for IBPS PO', icon: '🔗' },
                    { q: 'What topics for SSC CGL?', icon: '📚' },
                  ].map(item=>(
                    <button key={item.q} onClick={()=>setInput(item.q)} className="flex items-center gap-3 text-sm bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-left hover:border-primary-200 hover:bg-primary-50/30 hover:shadow-sm transition group">
                      <span className="w-8 h-8 bg-gray-50 group-hover:bg-primary-50 rounded-lg flex items-center justify-center text-sm transition">{item.icon}</span>
                      <span className="font-medium text-gray-700 group-hover:text-gray-900">{item.q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m,i)=>(
              <div key={i} className={`flex gap-3 ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
                {m.role==='ai' && <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm"><span className="text-xs text-white">✦</span></div>}
                <div className={`max-w-[82%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm ${m.role==='user' ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white border border-gray-200 rounded-bl-md text-gray-800'}`}>
                  {renderWithLinks(m.text, jobIndex)}
                </div>
                {m.role==='user' && <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><span className="text-xs font-medium text-gray-600">You</span></div>}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-xs text-white">✦</span></div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay:'0.15s'}}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay:'0.3s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-3 items-end bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-50 transition">
              <textarea
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{
                  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Ask about jobs, eligibility..."
                rows={1}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none resize-none max-h-32 min-h-[24px] placeholder:text-gray-400"
                style={{height: 'auto'}}
                onInput={e=>{ e.target.style.height='auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128)+'px'; }}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-primary-600 text-white p-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2.5 text-center">Enter to send • Shift+Enter for new line</p>
          </div>
        </div>

        <div className={`${mobileTab==='results' ? 'flex' : 'hidden'} md:flex flex-col flex-1 md:w-[55%] lg:w-[54%] bg-[#f8fafc] overflow-hidden`}>
          <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Results</h2>
            {rightData && <button onClick={()=>setRightData(null)} className="text-xs text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 px-3 py-1.5 rounded-full transition">Clear</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            <RightPanel data={rightData} onSaveJob={handleSaveJob} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
