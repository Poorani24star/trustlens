import { useRef, useState } from 'react';
import { UploadCloud, FileWarning, FolderOpen } from 'lucide-react';

const ACCEPTED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
};
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];

function isAccepted(file) {
  if (ACCEPTED_TYPES[file.type]) return true;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export default function FileUploader({ onFileSelect, onFilesSelect, onError, multiple = true }) {
  const inputRef = useRef(null);
  const [dragState, setDragState] = useState('idle'); // 'idle' | 'over-valid' | 'over-invalid'

  function processFiles(filesList) {
    if (!filesList || filesList.length === 0) return;
    
    const filesArray = Array.from(filesList);
    const validFiles = [];
    const invalidFiles = [];

    filesArray.forEach(file => {
      if (isAccepted(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0 && onError) {
      onError(`Unsupported file type for: ${invalidFiles.join(', ')}. Please upload PDF, DOCX, JPG or PNG files.`);
    }

    if (validFiles.length > 0) {
      if (onFilesSelect) {
        onFilesSelect(validFiles);
      } else if (onFileSelect) {
        onFileSelect(validFiles[0]);
      }
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function onDragOver(e) {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items || []);
    const allValid = items.length === 0 || items.every(item => isAccepted({ type: item.type, name: '' }));
    setDragState(allValid ? 'over-valid' : 'over-invalid');
  }

  function onDragLeave(e) {
    // Only reset when leaving the zone itself, not a child element
    if (!e.currentTarget.contains(e.relatedTarget)) setDragState('idle');
  }

  function onDrop(e) {
    e.preventDefault();
    setDragState('idle');
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) processFiles(droppedFiles);
  }

  function onInputChange(e) {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) processFiles(selectedFiles);
    // Reset so the same files can be re-selected after removal
    e.target.value = '';
  }

  // ── Visual state config ────────────────────────────────────────────────────
  const stateConfig = {
    idle: {
      zone: 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40',
      icon: <UploadCloud className="w-10 h-10 text-slate-400" aria-hidden="true" />,
      heading: multiple ? 'Upload your documents' : 'Upload your document',
      sub: multiple ? 'Drag and drop one or more files here' : 'Drag and drop your file here',
    },
    'over-valid': {
      zone: 'border-blue-500 bg-blue-50 scale-[1.01]',
      icon: <UploadCloud className="w-10 h-10 text-blue-500" aria-hidden="true" />,
      heading: multiple ? 'Drop your documents here' : 'Drop your document here',
      sub: 'Release to add your files',
    },
    'over-invalid': {
      zone: 'border-red-400 bg-red-50',
      icon: <FileWarning className="w-10 h-10 text-red-400" aria-hidden="true" />,
      heading: 'Unsupported file type',
      sub: 'Please use PDF, DOCX, JPG or PNG',
    },
  };

  const cfg = stateConfig[dragState];

  return (
    <div>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload area — click or drag and drop files"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          px-6 py-12 text-center cursor-pointer transition-all duration-150 select-none
          focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2
          ${cfg.zone}`}
      >
        {cfg.icon}

        <div>
          <p className="text-base font-semibold text-slate-700">{cfg.heading}</p>
          <p className="text-sm text-slate-500 mt-0.5">{cfg.sub}</p>
        </div>

        {dragState === 'idle' && (
          <>
            <span className="text-xs text-slate-400">or</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white
                text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400
                transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 shadow-sm"
              aria-label="Browse files to upload"
            >
              <FolderOpen className="w-4 h-4" aria-hidden="true" />
              {multiple ? 'Browse Files' : 'Browse File'}
            </button>
          </>
        )}
      </div>

      {/* Supported formats note */}
      <p className="mt-3 text-xs text-slate-400 text-center">
        Supported formats: <span className="font-medium text-slate-500">PDF, DOCX, JPG, PNG</span>
        &nbsp;·&nbsp;Multiple documents supported (Max 10 per session).
      </p>

      {/* Hidden file input — always present for accessibility */}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
        onChange={onInputChange}
        className="sr-only"
        aria-label="File upload input"
        tabIndex={-1}
      />
    </div>
  );
}
