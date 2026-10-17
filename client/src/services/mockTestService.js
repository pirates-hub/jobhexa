import api from './api';

const mockTestService = {
  getMockTests: () => api.get('/mock-tests'),
  getMockTest: (slug) => api.get(`/mock-tests/${slug}`),
  submitMockTest: (slug, payload) => api.post(`/mock-tests/${slug}/submit`, payload),
};

export default mockTestService;
