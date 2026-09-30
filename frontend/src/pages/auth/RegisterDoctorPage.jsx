import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { authService } from '../../services/auth.service';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

const initial = {
  name: '',
  email: '',
  password: '',
  qualification: '',
  specialization: '',
  registrationNumber: '',
  medicalCouncil: '',
  experience: '',
};

export default function RegisterDoctorPage() {
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

    const experience = Number(form.experience);
    if (!Number.isInteger(experience) || experience < 0) {
      setFieldErrors({ experience: 'Experience must be a whole number of years (0–80).' });
      return;
    }
    if (form.password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters long' });
      return;
    }

    setSubmitting(true);
    try {
      await authService.registerDoctor({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        qualification: form.qualification.trim(),
        specialization: form.specialization.trim(),
        registrationNumber: form.registrationNumber.trim(),
        medicalCouncil: form.medicalCouncil.trim(),
        experience,
      });
      navigate('/login', {
        state: {
          registered:
            'Registration submitted. Your account remains pending verification until an administrator reviews it.',
        },
      });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Unable to register doctor.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Register as a doctor"
      subtitle="Credentials are reviewed by MediAI administrators. You will not be listed as verified immediately."
      footer={
        <p>
          Already registered?{' '}
          <Link className="font-medium text-primary-700 hover:underline" to="/login">
            Sign in
          </Link>
          . Patient?{' '}
          <Link className="font-medium text-primary-700 hover:underline" to="/register/patient">
            Create a patient account
          </Link>
          .
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert variant="error">{error}</Alert>
        <Input id="name" name="name" label="Full name" required value={form.name} onChange={onChange} error={fieldErrors.name} />
        <Input id="email" name="email" type="email" label="Email" required value={form.email} onChange={onChange} error={fieldErrors.email} />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          label="Password"
          required
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
        />
        <Input
          id="qualification"
          name="qualification"
          label="Qualification"
          required
          value={form.qualification}
          onChange={onChange}
          error={fieldErrors.qualification}
        />
        <Input
          id="specialization"
          name="specialization"
          label="Specialization"
          required
          value={form.specialization}
          onChange={onChange}
          error={fieldErrors.specialization}
        />
        <Input
          id="registrationNumber"
          name="registrationNumber"
          label="Registration number"
          required
          value={form.registrationNumber}
          onChange={onChange}
          error={fieldErrors.registrationNumber}
        />
        <Input
          id="medicalCouncil"
          name="medicalCouncil"
          label="Medical council"
          required
          value={form.medicalCouncil}
          onChange={onChange}
          error={fieldErrors.medicalCouncil}
        />
        <Input
          id="experience"
          name="experience"
          type="number"
          min="0"
          max="80"
          label="Years of experience"
          required
          value={form.experience}
          onChange={onChange}
          error={fieldErrors.experience}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Submit for verification
        </Button>
      </form>
    </AuthLayout>
  );
}
