import { FileText, FileImage, Tag, CheckCircle } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
};

function getTypeLabel(file) {
  return TYPE_LABELS[file.type] ?? file.name.split('.').pop().toUpperCase();
}

export default function ReviewSummary({ file, category }) {
  if (!file || !category) return null;

  const isImage = file.type.startsWith('image/');

  return (
    <div
      className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 space-y-3"
      role="region"
      aria-label="Review your selection before starting"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
        <p className="text-sm font-semibold text-green-800">Ready to check</p>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-md bg-white border border-green-200 flex items-center justify-center text-green-600 shrink-0 mt-0.5" aria-hidden="true">
            {isImage
              ? <FileImage className="w-3.5 h-3.5" />
              : <FileText className="w-3.5 h-3.5" />
            }
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Document</p>
            <p className="text-sm text-slate-800 font-medium truncate" title={file.name}>{file.name}</p>
            <p className="text-xs text-slate-400">{getTypeLabel(file)} · {formatSize(file.size)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-md bg-white border border-green-200 flex items-center justify-center text-green-600 shrink-0 mt-0.5" aria-hidden="true">
            <Tag className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</p>
            <p className="text-sm text-slate-800 font-medium">{category}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-green-700">Everything looks good. Click the button below to start.</p>
    </div>
  );
}
