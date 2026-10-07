import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import EligibilityPill from './EligibilityPill';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const examTypeColors = {
  ssc: 'blue',
  upsc: 'green',
  railway: 'red',
  banking: 'yellow',
  statepsc: 'gray',
  defense: 'red',
  police: 'blue',
  teaching: 'green',
  psu: 'yellow',
  central: 'blue',
  state: 'gray',
  other: 'gray',
};

function getDaysRemaining(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getDeadlineColor(days) {
  if (days === null) return 'text-slate-500';
  if (days <= 3) return 'text-red-600 font-bold';
  if (days <= 7) return 'text-amber-600 font-semibold';
  return 'text-slate-600 font-medium';
}

function JobCard({ job, hideSave = false, showEligibility = false }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const days = getDaysRemaining(job.applicationEndDate);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) { alert('Please login to save jobs'); return; }
    setSaving(true);
    try {
      if (saved) {
        await api.delete(`/saved-jobs/${job._id}`);
        setSaved(false);
      } else {
        await api.post(`/saved-jobs/${job._id}`);
        setSaved(true);
      }
    } catch (err) {
      if (err.response?.data?.message?.includes('already')) setSaved(true);
    } finally { setSaving(false); }
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-6 md:p-7 lg:p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden min-w-0 w-full">
      {/* subtle top highlight on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-200/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
      {/* left accent bar */}
      <div className="absolute left-0 top-7 bottom-7 w-[3.5px] bg-gradient-to-b from-primary-600 via-blue-500 to-indigo-500 rounded-full opacity-90 group-hover:opacity-100 transition" />
      <div className="pl-3 sm:pl-3.5 min-w-0">
        <div className="flex items-start gap-2 sm:gap-4 mb-2.5 sm:mb-3 min-w-0">
          <Link to={`/jobs/${job.slug}`} className="flex-1 min-w-0">
            <h3 className="text-[15px] min-[413px]:text-base sm:text-[17px] md:text-[19px] font-bold tracking-tight leading-[1.35] sm:leading-6 text-slate-900 group-hover:text-primary-700 transition line-clamp-2 break-words">
              {job.title}
            </h3>
          </Link>
          <Badge color={examTypeColors[job.examType] || 'gray'} size="sm" className="!rounded-full !px-2 sm:!px-3 !py-1 !text-[10px] sm:!text-[11px] !font-bold !tracking-wider sm:!tracking-widest !uppercase shrink-0 shadow-sm max-w-[110px] sm:max-w-none truncate">
            {job.examType?.toUpperCase()}
          </Badge>
        </div>

        <p className="text-[12.5px] sm:text-[13.5px] font-medium text-slate-500 mb-4 sm:mb-5 leading-relaxed flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] shrink-0">🏢</span>
          <span className="truncate min-w-0 flex-1">{job.department}{job.organization && <span className="text-slate-400 font-normal"> — {job.organization}</span>}</span>
        </p>

        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-3.5 text-[13px] sm:text-[13.5px] mb-4 sm:mb-5 p-3 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-100 min-w-0">
          {job.applicationEndDate && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Deadline</span>
              <span className={`text-[13px] sm:text-sm break-words ${getDeadlineColor(days)}`}>
                {new Date(job.applicationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {days !== null && days > 0 && <span className="ml-1.5 inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-slate-700 shadow-sm whitespace-nowrap">{days}d left</span>}
                {days === 0 && <span className="ml-1.5 inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-red-700 whitespace-nowrap">Last day!</span>}
              </span>
            </div>
          )}

          {job.totalVacancies && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Vacancies</span>
              <span className="text-[13px] sm:text-sm font-bold text-slate-800">{job.totalVacancies.toLocaleString()}</span>
            </div>
          )}

          {job.eligibility?.ageMax && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Age Limit</span>
              <span className="text-[13px] sm:text-sm font-medium text-slate-700">{job.eligibility.ageMin || 18}–{job.eligibility.ageMax} years</span>
            </div>
          )}

          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Location</span>
            <span className="text-[13px] sm:text-sm font-medium text-slate-700 inline-flex items-center gap-1.5 min-w-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span><span className="truncate">{job.state || 'All India'}</span></span>
          </div>
        </div>

        {job.applicationFee?.general !== undefined && (
          <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs font-medium text-slate-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 mb-4 sm:mb-5 max-w-full break-words">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">₹</span>
            <span className="break-words">{job.applicationFee.general === 0 ? 'No Fee' : `Fee: ₹${job.applicationFee.general}`}</span>
            {job.applicationFee.sc === 0 && job.applicationFee.st === 0 && <span className="text-amber-700 font-bold">· SC/ST Free</span>}
          </p>
        )}

        <div className="flex flex-col min-[480px]:flex-row gap-2 sm:gap-3 min-[480px]:flex-wrap min-[480px]:items-center min-w-0">
          {showEligibility && <EligibilityPill slug={job.slug} />}
          {(job.applyLink || job.officialApplyUrl) && (job.applyLink || job.officialApplyUrl) !== job.officialWebsite ? (
            <a
              href={job.applyLink || job.officialApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[13px] sm:text-[13.5px] px-4 sm:px-6 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all w-full min-[480px]:w-auto min-[480px]:flex-1"
            >
              Apply Now
              <span aria-hidden>↗</span>
            </a>
          ) : (
            <Link
              to={`/jobs/${job.slug}#how-to-apply`}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[13px] sm:text-[13.5px] px-4 sm:px-6 py-2.5 rounded-xl font-bold shadow-md shadow-orange-500/20 hover:shadow-lg transition-all w-full min-[480px]:w-auto min-[480px]:flex-1"
            >
              How to Apply →
            </Link>
          )}
          <Link
            to={`/jobs/${job.slug}`}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-[13px] sm:text-[13.5px] px-4 sm:px-6 py-2.5 rounded-xl font-bold shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/25 hover:from-slate-800 hover:to-slate-700 transition-all w-full min-[480px]:w-auto min-[480px]:flex-1"
          >
            View Details
            <svg className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </Link>
          {!hideSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center justify-center gap-1.5 text-[13px] sm:text-[13.5px] px-4 sm:px-5 py-2.5 rounded-xl font-bold border transition-all w-full min-[480px]:w-auto shrink-0 ${saved ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-900 border-amber-300 shadow-md shadow-amber-200/40' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm shadow-sm'}`}
            >
              {saving ? '...' : saved ? '★ Saved' : '☆ Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobCard;
