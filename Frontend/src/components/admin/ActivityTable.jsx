import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  completed:  { icon: <CheckCircle  className="w-3.5 h-3.5" aria-hidden="true" />, cls: 'bg-green-50 text-green-700 border-green-200',  label: '✓ Completed'  },
  processing: { icon: <Loader2      className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />, cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Processing' },
  failed:     { icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />, cls: 'bg-red-50 text-red-700 border-red-200',       label: '⚠ Failed'     },
};

const ROLE_COLORS = {
  student:    'bg-blue-50 text-blue-700 border-blue-200',
  faculty:    'bg-violet-50 text-violet-700 border-violet-200',
  researcher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  admin:      'bg-amber-50 text-amber-700 border-amber-200',
};

export default function ActivityTable({ activities = [], emptyMessage = "No activity has been recorded yet." }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-12 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="System activity table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['User', 'Role', 'Action', 'Module', 'Date / Time', 'Status'].map(h => (
                <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activities.map(a => {
              const s = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.completed;
              return (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{a.user}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${ROLE_COLORS[a.role] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {a.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.action}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{a.module}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.datetime}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>
                      {s.icon}{s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
