import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

export default function AdminVerificationHistoryPage() {
  return (
    <div>
      <PageHeader
        title="Verification history"
        description="History is stored per doctor, not as a global feed."
      />
      <Card>
        <Alert variant="info" title="Pending backend">
          There is no administrator endpoint that lists verification events across all doctors.
          History is available on each doctor record via GET /admin/doctors/:doctorId/verification-history.
        </Alert>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Open a pending application to review credentials, approve or reject with a reason, and
          inspect that doctor’s audit trail.
        </p>
        <Link to="/admin/doctors">
          <Button className="mt-5">Go to pending doctors</Button>
        </Link>
      </Card>
    </div>
  );
}
