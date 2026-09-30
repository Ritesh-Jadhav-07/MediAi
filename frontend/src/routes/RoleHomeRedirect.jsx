import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardPathForRole } from '../utils/format';
import { PageLoader } from '../components/ui/Spinner';

export default function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPathForRole(user.role)} replace />;
}
