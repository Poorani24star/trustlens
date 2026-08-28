import { NavLink, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../config/rolePermissions';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    permission: 'dashboard',
    end: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/error-detection',
    label: 'Error Detection',
    permission: 'errorDetection',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/copied-content',
    label: 'Copied Content',
    permission: 'copiedContent',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M3 15a2 2 0 002 2h4a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6z" />
      </svg>
    ),
  },
  {
    to: '/reports-history',
    label: 'Reports & History',
    permission: 'reportsHistory',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    permission: 'profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

const linkBase =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600';
const linkActive = 'bg-blue-50 text-blue-700';
const linkIdle = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

export default function DashboardSidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter(item => hasPermission(user?.role, item.permission));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const nav = (
    <nav className="flex flex-col h-full" aria-label="Dashboard navigation">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <Logo />
      </div>

      {/* Links */}
      <ul className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" role="list">
        {visibleItems.map(({ to, label, icon, end }) => (
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
        {nav}
      </aside>

      {/* Mobile off-canvas overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
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
