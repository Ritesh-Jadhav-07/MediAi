import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { doctorService } from '../../services/doctor.service';
import { getErrorMessage } from '../../utils/errors';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await doctorService.getProfile();
        if (mounted) setProfile(data.data);
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

  if (loading) return <PageLoader label="Loading your dashboard" />;

  const status = profile?.verificationStatus;

  return (
    <div>
      <PageHeader
        title={`Welcome, Dr. ${user?.name?.split(' ')[0] || ''}`}
        description="Your workspace reflects your current verification status. You are not listed as verified until an administrator approves your credentials."
      />
      <Alert variant="error" className="mb-6">{error}</Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-sm font-medium text-slate-500">Verification</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge status={status}>{status}</Badge>
            {status === 'PENDING' && (
              <p className="text-sm text-slate-600">
                Your application is waiting for administrator review.
              </p>
            )}
            {status === 'REJECTED' && (
              <p className="text-sm text-slate-600">
                Update your credentials on your profile and resubmit for review.
              </p>
            )}
            {status === 'VERIFIED' && (
              <p className="text-sm text-slate-600">
                You can publish weekly availability for patients to see in later booking flows.
              </p>
            )}
          </div>
          {profile?.rejectionReason && (
            <Alert variant="warning" className="mt-4" title="Rejection reason">
              {profile.rejectionReason}
            </Alert>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/doctor/profile">
              <Button variant="outline">View profile</Button>
            </Link>
            {status === 'VERIFIED' && (
              <Link to="/doctor/availability">
                <Button>Manage availability</Button>
              </Link>
            )}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Practice</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Specialization</dt>
              <dd className="font-medium text-slate-900">{profile?.specialization || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Experience</dt>
              <dd className="font-medium text-slate-900">
                {profile?.experience != null ? `${profile.experience} years` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Registration</dt>
              <dd className="font-medium text-slate-900">{profile?.registrationNumber || '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
