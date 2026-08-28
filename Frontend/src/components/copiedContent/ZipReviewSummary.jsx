import { Package, Files, CheckCircle } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ZipReviewSummary({ file, supportedCount }) {
  if (!file || supportedCount === 0) return null;

  return (
    <div
      className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 space-y-3"
      role="region"
      aria-label="Review your selection before starting comparison"
    >
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
        <p className="text-sm font-semibold text-green-800">Ready to compare</p>
      </div>

      <div className="space-y-2">
        {/* ZIP file */}
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-md bg-white border border-green-200 flex items-center justify-center text-green-600 shrink-0 mt-0.5" aria-hidden="true">
            <Package className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">ZIP File</p>
            <p className="text-sm text-slate-800 font-medium truncate" title={file.name}>{file.name}</p>
            <p className="text-xs text-slate-400">ZIP · {formatSize(file.size)}</p>
          </div>
        </div>

        {/* Document count */}
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-md bg-white border border-green-200 flex items-center justify-center text-green-600 shrink-0 mt-0.5" aria-hidden="true">
            <Files className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Documents & Comparisons</p>
            <p className="text-sm text-slate-800 font-medium">
              {supportedCount} {supportedCount === 1 ? 'document' : 'documents'} ready ({supportedCount > 1 ? (supportedCount * (supportedCount - 1)) / 2 : 0} unique comparison pairs)
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-green-700">Everything looks good. Click the button below to start.</p>
    </div>
  );
}
