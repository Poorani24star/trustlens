import { FileText, FileImage, X } from 'lucide-react';

const TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
};

function getTypeLabel(file) {
  if (TYPE_LABELS[file.type]) return TYPE_LABELS[file.type];
  const ext = file.name.split('.').pop().toUpperCase();
  return ext || 'File';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file) {
  return file.type.startsWith('image/');
}

export default function SelectedFileCard({ file, onRemove }) {
  const typeLabel = getTypeLabel(file);
  const sizeLabel = formatSize(file.size);

  return (
    <div
      className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-card px-4 py-3.5"
      role="region"
      aria-label={`Selected file: ${file.name}`}
    >
      {/* File icon */}
      <span
        className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0"
        aria-hidden="true"
      >
        {isImage(file)
          ? <FileImage className="w-5 h-5" />
          : <FileText className="w-5 h-5" />
        }
      </span>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {typeLabel} · {sizeLabel}
        </p>
      </div>

      {/* Remove */}
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
