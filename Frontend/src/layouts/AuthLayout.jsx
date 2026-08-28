import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function AuthLayout({ children, heading, subheading }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-blue-600 flex-col justify-between p-10 text-white">
        <Link to="/" aria-label="TrustLens home">
          <span className="inline-flex items-center gap-2 font-bold text-xl text-white select-none">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
              <circle cx="14" cy="14" r="9" stroke="white" strokeWidth="2.5"/>
              <path d="M21 21L27 27" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10.5 14l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            TrustLens
          </span>
        </Link>

        <div>
          <h1 className="text-3xl font-bold leading-snug mb-4">
            {heading}
          </h1>
          <p className="text-blue-100 text-base leading-relaxed">
            {subheading}
          </p>
        </div>

        <div className="space-y-3">
          {[
            { icon: '✓', text: 'Verify factual information in documents' },
            { icon: '≡', text: 'Identify copied text across multiple documents' },
            { icon: '◎', text: 'Clear results to support informed decisions' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-blue-100">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
              {text}
            </div>
          ))}
        </div>

        <p className="text-xs text-blue-200 italic">"See what's true. See what's copied."</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-white">
          <Link to="/"><Logo /></Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-10 bg-slate-50">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
