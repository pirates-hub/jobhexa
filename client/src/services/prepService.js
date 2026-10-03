import api from './api';

const prepService = {
  getExams: () => api.get('/prep/exams'),
  getExamBySlug: (slug) => api.get(`/prep/exams/${slug}`),
  getSubjects: () => api.get('/prep/subjects'),
  getSubjectBySlug: (slug) => api.get(`/prep/subjects/${slug}`),
  getTopicBySlug: (slug) => api.get(`/prep/topics/${slug}`),
  getSavedResources: () => api.get('/prep/saved-resources'),
  saveResource: (id) => api.post(`/prep/saved-resources/${id}`),
  removeSavedResource: (id) => api.delete(`/prep/saved-resources/${id}`),
  getProgressBySubject: () => api.get('/prep/progress/by-subject'),
};

export default prepService;
