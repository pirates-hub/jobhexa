import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';
import JobCard from '../components/jobs/JobCard';
import JobFilter from '../components/jobs/JobFilter';
import Pagination from '../components/common/Pagination';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

function Jobs() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [totalPosts, setTotalPosts] = useState(0);
  const [filters, setFilters] = useState({ page: 1, limit: 10 });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await jobService.getJobs(filters);
        setJobs(res.data.data.jobs);
        setPagination(res.data.data.pagination);
        setTotalPosts(res.data.data.totalPosts || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [filters, user, navigate, authLoading]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1480px] mx-auto px-3 min-[413px]:px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10">
        {/* premium header */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-sm px-3 py-1 text-[11px] sm:text-xs font-bold tracking-widest uppercase text-slate-500 mb-3 sm:mb-4 max-w-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">Live openings updated daily</span>
              </div>
              <h1 className="text-[28px] leading-[1.1] min-[413px]:text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-[-0.03em] text-slate-900 sm:leading-none break-words">
                Government <span className="bg-gradient-to-r from-primary-700 to-indigo-600 bg-clip-text text-transparent">Jobs</span>
              </h1>
              <p className="text-sm sm:text-[15px] leading-relaxed text-slate-500 font-medium mt-2 sm:mt-3 max-w-2xl">
                Discover verified Sarkari Naukri opportunities across SSC, UPSC, Banking, Railways and more — curated for your next move.
              </p>
            </div>
            <div className="flex items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 w-full lg:w-auto">
              <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">◈</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400 leading-none">Total openings</p>
                  <p className="text-lg font-extrabold tracking-tight text-slate-900 leading-none mt-1 truncate">{loading ? '—' : pagination.total.toLocaleString()} jobs{totalPosts > 0 && ` • ${totalPosts.toLocaleString()} posts`}</p>
                </div>
              </div>
              {/* mobile total — compact, no overflow */}
              <div className="sm:hidden flex-1 min-w-0 flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0">◈</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 leading-none">Openings</p>
                  <p className="text-sm font-extrabold tracking-tight text-slate-900 leading-none mt-1 truncate">{loading ? '—' : pagination.total.toLocaleString()} jobs</p>
                </div>
              </div>
              <Link
                to="/chat"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold shadow-md text-[13px] sm:text-sm hover:shadow-lg transition whitespace-nowrap shrink-0"
              >
                ✦ Ask AI
              </Link>
              <button
                className="md:hidden inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold shadow-md text-[13px] sm:text-sm whitespace-nowrap shrink-0"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M7 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                {showFilters ? 'Hide' : 'Filters'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-5 sm:gap-6 lg:gap-8 items-stretch md:items-start">
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-[340px] lg:w-[360px] flex-shrink-0 md:sticky md:top-[88px] md:max-h-[85vh] md:overflow-y-auto overscroll-contain`}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[13px] font-extrabold tracking-widest uppercase text-slate-900">Filters</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Refine your search</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c2.4 0 4.5 1.5 5.4 3.7L22 12l-4.6 5.3A6 6 0 0112 21a6 6 0 01-5.4-3.7L2 12l4.6-5.3A6 6 0 0112 3z" /></svg>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <JobFilter filters={filters} onFilterChange={handleFilterChange} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 sm:p-6 text-white shadow-lg shadow-slate-900/20 overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <p className="text-xs font-bold tracking-widest uppercase text-white/60">Pro tip</p>
              <p className="text-[13px] sm:text-sm font-semibold leading-relaxed mt-2 text-white/95">
                Set up deadline alerts to never miss an application closing date.
              </p>
              <p className="text-xs text-white/60 mt-3 font-medium">Notifications → Enable in your profile.</p>
            </div>
          </aside>
          <div className="flex-1 min-w-0 w-full">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-8 sm:p-12 flex justify-center">
                <Loader />
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 sm:p-8">
                <EmptyState title="No jobs found" description="Try adjusting your filters to see more results" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4 px-1">
                  <p className="text-[13px] sm:text-sm font-semibold text-slate-600 min-w-0">
                    Showing <span className="font-extrabold text-slate-900">{jobs.length}</span> of <span className="font-extrabold text-slate-900">{pagination.total.toLocaleString()}</span> openings
                  </p>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-slate-400 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Updated just now
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:gap-6 min-w-0">
                  {jobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
                <div className="mt-6 sm:mt-8 flex justify-center min-w-0">
                  <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-3 py-3 sm:px-6 sm:py-4 w-full sm:w-auto max-w-full overflow-hidden">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Jobs;
