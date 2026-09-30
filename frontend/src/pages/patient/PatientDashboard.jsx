import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { patientService } from '../../services/patient.service';
import { getErrorMessage } from '../../utils/errors';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [doctorsCount, setDoctorsCount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [profileRes, doctorsRes] = await Promise.all([
          patientService.getProfile(),
          patientService.getDoctors(),
        ]);
        if (!mounted) return;
        setProfile(profileRes.data.data);
        setDoctorsCount(doctorsRes.data.count ?? doctorsRes.data.data?.length ?? 0);
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

  const completeness = [
    profile?.phone,
    profile?.dateOfBirth,
    profile?.gender,
    profile?.bloodGroup,
    profile?.address,
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Review your profile completeness and browse verified doctors."
      />
      <Alert variant="error" className="mb-6">
        {error}
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-slate-500">Account</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{user?.name}</p>
          <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
          <div className="mt-4">
            <Badge status={user?.accountStatus || 'ACTIVE'} />
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Profile completeness</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{completeness}/5</p>
          <p className="mt-1 text-sm text-slate-500">Phone, date of birth, gender, blood group, and address.</p>
          <Link to="/patient/profile">
            <Button className="mt-5" variant="outline" size="sm">
              Update profile
            </Button>
          </Link>
        </Card>
        <Card className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-500">Verified directory</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {doctorsCount ?? '—'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Doctors shown here have already passed administrator verification.
          </p>
          <Link to="/patient/doctors">
            <Button className="mt-5" size="sm">
              Explore doctors
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
