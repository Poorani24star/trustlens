import { Package, X } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SelectedZipCard({ file, onRemove }) {
  return (
    <div
      className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-card px-4 py-3.5"
      role="region"
      aria-label={`Selected ZIP file: ${file.name}`}
    >
      <span
        className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"
        aria-hidden="true"
      >
        <Package className="w-5 h-5" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          ZIP · {formatSize(file.size)}
        </p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50
          transition-colors focus-visible:outline-2 focus-visible:outline-red-500"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
