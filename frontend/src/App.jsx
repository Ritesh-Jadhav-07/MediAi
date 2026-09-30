import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import GuestRoute from './routes/GuestRoute';
import RoleHomeRedirect from './routes/RoleHomeRedirect';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPatientPage from './pages/auth/RegisterPatientPage';
import RegisterDoctorPage from './pages/auth/RegisterDoctorPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientProfilePage from './pages/patient/PatientProfilePage';
import PatientDoctorsPage from './pages/patient/PatientDoctorsPage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import DoctorAvailabilityPage from './pages/doctor/DoctorAvailabilityPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDoctorsPage from './pages/admin/AdminDoctorsPage';
import AdminDoctorDetailPage from './pages/admin/AdminDoctorDetailPage';
import AdminVerificationHistoryPage from './pages/admin/AdminVerificationHistoryPage';
import NotFoundPage from './pages/NotFoundPage';
import { ROLES } from './utils/constants';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/patient" element={<RegisterPatientPage />} />
            <Route path="/register/doctor" element={<RegisterDoctorPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<RoleHomeRedirect />} />
            <Route element={<AppLayout />}>
              <Route element={<RoleRoute roles={[ROLES.PATIENT]} />}>
                <Route path="/patient/dashboard" element={<PatientDashboard />} />
                <Route path="/patient/profile" element={<PatientProfilePage />} />
                <Route path="/patient/doctors" element={<PatientDoctorsPage />} />
              </Route>

              <Route element={<RoleRoute roles={[ROLES.DOCTOR]} />}>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/profile" element={<DoctorProfilePage />} />
                <Route path="/doctor/availability" element={<DoctorAvailabilityPage />} />
              </Route>

              <Route element={<RoleRoute roles={[ROLES.ADMIN]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
                <Route path="/admin/doctors/:id" element={<AdminDoctorDetailPage />} />
                <Route path="/admin/verification-history" element={<AdminVerificationHistoryPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/register" element={<Navigate to="/register/patient" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
