import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../config/rolePermissions';
import { ROLE_LABELS, ROLE_COLORS } from '../constants/roles';

function validate(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = 'Please enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Please enter your password.';
  return errors;
}

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student@demo.com', password: 'password123', role: 'student' },
  { label: 'Faculty / Researcher', email: 'faculty1@example.com', password: 'Password123!', role: 'faculty_researcher' },
  { label: 'Admin', email: 'admin@demo.com', password: 'Password123!', role: 'admin' },
];

export default function LoginPage() {
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
    if (serverError) setServerError('');
  }

  function handleFillDemo(acc) {
    setForm({ email: acc.email, password: acc.password });
    setErrors({});
    setServerError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form.email, form.password);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const redirect = await login(form.email, form.password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to sign in. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  const normRole = normalizeRole(user?.role);
  const currentRoleLabel = ROLE_LABELS[normRole] || ROLE_LABELS[user?.role] || user?.role || 'User';
  const currentRoleBadgeColor = ROLE_COLORS[normRole] || ROLE_COLORS.student;

  return (
    <AuthLayout
      heading="Verify documents with confidence."
      subheading="Sign in to access your TrustLens workspace and start analyzing documents."
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue to TrustLens.</p>
        </div>

        {/* Active Session Notice & Switcher */}
        {user && (
          <div className="p-4 rounded-xl bg-slate-50 border border-blue-200/80 text-sm text-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Signed In As</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${currentRoleBadgeColor}`}>
                    {currentRoleLabel}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 mt-1 truncate max-w-[280px]">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(normRole === 'admin' ? '/admin/dashboard' : '/dashboard')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Go to Dashboard →
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setForm({ email: '', password: '' });
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 border-t border-slate-200/70 pt-2">
              To switch accounts, select a demo role below or enter credentials:
            </p>
          </div>
        )}

        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <span aria-hidden="true" className="mt-0.5 flex-shrink-0">⚠</span>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
          <div className="space-y-1">
            <PasswordInput
              label="Password"
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in…' : (user ? 'Switch Account & Sign In' : 'Login')}
          </Button>
        </form>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          onClick={() => alert('Google authentication will be available soon.')}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-slate-500">
          New to TrustLens?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {/* Demo quick-select shortcuts */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-600">
        <p className="font-medium text-slate-700 mb-2 text-center">Quick Demo Credentials (click to fill):</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleFillDemo(acc)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-medium transition-colors text-[11px] shadow-xs cursor-pointer"
            >
              <span className="font-semibold text-blue-600">{acc.label}</span>: {acc.email}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
