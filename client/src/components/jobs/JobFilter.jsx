import { EXAM_TYPES, INDIAN_STATES, CATEGORIES, QUALIFICATIONS } from '../../utils/constants';

function JobFilter({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onFilterChange({
      search: '',
      examType: '',
      state: '',
      category: '',
      qualification: '',
      department: '',
      organization: '',
      jobStatus: '',
      sortBy: 'newest',
      page: 1,
      limit: 10,
    });
  };

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h3 className="font-semibold text-gray-800 text-[15px] sm:text-base">Filters</h3>
        <button onClick={clearAll} className="text-[13px] sm:text-sm text-primary-600 hover:underline shrink-0 px-2 py-1 -mr-2 min-h-[32px]">
          Clear All
        </button>
      </div>

      <div className="space-y-3.5 sm:space-y-4 min-w-0">
        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            placeholder="Search jobs..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full min-w-0 bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400 placeholder:text-sm"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Exam Type</label>
          <select
            value={filters.examType || ''}
            onChange={(e) => handleChange('examType', e.target.value)}
            className="w-full min-w-0 max-w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 truncate"
          >
            <option value="">All Types</option>
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">State</label>
          <select
            value={filters.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full min-w-0 max-w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 truncate"
          >
            <option value="">All States</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full min-w-0 max-w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 truncate"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Qualification</label>
          <select
            value={filters.qualification || ''}
            onChange={(e) => handleChange('qualification', e.target.value)}
            className="w-full min-w-0 max-w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 truncate"
          >
            <option value="">All Qualifications</option>
            {QUALIFICATIONS.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Department / Organization</label>
          <input
            type="text"
            placeholder="e.g. Railway, SSC, UPSC…"
            value={filters.department || filters.organization || ''}
            onChange={(e) => handleChange('department', e.target.value)}
            className="w-full min-w-0 bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400 placeholder:text-sm"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.jobStatus || ''}
            onChange={(e) => handleChange('jobStatus', e.target.value)}
            className="w-full min-w-0 max-w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 truncate"
          >
            <option value="">Active + Upcoming + Closing Soon</option>
            <option value="active">Active</option>
            <option value="closing_soon">Closing Soon (≤3 days)</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Expired / Closed</option>
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[13px] sm:text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={filters.sortBy || 'newest'}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="w-full min-w-0 max-w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 truncate"
          >
            <option value="newest">Newest First</option>
            <option value="deadline">Deadline Soon</option>
            <option value="vacancies">Most Vacancies</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default JobFilter;
