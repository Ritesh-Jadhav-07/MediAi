import api from '../api/axios';

export const authService = {
  registerPatient(payload) {
    return api.post('/auth/register/patient', payload);
  },

  registerDoctor(payload) {
    return api.post('/auth/register/doctor', payload);
  },

  login(payload) {
    return api.post('/auth/login', payload);
  },

  logout() {
    return api.post('/auth/logout');
  },

  me() {
    return api.get('/auth/me');
  },
};
