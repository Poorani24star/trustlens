import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function SystemStatus({ services }) {
  return (
    <section aria-labelledby="system-status-heading" className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
      <h2 id="system-status-heading" className="text-base font-semibold text-slate-900 mb-4">System Status</h2>
      <ul className="space-y-3" role="list">
        {services.map(({ name, status }) => {
          const ok = status === 'operational';
          return (
            <li key={name} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">{name}</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
                ${ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
              >
                {ok
                  ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  : <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                {ok ? 'Operational' : 'Degraded'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
