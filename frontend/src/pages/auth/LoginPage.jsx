import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { useAuth } from '../../hooks/useAuth';
import { dashboardPathForRole } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.registered || '');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await login({
        email: form.email.trim(),
        password: form.password,
      });
      const role = response?.data?.user?.role;
      const from = location.state?.from;
      navigate(from || dashboardPathForRole(role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to MediAI"
      subtitle="Use the email and password associated with your account."
      footer={
        <p>
          New here?{' '}
          <Link className="font-medium text-primary-700 hover:underline" to="/register/patient">
            Create a patient account
          </Link>{' '}
          or{' '}
          <Link className="font-medium text-primary-700 hover:underline" to="/register/doctor">
            register as a doctor
          </Link>
          .
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert variant="success">{notice}</Alert>
        <Alert variant="error">{error}</Alert>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          label="Email"
          required
          value={form.email}
          onChange={onChange}
        />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          label="Password"
          required
          value={form.password}
          onChange={onChange}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
