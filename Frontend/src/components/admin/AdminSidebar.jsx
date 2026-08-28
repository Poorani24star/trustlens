import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, BookOpen, BarChart2, TrendingUp, User, LogOut } from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin/dashboard',           label: 'Dashboard',           icon: <LayoutDashboard className="w-5 h-5" aria-hidden="true" />, end: true },
  { to: '/admin/users',               label: 'Users',               icon: <Users            className="w-5 h-5" aria-hidden="true" /> },
  { to: '/admin/activity',            label: 'Activity',            icon: <Activity         className="w-5 h-5" aria-hidden="true" /> },
  { to: '/admin/knowledge-repository',label: 'Knowledge Repository',icon: <BookOpen         className="w-5 h-5" aria-hidden="true" /> },
  { to: '/admin/reports',             label: 'Reports',             icon: <BarChart2        className="w-5 h-5" aria-hidden="true" /> },
  { to: '/admin/analytics',           label: 'Analytics',           icon: <TrendingUp       className="w-5 h-5" aria-hidden="true" /> },
  { to: '/admin/profile',             label: 'Profile',             icon: <User             className="w-5 h-5" aria-hidden="true" /> },
];

const linkBase = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600';
const linkActive = 'bg-blue-50 text-blue-700';
const linkIdle = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

export default function AdminSidebar({ open, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const nav = (
    <nav className="flex flex-col h-full" aria-label="Admin navigation">
      {/* Logo + panel label */}
      <div className="px-4 py-5 border-b border-slate-100">
        <Logo />
        <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Admin Panel</p>
      </div>

      {/* Links */}
      <ul className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" role="list">
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
            >
              {icon}
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className={`${linkBase} ${linkIdle} w-full`}
          aria-label="Sign out of TrustLens"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
        {nav}
      </aside>

      {/* Mobile off-canvas */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
          <aside className="relative z-50 flex flex-col w-64 bg-white shadow-xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
