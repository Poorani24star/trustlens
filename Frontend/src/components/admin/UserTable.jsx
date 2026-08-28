import { useRef } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, ROLE_FALLBACK_COLOR } from '../../constants/roles';

function StatusBadge({ status }) {
  const ok = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border
      ${ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
      {ok
        ? <CheckCircle   className="w-3 h-3" aria-hidden="true" />
        : <AlertTriangle className="w-3 h-3" aria-hidden="true" />}
      {ok ? '✓ Active' : '⚠ Suspended'}
    </span>
  );
}

function UserRow({ user, onView }) {
  const btnRef = useRef(null);
  
  let joinedText = 'Not available';
  const rawDate = user.createdAt || user.joined;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      joinedText = isNaN(d.getTime()) ? String(rawDate) : d.toLocaleDateString();
    } catch {
      joinedText = 'Not available';
    }
  }

  const displayName = user.name || user.email?.split('@')[0] || 'Unnamed User';

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{displayName}</td>
      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{user.email || 'No email'}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role] ?? ROLE_FALLBACK_COLOR}`}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={user.status} /></td>
      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{joinedText}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button
          ref={btnRef}
          onClick={() => onView(user, btnRef.current)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
          aria-label={`View details for ${displayName}`}
        >
          View
        </button>
      </td>
    </tr>
  );
}

export default function UserTable({ users, onView }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-700 mb-1">No users found</p>
        <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Users table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => <UserRow key={u.id} user={u} onView={onView} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
