import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/Spinner';
import { patientService } from '../../services/patient.service';
import { BLOOD_GROUP_OPTIONS, GENDER_OPTIONS } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errors';
import { toDateInputValue } from '../../utils/format';

export default function PatientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
  });
  const [account, setAccount] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await patientService.getProfile();
        const patient = data.data;
        if (!mounted) return;
        setAccount(patient.userId);
        setForm({
          dateOfBirth: toDateInputValue(patient.dateOfBirth),
          gender: patient.gender || '',
          bloodGroup: patient.bloodGroup || '',
          phone: patient.phone || '',
          address: patient.address || '',
          emergencyName: patient.emergencyContact?.name || '',
          emergencyPhone: patient.emergencyContact?.phone || '',
          emergencyRelationship: patient.emergencyContact?.relationship || '',
        });
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
      const payload = {
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        phone: form.phone,
        address: form.address,
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relationship: form.emergencyRelationship,
        },
      };
      const { data } = await patientService.updateProfile(payload);
      setSuccess(data.message || 'Profile updated successfully');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading profile" />;

  return (
    <div>
      <PageHeader
        title="Your profile"
        description="These details stay on your patient record. Name and email are managed on your account."
      />
      <Alert variant="error" className="mb-4">{error}</Alert>
      <Alert variant="success" className="mb-4">{success}</Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader title="Clinical details" description="Optional, but helps clinicians understand you." />
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              label="Date of birth"
              value={form.dateOfBirth}
              onChange={onChange}
            />
            <Select id="gender" name="gender" label="Gender" value={form.gender} onChange={onChange}>
              <option value="">Select</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              id="bloodGroup"
              name="bloodGroup"
              label="Blood group"
              value={form.bloodGroup}
              onChange={onChange}
            >
              <option value="">Select</option>
              {BLOOD_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input id="phone" name="phone" label="Phone" value={form.phone} onChange={onChange} />
            <div className="sm:col-span-2">
              <Input id="address" name="address" label="Address" value={form.address} onChange={onChange} />
            </div>
            <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Emergency contact</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="emergencyName"
                  name="emergencyName"
                  label="Name"
                  value={form.emergencyName}
                  onChange={onChange}
                />
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  label="Phone"
                  value={form.emergencyPhone}
                  onChange={onChange}
                />
                <Input
                  id="emergencyRelationship"
                  name="emergencyRelationship"
                  label="Relationship"
                  value={form.emergencyRelationship}
                  onChange={onChange}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Save profile
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{account?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{account?.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-900">{account?.accountStatus || '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
