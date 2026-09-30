import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardPathForRole } from '../utils/format';
import { PageLoader } from '../components/ui/Spinner';

export default function RoleRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }
  return <Outlet />;
}
