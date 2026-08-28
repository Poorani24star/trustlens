export default function Toggle({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700 cursor-pointer">
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent
          transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2
          ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? 'Enabled' : 'Disabled'}</span>
      </button>
    </div>
  );
}
