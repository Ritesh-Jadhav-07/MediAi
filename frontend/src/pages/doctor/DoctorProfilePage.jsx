import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { doctorService } from '../../services/doctor.service';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    qualification: '',
    specialization: '',
    registrationNumber: '',
    medicalCouncil: '',
    experience: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const { data } = await doctorService.getProfile();
    const doctor = data.data;
    setProfile(doctor);
    setForm({
      qualification: doctor.qualification || '',
      specialization: doctor.specialization || '',
      registrationNumber: doctor.registrationNumber || '',
      medicalCouncil: doctor.medicalCouncil || '',
      experience: doctor.experience ?? '',
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
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

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await doctorService.resubmitProfile({
        qualification: form.qualification.trim(),
        specialization: form.specialization.trim(),
        registrationNumber: form.registrationNumber.trim(),
        medicalCouncil: form.medicalCouncil.trim(),
        experience: Number(form.experience),
      });
      setProfile(data.data);
      setSuccess(data.message || 'Profile resubmitted successfully');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to resubmit profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading profile" />;

  const canResubmit = profile?.verificationStatus === 'REJECTED';
  const account = profile?.userId;

  return (
    <div>
      <PageHeader
        title="Doctor profile"
        description="Credential fields can be resubmitted only after a rejection."
      />
      <Alert variant="error" className="mb-4">{error}</Alert>
      <Alert variant="success" className="mb-4">{success}</Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader
            title="Credentials"
            description={
              canResubmit
                ? 'Correct the details below and resubmit. Status will return to pending.'
                : 'These fields are locked while your application is pending, under review, or already verified.'
            }
          />
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <Input
              id="qualification"
              name="qualification"
              label="Qualification"
              required
              disabled={!canResubmit}
              value={form.qualification}
              onChange={onChange}
            />
            <Input
              id="specialization"
              name="specialization"
              label="Specialization"
              required
              disabled={!canResubmit}
              value={form.specialization}
              onChange={onChange}
            />
            <Input
              id="registrationNumber"
              name="registrationNumber"
              label="Registration number"
              required
              disabled={!canResubmit}
              value={form.registrationNumber}
              onChange={onChange}
            />
            <Input
              id="medicalCouncil"
              name="medicalCouncil"
              label="Medical council"
              required
              disabled={!canResubmit}
              value={form.medicalCouncil}
              onChange={onChange}
            />
            <Input
              id="experience"
              name="experience"
              type="number"
              min="0"
              max="80"
              label="Years of experience"
              required
              disabled={!canResubmit}
              value={form.experience}
              onChange={onChange}
            />
            {canResubmit && (
              <div className="sm:col-span-2">
                <Button type="submit" loading={saving}>
                  Resubmit for verification
                </Button>
              </div>
            )}
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Verification status</h2>
            <div className="mt-3">
              <Badge status={profile?.verificationStatus} />
            </div>
            {profile?.rejectionReason && (
              <Alert variant="warning" className="mt-4" title="Rejection reason">
                {profile.rejectionReason}
              </Alert>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Reviewed at</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(profile?.reviewedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Reviewed by</dt>
                <dd className="font-medium text-slate-900">{profile?.reviewedBy?.name || '—'}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Account</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">{account?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{account?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Account status</dt>
                <dd className="font-medium text-slate-900">{account?.accountStatus || '—'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
