import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '../Button';
import { ROLE_LABELS } from '../../constants/roles';

/** Returns all focusable elements inside a container. */
function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function UserDetailsModal({ user, currentUser, onClose, onStatusChange, triggerRef }) {
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef(null);
  const closeRef  = useRef(null);

  // Focus the close button when the modal opens
  useEffect(() => { closeRef.current?.focus(); }, []);

  // Return focus to the triggering element when the modal closes
  useEffect(() => {
    return () => { triggerRef?.current?.focus(); };
  }, [triggerRef]);

  // Escape closes; Tab/Shift+Tab are trapped inside the dialog
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable(dialogRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!user) return null;

  const targetId    = user.id || user.userId;
  const isAdmin     = user.role === 'admin';
  const isSuspended = user.status === 'suspended';
  const isSelf      = Boolean(currentUser && (currentUser.uid === targetId || currentUser.email === user.email));

  let joinedDate = 'Not available';
  const rawJoined = user.createdAt || user.joined;
  if (rawJoined) {
    try {
      const d = new Date(rawJoined);
      joinedDate = isNaN(d.getTime()) ? String(rawJoined) : d.toLocaleDateString();
    } catch {
      joinedDate = 'Not available';
    }
  }

  const totalAnalyses = user.reportStats?.totalReports ?? user.totalAnalyses ?? 0;
  const displayName   = user.name || user.email?.split('@')[0] || 'Unnamed User';

  function handleAction() {
    if (isSelf) return;
    if (!isSuspended && !confirming) { setConfirming(true); return; }
    onStatusChange(targetId, isSuspended ? 'active' : 'suspended');
    setConfirming(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      aria-describedby={confirming ? 'user-modal-confirm-desc' : undefined}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className="bg-white rounded-2xl shadow-elevated w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="user-modal-title" className="text-base font-semibold text-slate-900">User Details</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Close user details"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {[
            ['Name',           displayName],
            ['Email',          user.email || 'No email'],
            ['Role',           ROLE_LABELS[user.role] ?? user.role],
            ['Member Since',   joinedDate],
            ['Total Analyses', totalAnalyses],
          ].map(([label, val]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b border-slate-50 last:border-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide sm:w-36 shrink-0">{label}</p>
              <p className="text-sm text-slate-800 font-medium">{val}</p>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide sm:w-36 shrink-0">Account Status</p>
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isSuspended ? 'text-amber-700' : 'text-green-700'}`}>
              {isSuspended
                ? <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                : <CheckCircle   className="w-4 h-4" aria-hidden="true" />}
              {isSuspended ? '⚠ Suspended' : '✓ Active'}
            </span>
          </div>

          {isSelf && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs text-blue-800">
              You cannot suspend your own active administrator account.
            </div>
          )}

          {confirming && (
            <div
              id="user-modal-confirm-desc"
              className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1"
              role="alert"
            >
              <p className="font-semibold">Suspend this account?</p>
              <p>This user will no longer be able to access protected TrustLens features.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          {confirming ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-600"
                onClick={handleAction}
              >
                Suspend User
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
              {!isAdmin && !isSelf && (
                <Button
                  size="sm"
                  variant={isSuspended ? 'primary' : 'outline'}
                  className={!isSuspended ? 'text-amber-700 border-amber-300 hover:bg-amber-50' : ''}
                  onClick={handleAction}
                >
                  {isSuspended ? 'Activate Account' : 'Suspend Account'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
