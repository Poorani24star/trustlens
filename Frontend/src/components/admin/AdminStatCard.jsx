export default function AdminStatCard({ label, value, icon, accent = 'text-blue-600', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} ${accent} flex items-center justify-center shrink-0`} aria-hidden="true">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}
