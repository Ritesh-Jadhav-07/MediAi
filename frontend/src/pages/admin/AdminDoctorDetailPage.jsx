import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Modal, { ConfirmFooter } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { adminService } from '../../services/admin.service';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime, titleCaseStatus } from '../../utils/format';

const ACTIONABLE = ['PENDING', 'UNDER_REVIEW', 'INFO_REQUIRED'];

export default function AdminDoctorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [detailsRes, historyRes] = await Promise.all([
      adminService.getDoctorDetails(id),
      adminService.getVerificationHistory(id),
    ]);
    setDoctor(detailsRes.data.data);
    setHistory(historyRes.data.data || []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
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
  }, [id]);

  const canAct = ACTIONABLE.includes(doctor?.verificationStatus);

  const onApprove = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await adminService.approveDoctor(id);
      setSuccess(data.message);
      setApproveOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve doctor.'));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await adminService.rejectDoctor(id, rejectionReason.trim());
      setSuccess(data.message);
      setRejectOpen(false);
      setRejectionReason('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reject doctor.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader label="Loading doctor details" />;

  if (!doctor) {
    return (
      <div>
        <Alert variant="error">{error || 'Doctor not found'}</Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/admin/doctors')}>
          Back to queue
        </Button>
      </div>
    );
  }

  const account = doctor.userId;

  return (
    <div>
      <PageHeader
        title={account?.name || 'Doctor details'}
        description={account?.email}
        actions={
          <Link to="/admin/doctors">
            <Button variant="outline">Back to queue</Button>
          </Link>
        }
      />
      <Alert variant="error" className="mb-4">{error}</Alert>
      <Alert variant="success" className="mb-4">{success}</Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Credentials" />
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Qualification</dt>
                <dd className="mt-1 font-medium text-slate-900">{doctor.qualification}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Specialization</dt>
                <dd className="mt-1 font-medium text-slate-900">{doctor.specialization}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Registration number</dt>
                <dd className="mt-1 font-medium text-slate-900">{doctor.registrationNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Medical council</dt>
                <dd className="mt-1 font-medium text-slate-900">{doctor.medicalCouncil}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Experience</dt>
                <dd className="mt-1 font-medium text-slate-900">{doctor.experience} years</dd>
              </div>
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="mt-1 font-medium text-slate-900">{formatDateTime(doctor.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card padding={false}>
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">Verification history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Audit trail for this doctor, newest first.
              </p>
            </div>
            <Table
              rowKey={(row) => row._id}
              rows={history}
              empty={
                <EmptyState
                  title="No history yet"
                  description="Approvals, rejections, and resubmissions will appear here."
                />
              }
              columns={[
                {
                  key: 'from',
                  header: 'From',
                  render: (row) => titleCaseStatus(row.previousStatus),
                },
                {
                  key: 'to',
                  header: 'To',
                  render: (row) => <Badge status={row.newStatus} />,
                },
                {
                  key: 'by',
                  header: 'Performed by',
                  render: (row) => (
                    <div>
                      <p className="font-medium">{row.performedBy?.name || '—'}</p>
                      <p className="text-xs text-slate-500">{row.performedByRole}</p>
                    </div>
                  ),
                },
                {
                  key: 'reason',
                  header: 'Reason',
                  render: (row) => row.reason || '—',
                },
                {
                  key: 'when',
                  header: 'When',
                  render: (row) => formatDateTime(row.createdAt),
                },
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Decision</h2>
            <div className="mt-3">
              <Badge status={doctor.verificationStatus} />
            </div>
            {doctor.rejectionReason && (
              <Alert variant="warning" className="mt-4" title="Current rejection reason">
                {doctor.rejectionReason}
              </Alert>
            )}
            <p className="mt-4 text-sm text-slate-500">
              Reviewed {formatDateTime(doctor.reviewedAt)}
              {doctor.reviewedBy?.name ? ` by ${doctor.reviewedBy.name}` : ''}.
            </p>
            {canAct ? (
              <div className="mt-5 grid gap-2">
                <Button onClick={() => setApproveOpen(true)}>Approve doctor</Button>
                <Button variant="danger" onClick={() => setRejectOpen(true)}>
                  Reject doctor
                </Button>
              </div>
            ) : (
              <Alert variant="info" className="mt-4">
                This application cannot be approved or rejected from {doctor.verificationStatus} status.
              </Alert>
            )}
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium text-slate-900">{account?.role}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Account status</dt>
                <dd className="font-medium text-slate-900">{account?.accountStatus}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={approveOpen}
        title="Approve this doctor?"
        onClose={() => setApproveOpen(false)}
        footer={
          <ConfirmFooter
            confirmLabel="Approve"
            onCancel={() => setApproveOpen(false)}
            onConfirm={onApprove}
            loading={busy}
          />
        }
      >
        <p className="text-sm text-slate-600">
          {account?.name} will be marked verified and can appear in the patient directory.
        </p>
      </Modal>

      <Modal
        open={rejectOpen}
        title="Reject this application"
        onClose={() => setRejectOpen(false)}
        footer={
          <ConfirmFooter
            danger
            confirmLabel="Reject"
            onCancel={() => setRejectOpen(false)}
            onConfirm={onReject}
            loading={busy}
          />
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          A reason is required. The doctor will see it and may resubmit their profile.
        </p>
        <Textarea
          id="rejectionReason"
          label="Rejection reason"
          required
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
