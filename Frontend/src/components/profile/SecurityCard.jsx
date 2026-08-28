import { useState } from 'react';
import { ShieldCheck, KeyRound } from 'lucide-react';
import Button from '../Button';
import Toast from '../ui/Toast';
import ChangePasswordModal from './ChangePasswordModal';

export default function SecurityCard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  function handleSuccess() {
    setModalOpen(false);
    setToast({ message: 'Password updated successfully.', variant: 'success' });
  }

  return (
    <>
      <section aria-labelledby="security-heading" className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <h3 id="security-heading" className="text-base font-semibold text-slate-900">Security</h3>
        </div>

        {toast && (
          <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
        )}

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0" aria-hidden="true">
              <KeyRound className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800">Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Keep your account secure with a strong password.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            aria-label="Open change password dialog"
            className="shrink-0"
          >
            Change Password
          </Button>
        </div>
      </section>

      {modalOpen && (
        <ChangePasswordModal
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
