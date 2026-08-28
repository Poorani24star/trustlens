import Avatar from './Avatar';
import { ROLE_LABELS, ROLE_COLORS, ROLE_FALLBACK_COLOR } from '../../constants/roles';

export default function ProfileHeader({ name, role, memberSince }) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleColor = ROLE_COLORS[role] ?? ROLE_FALLBACK_COLOR;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-8 flex flex-col sm:flex-row items-center sm:items-start gap-5">
      <Avatar name={name} size="xl" />

      <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
        <h2 className="text-xl font-bold text-slate-900">{name}</h2>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${roleColor}`}
          aria-label={`Role: ${roleLabel}`}
        >
          {roleLabel}
        </span>

        {memberSince && (
          <p className="text-xs text-slate-400">Member since {memberSince}</p>
        )}
      </div>
    </div>
  );
}
