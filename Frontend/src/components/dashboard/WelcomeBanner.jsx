import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../config/rolePermissions';
import { ROLE_COLORS } from '../../constants/roles';

const ROLE_COPY = {
  student: { badge: 'Student Workspace' },
  faculty: { badge: 'Faculty Workspace' },
  researcher: { badge: 'Researcher Workspace' },
  faculty_researcher: { badge: 'Faculty & Researcher Workspace' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeBanner() {
  const { user } = useAuth();
  const normRole = normalizeRole(user?.role);
  const copy = ROLE_COPY[normRole] || ROLE_COPY[user?.role] || ROLE_COPY.student;
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const badgeColor = ROLE_COLORS[normRole] || ROLE_COLORS[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="mb-6 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
          {copy.badge}
        </span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900">
        {getGreeting()}, {firstName} 👋
      </h2>
    </div>
  );
}
