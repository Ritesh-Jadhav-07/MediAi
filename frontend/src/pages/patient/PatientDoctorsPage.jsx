import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui/Spinner';
import { patientService } from '../../services/patient.service';
import { getErrorMessage } from '../../utils/errors';

export default function PatientDoctorsPage() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [applied, setApplied] = useState({ search: '', specialization: '' });
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await patientService.getDoctors({
          search: applied.search || undefined,
          specialization: applied.specialization || undefined,
        });
        if (mounted) setDoctors(data.data || []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applied]);

  const onSubmit = (event) => {
    event.preventDefault();
    setApplied({
      search: search.trim(),
      specialization: specialization.trim(),
    });
  };

  return (
    <div>
      <PageHeader
        title="Verified doctors"
        description="Only administrators-approved clinicians appear in this directory."
      />

      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onSubmit}>
          <Input
            id="search"
            name="search"
            label="Search"
            placeholder="Name or specialization"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            id="specialization"
            name="specialization"
            label="Specialization filter"
            placeholder="e.g. Cardiology"
            value={specialization}
            onChange={(event) => setSpecialization(event.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              Apply
            </Button>
          </div>
        </form>
      </Card>

      <Alert variant="error" className="mb-4">{error}</Alert>

      {loading ? (
        <PageLoader label="Finding verified doctors" />
      ) : doctors.length === 0 ? (
        <Card padding={false}>
          <EmptyState
            title="No verified doctors found"
            description="Try a different search, or check back after more clinicians complete verification."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <Card key={doctor._id}>
              <div className="flex items-start gap-3">
                <Avatar name={doctor.userId?.name} src={doctor.userId?.profilePhoto} />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-slate-900">{doctor.userId?.name}</h2>
                  <p className="text-sm text-slate-500">{doctor.specialization}</p>
                </div>
                <Badge status="VERIFIED">Verified</Badge>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt>Qualification</dt>
                  <dd className="text-right font-medium text-slate-900">{doctor.qualification}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Experience</dt>
                  <dd className="font-medium text-slate-900">{doctor.experience} yrs</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Council</dt>
                  <dd className="text-right font-medium text-slate-900">{doctor.medicalCouncil}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
