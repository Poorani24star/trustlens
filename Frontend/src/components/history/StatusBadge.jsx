import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

const CONFIG = {
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  processing: {
    label: 'Processing',
    icon: <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  failed: {
    label: 'Failed',
    icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.completed;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.className}`}
      aria-label={`Status: ${cfg.label}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
