import api from '../api/axios';

export const patientService = {
  getProfile() {
    return api.get('/patient/profile');
  },

  updateProfile(payload) {
    return api.patch('/patient/profile', payload);
  },

  getDoctors(params = {}) {
    const query = {};
    if (params.specialization) query.specialization = params.specialization;
    if (params.search) query.search = params.search;
    return api.get('/patient/doctors', { params: query });
  },
};
