import api from './api';

const jobService = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJobBySlug: (slug) => api.get(`/jobs/${slug}`),
  getJobsByExamType: (examType) => api.get(`/jobs/by-exam/${examType}`),
  getJobsByState: (state) => api.get(`/jobs/by-state/${state}`),
  getUpcomingDeadlines: () => api.get('/jobs/upcoming-deadlines'),
};

export default jobService;
