import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { authService } from '../../services/auth.service';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

const initial = { name: '', email: '', password: '' };

export default function RegisterPatientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (form.name.trim().length < 2) {
      setFieldErrors({ name: 'Name must be at least 2 characters long' });
      return;
    }
    if (form.password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters long' });
      return;
    }

    setSubmitting(true);
    try {
      await authService.registerPatient({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/login', {
        state: { registered: 'Your patient account is ready. Sign in to continue.' },
      });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Unable to register patient.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create a patient account"
      subtitle="You’ll be able to complete your medical profile after signing in."
      footer={
        <p>
          Already registered?{' '}
          <Link className="font-medium text-primary-700 hover:underline" to="/login">
            Sign in
          </Link>
          . Clinician?{' '}
          <Link className="font-medium text-primary-700 hover:underline" to="/register/doctor">
            Register as a doctor
          </Link>
          .
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert variant="error">{error}</Alert>
        <Input
          id="name"
          name="name"
          label="Full name"
          required
          value={form.name}
          onChange={onChange}
          error={fieldErrors.name}
        />
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          label="Email"
          required
          value={form.email}
          onChange={onChange}
          error={fieldErrors.email}
        />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          label="Password"
          required
          hint="At least 8 characters."
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
