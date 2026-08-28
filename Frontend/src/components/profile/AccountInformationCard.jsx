import { CheckCircle } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles';

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-slate-50 last:border-0">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide sm:w-36 shrink-0">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

export default function AccountInformationCard({ role, memberSince }) {
  return (
    <section aria-labelledby="account-info-heading" className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-1">
      <h3 id="account-info-heading" className="text-base font-semibold text-slate-900 mb-3">
        Account Information
      </h3>

      <InfoRow label="Account Status">
        <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
          Active
        </span>
      </InfoRow>

      <InfoRow label="Account Type">
        <span className="font-medium">{ROLE_LABELS[role] ?? role}</span>
      </InfoRow>

      <InfoRow label="Member Since">
        <span>{memberSince}</span>
      </InfoRow>
    </section>
  );
}
