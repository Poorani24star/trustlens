import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from '../Button';
import PasswordInput from '../PasswordInput';
import Toast from '../ui/Toast';

const MIN_LENGTH = 8;

function validate(current, next, confirm) {
  const errors = {};
  if (!current) errors.current = 'Please enter your current password.';
  if (!next) errors.next = 'Please enter a new password.';
  else if (next.length < MIN_LENGTH)
    errors.next = `Password must be at least ${MIN_LENGTH} characters.`;
  if (!confirm) errors.confirm = 'Please confirm your new password.';
  else if (next && confirm && next !== confirm)
    errors.confirm = 'Passwords do not match.';
  return errors;
}

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState({});
  const [toast, setToast]       = useState(null);

  const overlayRef = useRef(null);
  const firstInputRef = useRef(null);

  // Focus first input on open
  useEffect(() => { firstInputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(current, next, confirm);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Mock success — replace with API call when backend is ready
    onSuccess();
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="pwd-modal-title" className="text-base font-semibold text-slate-900">
            Change Password
          </h2>
          <button
            onClick={onClose}
            aria-label="Close change password dialog"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100
              focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {toast && (
            <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
          )}

          <PasswordInput
            ref={firstInputRef}
            label="Current Password"
            id="pwd-current"
            name="current"
            autoComplete="current-password"
            placeholder="Enter your current password"
            value={current}
            onChange={e => { setCurrent(e.target.value); if (errors.current) setErrors(p => ({ ...p, current: '' })); }}
            error={errors.current}
          />

          <PasswordInput
            label="New Password"
            id="pwd-new"
            name="new"
            autoComplete="new-password"
            placeholder={`At least ${MIN_LENGTH} characters`}
            value={next}
            onChange={e => { setNext(e.target.value); if (errors.next) setErrors(p => ({ ...p, next: '' })); }}
            error={errors.next}
          />

          <PasswordInput
            label="Confirm New Password"
            id="pwd-confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); if (errors.confirm) setErrors(p => ({ ...p, confirm: '' })); }}
            error={errors.confirm}
          />

          {/* Footer */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm">Update Password</Button>
            <Button type="button" size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
