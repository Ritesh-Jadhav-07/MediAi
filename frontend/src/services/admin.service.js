import api from '../api/axios';

export const adminService = {
  getPendingDoctors() {
    return api.get('/admin/doctors/pending');
  },

  getDoctorDetails(doctorId) {
    return api.get(`/admin/doctors/${doctorId}`);
  },

  approveDoctor(doctorId) {
    return api.patch(`/admin/doctors/${doctorId}/approve`);
  },

  rejectDoctor(doctorId, rejectionReason) {
    return api.patch(`/admin/doctors/${doctorId}/reject`, { rejectionReason });
  },

  getVerificationHistory(doctorId) {
    return api.get(`/admin/doctors/${doctorId}/verification-history`);
  },
};
