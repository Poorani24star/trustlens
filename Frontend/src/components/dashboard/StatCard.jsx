export default function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex items-center gap-4">
      <span className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
