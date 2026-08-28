import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';
import Button from './Button';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Features', to: '/#features' },
  { label: 'About', to: '/#about' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" aria-label="Main navigation">
        <Link to="/" aria-label="TrustLens home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {NAV_LINKS.map(({ label, to }) => (
            <li key={label}>
              <a
                href={to}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Link to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}>
              <Button variant="primary" size="sm">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link to="/register"><Button variant="primary" size="sm">Get Started</Button></Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <a
              key={label}
              href={to}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md"
            >
              {label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-1">
            {user ? (
              <Link to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} onClick={() => setOpen(false)}>
                <Button variant="primary" className="w-full">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)}><Button variant="outline" className="w-full">Login</Button></Link>
                <Link to="/register" onClick={() => setOpen(false)}><Button variant="primary" className="w-full">Get Started</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
