import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardPathForRole } from '../utils/format';
import { PageLoader } from '../components/ui/Spinner';

export default function GuestRoute() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <PageLoader />;
  if (isAuthenticated) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }
  return <Outlet />;
}
