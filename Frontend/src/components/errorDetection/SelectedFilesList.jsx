import { FileText, FileImage, X, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeLabel(file) {
  if (!file) return 'File';
  const name = file.name || file.originalName || '';
  const ext = name.split('.').pop().toUpperCase();
  return ext || 'FILE';
}

function isImage(file) {
  const type = file?.type || '';
  return type.startsWith('image/');
}

export default function SelectedFilesList({ files = [], onRemoveFile, isProcessing }) {
  const navigate = useNavigate();

  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Selected Documents ({files.length})
        </span>
      </div>

      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {files.map((item) => {
          const file = item.file || item;
          const status = item.status || 'pending';
          const typeLabel = getTypeLabel(file);
          const sizeLabel = formatSize(file.size);

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors bg-white ${
                status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : status === 'unsupported'
                  ? 'border-amber-200 bg-amber-50/20'
                  : status === 'failed'
                  ? 'border-red-200 bg-red-50/20'
                  : 'border-slate-200'
              }`}
            >
              {/* File Icon */}
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                {isImage(file) ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>

              {/* Info & Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                    {typeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                  <span>{sizeLabel}</span>

                  {item.primaryTopic && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {item.primaryTopic}
                      </span>
                    </>
                  )}
                </div>

                {/* Status Message / Errors */}
                {item.errorMessage && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    {item.errorMessage}
                  </p>
                )}
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {status === 'pending' && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    Ready
                  </span>
                )}

                {['uploading', 'extracting', 'validating', 'analyzing'].includes(status) && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    {status === 'uploading'
                      ? 'Uploading…'
                      : status === 'extracting'
                      ? 'Extracting…'
                      : status === 'validating'
                      ? 'Validating domain…'
                      : 'Analyzing…'}
                  </span>
                )}

                {status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Complete
                    </span>
                    {item.reportId && (
                      <button
                        type="button"
                        onClick={() => navigate(`/reports/${item.reportId}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-50"
                      >
                        Report <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {status === 'unsupported' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Unsupported Domain
                  </span>
                )}

                {status === 'failed' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Failed
                  </span>
                )}

                {/* Remove button */}
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    aria-label={`Remove ${file.name}`}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
