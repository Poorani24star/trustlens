import { useRef, useState } from 'react';
import { UploadCloud, PackageOpen, FileWarning, FolderOpen } from 'lucide-react';

function isZip(file) {
  return (
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.type === 'application/x-zip' ||
    file.name.toLowerCase().endsWith('.zip')
  );
}

const STATE_CONFIG = {
  idle: {
    zone: 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30',
    icon: <PackageOpen className="w-10 h-10 text-slate-400" aria-hidden="true" />,
    heading: 'Upload a ZIP file',
    sub: 'Drag and drop your ZIP file here',
  },
  'over-valid': {
    zone: 'border-indigo-500 bg-indigo-50 scale-[1.01]',
    icon: <UploadCloud className="w-10 h-10 text-indigo-500" aria-hidden="true" />,
    heading: 'Drop your ZIP file here',
    sub: 'Release to add your file',
  },
  'over-invalid': {
    zone: 'border-red-400 bg-red-50',
    icon: <FileWarning className="w-10 h-10 text-red-400" aria-hidden="true" />,
    heading: 'Only ZIP files are supported',
    sub: 'Please drop a .zip file',
  },
};

export default function ZipUploader({ onFileSelect, onError }) {
  const inputRef = useRef(null);
  const [dragState, setDragState] = useState('idle');

  function processFile(file) {
    if (!file) return;
    if (isZip(file)) {
      onFileSelect(file);
    } else {
      onError('Please upload a ZIP file containing the documents you want to compare.');
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    const item = e.dataTransfer.items?.[0];
    // Can't reliably read filename during dragover, so check MIME type only
    const valid = item
      ? item.type === 'application/zip' ||
        item.type === 'application/x-zip-compressed' ||
        item.type === 'application/x-zip'
      : true;
    setDragState(valid ? 'over-valid' : 'over-invalid');
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragState('idle');
  }

  function onDrop(e) {
    e.preventDefault();
    setDragState('idle');
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function onInputChange(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  const cfg = STATE_CONFIG[dragState];

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="ZIP upload area — click or drag and drop a ZIP file"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          px-6 py-12 text-center cursor-pointer transition-all duration-150 select-none
          focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2
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
                transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 shadow-sm"
              aria-label="Browse files to select a ZIP"
            >
              <FolderOpen className="w-4 h-4" aria-hidden="true" />
              Browse Files
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400 text-center">
        ZIP files only&nbsp;·&nbsp;Maximum <span className="font-medium text-slate-500">60 documents</span> per ZIP
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed,application/x-zip"
        onChange={onInputChange}
        className="sr-only"
        aria-label="ZIP file upload input"
        tabIndex={-1}
      />
    </div>
  );
}
