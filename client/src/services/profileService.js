import api from './api';

const profileService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateNotificationPreferences: (data) => api.patch('/users/notification-preferences', data),
  changePassword: (data) => api.put('/users/change-password', data),
};

export default profileService;
