import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import RoleCard from '../components/RoleCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  {
    value: 'student',
    title: 'Student',
    description: 'I use TrustLens to verify assignments, projects and documents.',
    icon: '🎓',
  },
  {
    value: 'faculty',
    title: 'Faculty',
    description: 'I review student work and documents.',
    icon: '🏫',
  },
  {
    value: 'researcher',
    title: 'Researcher',
    description: 'I analyze and verify research-related documents.',
    icon: '🔬',
  },
];

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter your full name.';
  if (!form.email.trim()) errors.email = 'Please enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address.';
  if (!form.password) errors.password = 'Please enter a password.';
  else if (!PASSWORD_REGEX.test(form.password))
    errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!form.role) errors.role = 'Please select your role.';
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
    if (serverError) setServerError('');
  }

  function handleRole(value) {
    setForm(f => ({ ...f, role: value }));
    if (errors.role) setErrors(e => ({ ...e, role: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, role: form.role });
      setSuccess(true);
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout
        heading="You're all set."
        subheading="Your account has been created. Sign in to start using TrustLens."
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto" aria-hidden="true">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Account created successfully.</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome to TrustLens, {form.name.split(' ')[0]}.</p>
          </div>
          <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
            Continue to TrustLens
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Start verifying documents today."
      subheading="Create your account and access TrustLens's document analysis tools."
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create your TrustLens account</h1>
          <p className="text-sm text-slate-500 mt-1">Tell us a little about yourself to personalize your experience.</p>
        </div>

        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <span aria-hidden="true" className="mt-0.5 flex-shrink-0">⚠</span>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Full Name"
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <PasswordInput
            label="Password"
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <PasswordInput
            label="Confirm Password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />

          {/* Role selection */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">What best describes you?</legend>
            <div className="space-y-2" role="radiogroup" aria-required="true">
              {ROLES.map(r => (
                <RoleCard
                  key={r.value}
                  id={`role-${r.value}`}
                  value={r.value}
                  selected={form.role === r.value}
                  onChange={handleRole}
                  title={r.title}
                  description={r.description}
                  icon={r.icon}
                />
              ))}
            </div>
            {errors.role && (
              <p role="alert" className="text-xs text-red-600 flex items-center gap-1">
                <span aria-hidden="true">⚠</span> {errors.role}
              </p>
            )}
            <p className="text-xs text-slate-400 pt-1">
              Administrator accounts require authorization and cannot be self-registered.
            </p>
          </fieldset>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
