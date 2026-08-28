import { useNavigate } from 'react-router-dom';
import { Clock, SearchX } from 'lucide-react';
import Button from '../Button';

export function EmptyHistory() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-xl border border-slate-200 shadow-card">
      <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4" aria-hidden="true">
        <Clock className="w-7 h-7 text-slate-400" />
      </span>
      <p className="text-base font-semibold text-slate-700">No analysis history yet</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
        Your completed document checks and comparisons will appear here.
      </p>
      <div className="flex flex-wrap gap-3 mt-6 justify-center">
        <Button size="sm" onClick={() => navigate('/error-detection')}>Check a Document</Button>
        <Button size="sm" variant="secondary" onClick={() => navigate('/copied-content')}>Compare Documents</Button>
      </div>
    </div>
  );
}

export function NoSearchResults({ onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-xl border border-slate-200 shadow-card">
      <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4" aria-hidden="true">
        <SearchX className="w-7 h-7 text-slate-400" />
      </span>
      <p className="text-base font-semibold text-slate-700">No matching analyses</p>
      <p className="text-sm text-slate-400 mt-1">Try changing your search or filters.</p>
      <button
        onClick={onClear}
        className="mt-5 text-sm font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
      >
        Clear Filters
      </button>
    </div>
  );
}
