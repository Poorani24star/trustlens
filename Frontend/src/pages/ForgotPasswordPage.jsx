import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import { requestPasswordReset, resetUserPasswordDirect } from '../services/authService';

const DEMO_EMAILS = [
  { label: 'Student', email: 'student@demo.com' },
  { label: 'Faculty / Researcher', email: 'faculty1@example.com' },
  { label: 'Admin', email: 'admin@demo.com' },
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Tab mode: 'request' | 'reset'
  const [tab, setTab] = useState('request');

  // Request Reset Link state
  const [requestEmail, setRequestEmail] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  // Direct Reset state
  const [resetForm, setResetForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [resetErrors, setResetErrors] = useState({});
  const [resetServerError, setResetServerError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Quick fill helper
  function handleFillDemo(email) {
    if (tab === 'request') {
      setRequestEmail(email);
      setRequestError('');
      setRequestSuccess('');
    } else {
      setResetForm(f => ({ ...f, email }));
      setResetErrors(e => ({ ...e, email: '' }));
      setResetServerError('');
    }
  }

  // Handle Request Link submit
  async function handleRequestSubmit(e) {
    e.preventDefault();
    const trimmed = requestEmail.trim();
    if (!trimmed) {
      setRequestError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setRequestError('Please enter a valid email address.');
      return;
    }

    setRequestLoading(true);
    setRequestError('');
    setRequestSuccess('');

    try {
      const res = await requestPasswordReset(trimmed);
      setRequestSuccess(res.message || `Password reset instructions sent to ${trimmed}.`);
    } catch (err) {
      setRequestError(err.message || 'Unable to process reset request. Please check your email.');
    } finally {
      setRequestLoading(false);
    }
  }

  // Handle Direct Reset submit
  async function handleResetSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!resetForm.email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetForm.email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!resetForm.newPassword) {
      errs.newPassword = 'Please enter a new password.';
    } else if (
      resetForm.newPassword.length < 8 ||
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(resetForm.newPassword)
    ) {
      errs.newPassword = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
    }

    if (!resetForm.confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.';
    } else if (resetForm.newPassword !== resetForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errs).length > 0) {
      setResetErrors(errs);
      return;
    }

    setResetLoading(true);
    setResetServerError('');
    setResetSuccess('');

    try {
      const res = await resetUserPasswordDirect(resetForm);
      if (res && res.success) {
        setResetSuccess(res.message || 'Password has been successfully updated!');
      } else {
        setResetServerError(res?.message || 'Failed to update password.');
      }
    } catch (err) {
      setResetServerError(err.message || 'Unable to reset password. Please verify your details.');
    } finally {
      setResetLoading(false);
    }
  }

  const hasLength = resetForm.newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(resetForm.newPassword);
  const hasLower = /[a-z]/.test(resetForm.newPassword);
  const hasNumber = /\d/.test(resetForm.newPassword);

  return (
    <AuthLayout
      heading="Recover your TrustLens account."
      subheading="Get back to verifying documents with confidence. Choose between receiving email instructions or setting a new password directly."
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7 sm:p-8 space-y-6">
        <div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
          <p className="text-sm text-slate-500 mt-1">
            No worries! Follow the steps below to regain access to your account.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('request')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'request'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Send Reset Link
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('reset');
              if (requestEmail && !resetForm.email) {
                setResetForm(f => ({ ...f, email: requestEmail }));
              }
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'reset'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Direct Password Reset
          </button>
        </div>

        {/* TAB 1: Send Reset Link */}
        {tab === 'request' && (
          <div className="space-y-4">
            {requestSuccess ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                    ✓
                  </span>
                  <p className="text-sm font-semibold">Instructions Sent!</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {requestSuccess} Please check your inbox and follow the steps provided.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('reset');
                      setResetForm(f => ({ ...f, email: requestEmail }));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Set New Password Directly →
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} noValidate className="space-y-4">
                {requestError && (
                  <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    <span aria-hidden="true" className="mt-0.5 shrink-0">⚠</span>
                    {requestError}
                  </div>
                )}

                <Input
                  label="Registered Email"
                  id="requestEmail"
                  name="requestEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={requestEmail}
                  onChange={(e) => {
                    setRequestEmail(e.target.value);
                    if (requestError) setRequestError('');
                  }}
                  error={requestError}
                />

                <Button type="submit" className="w-full" size="lg" disabled={requestLoading}>
                  {requestLoading ? 'Sending link…' : 'Send Password Reset Link'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Direct Reset */}
        {tab === 'reset' && (
          <div className="space-y-4">
            {resetSuccess ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                    ✓
                  </span>
                  <p className="text-sm font-semibold">Password Reset Complete!</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your password has been successfully updated. You can now use your new password to sign into your TrustLens workspace.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Proceed to Login →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
                {resetServerError && (
                  <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    <span aria-hidden="true" className="mt-0.5 shrink-0">⚠</span>
                    {resetServerError}
                  </div>
                )}

                <Input
                  label="Account Email"
                  id="resetEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={resetForm.email}
                  onChange={(e) => {
                    setResetForm(f => ({ ...f, email: e.target.value }));
                    if (resetErrors.email) setResetErrors(e => ({ ...e, email: '' }));
                    if (resetServerError) setResetServerError('');
                  }}
                  error={resetErrors.email}
                />

                <div className="space-y-2">
                  <PasswordInput
                    label="New Password"
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={resetForm.newPassword}
                    onChange={(e) => {
                      setResetForm(f => ({ ...f, newPassword: e.target.value }));
                      if (resetErrors.newPassword) setResetErrors(e => ({ ...e, newPassword: '' }));
                      if (resetServerError) setResetServerError('');
                    }}
                    error={resetErrors.newPassword}
                  />

                  {/* Password Strength Checklist */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 grid grid-cols-2 gap-1.5">
                    <span className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <span>{hasLength ? '✓' : '○'}</span> 8+ Characters
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <span>{hasUpper ? '✓' : '○'}</span> Uppercase letter
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <span>{hasLower ? '✓' : '○'}</span> Lowercase letter
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <span>{hasNumber ? '✓' : '○'}</span> One number
                    </span>
                  </div>
                </div>

                <PasswordInput
                  label="Confirm New Password"
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={resetForm.confirmPassword}
                  onChange={(e) => {
                    setResetForm(f => ({ ...f, confirmPassword: e.target.value }));
                    if (resetErrors.confirmPassword) setResetErrors(e => ({ ...e, confirmPassword: '' }));
                    if (resetServerError) setResetServerError('');
                  }}
                  error={resetErrors.confirmPassword}
                />

                <Button type="submit" className="w-full" size="lg" disabled={resetLoading}>
                  {resetLoading ? 'Updating password…' : 'Reset Password'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Demo Quick Accounts */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-1.5 text-center">Quick Demo Accounts (click to fill email):</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {DEMO_EMAILS.map(({ label, email }) => (
              <button
                key={email}
                type="button"
                onClick={() => handleFillDemo(email)}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-medium transition-colors text-[11px] shadow-xs cursor-pointer"
              >
                <span className="font-semibold text-blue-600">{label}</span>: {email}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>←</span> Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
