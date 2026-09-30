import api from '../api/axios';

export const doctorService = {
  getProfile() {
    return api.get('/doctor/profile');
  },

  resubmitProfile(payload) {
    return api.patch('/doctor/profile', payload);
  },

  getAvailability() {
    return api.get('/doctor/availability');
  },

  createAvailability(payload) {
    return api.post('/doctor/availability', payload);
  },

  updateAvailability(availabilityId, payload) {
    return api.patch(`/doctor/availability/${availabilityId}`, payload);
  },

  deleteAvailability(availabilityId) {
    return api.delete(`/doctor/availability/${availabilityId}`);
  },
};
