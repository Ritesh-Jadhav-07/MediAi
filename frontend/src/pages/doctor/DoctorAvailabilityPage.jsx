import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Modal, { ConfirmFooter } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { doctorService } from '../../services/doctor.service';
import { DAYS_OF_WEEK } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errors';
import { formatDay } from '../../utils/format';

const emptyForm = { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' };

export default function DoctorAvailabilityPage() {
  const [status, setStatus] = useState(null);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const profileRes = await doctorService.getProfile();
    const doctor = profileRes.data.data;
    setStatus(doctor.verificationStatus);
    if (doctor.verificationStatus === 'VERIFIED') {
      const availabilityRes = await doctorService.getAvailability();
      setSlots(availabilityRes.data.data || []);
    } else {
      setSlots([]);
    }
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

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await doctorService.createAvailability(form);
      setSuccess(data.message);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create availability.'));
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await doctorService.updateAvailability(editing._id, {
        dayOfWeek: editing.dayOfWeek,
        startTime: editing.startTime,
        endTime: editing.endTime,
      });
      setSuccess(data.message);
      setEditing(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update availability.'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await doctorService.deleteAvailability(removing._id);
      setSuccess(data.message);
      setRemoving(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to remove availability.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader label="Loading availability" />;

  const verified = status === 'VERIFIED';
  const visibleSlots = slots.filter((slot) => slot.isActive !== false);

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Weekly slots are stored on your doctor record. Only verified clinicians can create or change them."
      />
      <Alert variant="error" className="mb-4">{error}</Alert>
      <Alert variant="success" className="mb-4">{success}</Alert>

      {!verified && (
        <Alert variant="warning" title="Verification required">
          Only verified doctors can create availability. Current status: {status || 'unknown'}.
        </Alert>
      )}

      {verified && (
        <Card className="mb-6">
          <CardHeader title="Add a slot" description="Times use 24-hour format (HH:MM)." />
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={onCreate}>
            <Select id="dayOfWeek" name="dayOfWeek" label="Day" value={form.dayOfWeek} onChange={onChange}>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {formatDay(day)}
                </option>
              ))}
            </Select>
            <Input
              id="startTime"
              name="startTime"
              type="time"
              label="Start"
              required
              value={form.startTime}
              onChange={onChange}
            />
            <Input
              id="endTime"
              name="endTime"
              type="time"
              label="End"
              required
              value={form.endTime}
              onChange={onChange}
            />
            <div className="flex items-end">
              <Button type="submit" loading={saving} className="w-full">
                Add slot
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false}>
        <Table
          rowKey={(row) => row._id}
          rows={verified ? visibleSlots : []}
          empty={
            <EmptyState
              title={verified ? 'No availability yet' : 'Availability is locked'}
              description={
                verified
                  ? 'Add your first weekly slot using the form above.'
                  : 'Complete verification to manage clinic hours.'
              }
            />
          }
          columns={[
            {
              key: 'dayOfWeek',
              header: 'Day',
              render: (row) => formatDay(row.dayOfWeek),
            },
            { key: 'startTime', header: 'Start' },
            { key: 'endTime', header: 'End' },
            {
              key: 'actions',
              header: '',
              render: (row) =>
                verified ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...row })}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRemoving(row)}>
                      Remove
                    </Button>
                  </div>
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(editing)}
        title="Update slot"
        onClose={() => setEditing(null)}
        footer={
          <ConfirmFooter
            confirmLabel="Save"
            onCancel={() => setEditing(null)}
            onConfirm={onUpdate}
            loading={busy}
          />
        }
      >
        {editing && (
          <div className="grid gap-3">
            <Select
              id="edit-day"
              label="Day"
              value={editing.dayOfWeek}
              onChange={(event) => setEditing((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {formatDay(day)}
                </option>
              ))}
            </Select>
            <Input
              id="edit-start"
              type="time"
              label="Start"
              value={editing.startTime}
              onChange={(event) => setEditing((prev) => ({ ...prev, startTime: event.target.value }))}
            />
            <Input
              id="edit-end"
              type="time"
              label="End"
              value={editing.endTime}
              onChange={(event) => setEditing((prev) => ({ ...prev, endTime: event.target.value }))}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(removing)}
        title="Remove availability"
        onClose={() => setRemoving(null)}
        footer={
          <ConfirmFooter
            danger
            confirmLabel="Remove slot"
            onCancel={() => setRemoving(null)}
            onConfirm={onDelete}
            loading={busy}
          />
        }
      >
        <p className="text-sm text-slate-600">
          This slot will be deactivated. You can add a new one later if needed.
        </p>
      </Modal>
    </div>
  );
}
