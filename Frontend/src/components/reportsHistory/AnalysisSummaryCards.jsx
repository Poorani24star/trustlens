import { FileText, Search, Copy, CheckCircle } from 'lucide-react';

const CARD_DEFS = [
  { key: 'total',            label: 'Total Analyses',    icon: FileText,    accent: 'text-blue-600',    bg: 'bg-blue-50'    },
  { key: 'errorDetection',   label: 'Error Detection',   icon: Search,      accent: 'text-violet-600',  bg: 'bg-violet-50'  },
  { key: 'copiedContent',    label: 'Copied Content',    icon: Copy,        accent: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  { key: 'reportsAvailable', label: 'Reports Available', icon: CheckCircle, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function AnalysisSummaryCards({ summary, showCopiedContent }) {
  const cards = showCopiedContent
    ? CARD_DEFS
    : CARD_DEFS.filter(c => c.key !== 'copiedContent');

  return (
    <div className={`grid gap-4 ${cards.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {cards.map(({ key, label, icon: Icon, accent, bg }) => (
        <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${bg} ${accent} flex items-center justify-center shrink-0`} aria-hidden="true">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900 tabular-nums">{summary[key] ?? 0}</p>
            <p className="text-xs text-slate-500 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
