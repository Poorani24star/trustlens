import { useNavigate } from 'react-router-dom';
import { FileText, Package, ScanSearch, Copy } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Button from '../Button';

function formatDate(date, time) {
  return `${date} · ${time}`;
}

const TYPE_CONFIG = {
  'error-detection': {
    label: 'Error Detection',
    icon: <ScanSearch className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'copied-content': {
    label: 'Copied Content',
    icon: <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};

function actionLabel(status, type) {
  if (status === 'processing') return 'View Progress';
  if (status === 'failed') return 'Try Again';
  return type === 'copied-content' ? 'View Results' : 'View Result';
}

function actionRoute(item) {
  if (item.status === 'failed') {
    return item.type === 'copied-content' ? '/copied-content' : '/error-detection';
  }
  // Future result routes — placeholders until result pages are built
  return item.type === 'copied-content'
    ? `/copied-content/results/${item.id}`
    : `/error-detection/results/${item.id}`;
}

export default function HistoryCard({ item }) {
  const navigate = useNavigate();
  const isZip = item.fileName.toLowerCase().endsWith('.zip');
  const typeCfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG['error-detection'];

  return (
    <article
      className="bg-white rounded-xl border border-slate-200 shadow-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
      aria-label={`${item.typeLabel} analysis of ${item.fileName}`}
    >
      {/* File icon */}
      <span
        className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0
          ${isZip
            ? 'bg-indigo-50 border-indigo-100 text-indigo-500'
            : 'bg-blue-50 border-blue-100 text-blue-500'}`}
        aria-hidden="true"
      >
        {isZip
          ? <Package className="w-5 h-5" />
          : <FileText className="w-5 h-5" />
        }
      </span>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* File name */}
        <p className="text-sm font-semibold text-slate-800 truncate" title={item.fileName}>
          {item.fileName}
        </p>

        {/* Type + date row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${typeCfg.badge}`}
          >
            {typeCfg.icon}
            {typeCfg.label}
          </span>
          <span className="text-xs text-slate-400">{formatDate(item.date, item.time)}</span>
        </div>

        {/* Status + result */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.status !== 'processing' && (
            <span className="text-xs text-slate-500">{item.result}</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        <Button
          variant={item.status === 'failed' ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => navigate(actionRoute(item))}
          aria-label={`${actionLabel(item.status, item.type)} for ${item.fileName}`}
        >
          {actionLabel(item.status, item.type)}
        </Button>
      </div>
    </article>
  );
}
