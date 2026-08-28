import { BarChart2, ScanSearch, Copy } from 'lucide-react';

const TILES = [
  { key: 'total',          label: 'Total Analyses',    icon: <BarChart2  className="w-4 h-4" aria-hidden="true" /> },
  { key: 'errorDetection', label: 'Error Detection',   icon: <ScanSearch className="w-4 h-4" aria-hidden="true" /> },
  { key: 'copiedContent',  label: 'Copied Content',    icon: <Copy       className="w-4 h-4" aria-hidden="true" /> },
];

export default function HistorySummary({ summary }) {
  return (
    <div className="grid grid-cols-3 gap-3" role="region" aria-label="Analysis summary">
      {TILES.map(({ key, label, icon }) => (
        <div
          key={key}
          className="bg-white rounded-xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3"
        >
          <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0" aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 leading-none">{summary[key] ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
