import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Spinner';
import { adminService } from '../../services/admin.service';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await adminService.getPendingDoctors();
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
  }, []);

  if (loading) return <PageLoader label="Loading pending doctors" />;

  return (
    <div>
      <PageHeader
        title="Pending doctors"
        description="Applications currently in PENDING status, ordered from earliest submission."
      />
      <Alert variant="error" className="mb-4">{error}</Alert>
      <Card padding={false}>
        <Table
          rowKey={(row) => row._id}
          rows={doctors}
          empty={
            <EmptyState
              title="No pending applications"
              description="New doctor registrations will appear here until they are approved or rejected."
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Doctor',
              render: (row) => (
                <div>
                  <p className="font-medium text-slate-900">{row.userId?.name || '—'}</p>
                  <p className="text-xs text-slate-500">{row.userId?.email}</p>
                </div>
              ),
            },
            { key: 'specialization', header: 'Specialization' },
            { key: 'registrationNumber', header: 'Registration' },
            {
              key: 'experience',
              header: 'Experience',
              render: (row) => `${row.experience} yrs`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <Badge status={row.verificationStatus} />,
            },
            {
              key: 'createdAt',
              header: 'Submitted',
              render: (row) => formatDate(row.createdAt),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="text-right">
                  <Link to={`/admin/doctors/${row._id}`}>
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
