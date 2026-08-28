export default function Logo({ size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
  const iconSizes = { sm: 'w-6 h-6', md: 'w-7 h-7', lg: 'w-8 h-8' };

  return (
    <span className={`inline-flex items-center gap-2 font-bold ${sizes[size]} text-slate-900 select-none`}>
      <span className={`${iconSizes[size]} relative flex items-center justify-center`} aria-hidden="true">
        {/* Lens ring */}
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="14" cy="14" r="9" stroke="#2563eb" strokeWidth="2.5"/>
          <path d="M21 21L27 27" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M10.5 14l2.5 2.5 4-4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span>
        <span className="text-blue-600">Trust</span>
        <span className="text-slate-900">Lens</span>
      </span>
    </span>
  );
}
