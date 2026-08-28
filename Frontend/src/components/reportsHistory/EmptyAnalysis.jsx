import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import Button from '../Button';

export function EmptyAnalysis({ showCopiedContent }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-14 flex flex-col items-center text-center gap-4">
      <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400" aria-hidden="true">
        <ClipboardList className="w-7 h-7" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-800">No reports or history yet</p>
        <p className="text-sm text-slate-500">Your completed document analyses will appear here.</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="primary" size="sm" onClick={() => navigate('/error-detection')}>
          Check a Document
        </Button>
        {showCopiedContent && (
          <Button variant="secondary" size="sm" onClick={() => navigate('/copied-content')}>
            Compare Documents
          </Button>
        )}
      </div>
    </div>
  );
}

export function NoAnalysisResults({ onClear }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-14 flex flex-col items-center text-center gap-3">
      <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400" aria-hidden="true">
        <ClipboardList className="w-7 h-7" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-800">No matching analyses</p>
        <p className="text-sm text-slate-500">Try changing your search or filters.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear Filters
      </Button>
    </div>
  );
}
