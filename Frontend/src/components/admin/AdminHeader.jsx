import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function AdminHeader({ onMenuOpen, pageTitle = 'Admin Dashboard' }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center px-4 sm:px-6 gap-4">
      <button
        onClick={onMenuOpen}
        className="lg:hidden p-2 -ml-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 className="text-base font-semibold text-slate-900 flex-1">{pageTitle}</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          className="relative p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Notifications (none)"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
        </button>

        <Link
          to="/admin/profile"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label={`Go to profile — ${user?.name}, Administrator`}
        >
          <span
            className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none"
            aria-hidden="true"
          >
            {getInitials(user?.name)}
          </span>
          <span className="hidden sm:flex flex-col leading-tight text-right">
            <span className="text-sm font-medium text-slate-900 truncate max-w-[120px]">{user?.name?.split(' ')[0]}</span>
            <span className="text-xs text-slate-500">Administrator</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
