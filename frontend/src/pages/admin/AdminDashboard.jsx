import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { adminService } from '../../services/admin.service';
import { getErrorMessage } from '../../utils/errors';

export default function AdminDashboard() {
  const [count, setCount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await adminService.getPendingDoctors();
        if (mounted) setCount(data.count ?? data.data?.length ?? 0);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <PageLoader label="Loading administration" />;

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Review doctor credentials before they appear in the patient directory."
      />
      <Alert variant="error" className="mb-6">{error}</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-slate-500">Pending applications</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{count ?? '—'}</p>
          <p className="mt-1 text-sm text-slate-500">
            Doctors with PENDING verification status, oldest first.
          </p>
          <Link to="/admin/doctors">
            <Button className="mt-5" size="sm">
              Review queue
            </Button>
          </Link>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Verification history</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Per doctor record</p>
          <p className="mt-1 text-sm text-slate-500">
            A platform-wide history list is not available yet. Open a doctor to view their audit trail.
          </p>
          <Link to="/admin/verification-history">
            <Button className="mt-5" size="sm" variant="outline">
              How it works
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
