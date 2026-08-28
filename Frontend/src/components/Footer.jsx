import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="text-sm text-slate-500 italic">"See what's true. See what's copied."</p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
              {[
                { label: 'Home', to: '/' },
                { label: 'How It Works', to: '/#how-it-works' },
                { label: 'Privacy', to: '/privacy' },
                { label: 'Terms', to: '/terms' },
                { label: 'Contact', to: '/contact' },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-8 text-xs text-slate-400 text-center sm:text-left">
          © {new Date().getFullYear()} TrustLens. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
