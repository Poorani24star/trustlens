export default function RoleCard({ id, value, selected, onChange, title, description, icon }) {
  return (
    <label
      htmlFor={id}
      className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
        ${selected
          ? 'border-blue-600 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      <input
        type="radio"
        id={id}
        name="role"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="sr-only"
        aria-describedby={`${id}-desc`}
      />
      <span className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg
        ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span id={`${id}-desc`} className="block text-xs text-slate-500 mt-0.5">{description}</span>
      </div>
      {selected && (
        <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </label>
  );
}
