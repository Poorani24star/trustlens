import { useState } from 'react';
import {
  CheckCircle, AlertCircle, AlertTriangle,
  FileText, FileImage, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

const MAX_DOCS = 60;
const SUPPORTED_EXTS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
const PREVIEW_LIMIT = 5;

function getExt(name) {
  return '.' + name.split('.').pop().toLowerCase();
}

function isSupported(name) {
  return SUPPORTED_EXTS.includes(getExt(name));
}

function FileRow({ name }) {
  const ext = getExt(name);
  const supported = SUPPORTED_EXTS.includes(ext);
  const isImg = ['.jpg', '.jpeg', '.png'].includes(ext);

  return (
    <li className="flex items-center gap-2 py-1">
      <span
        className={`w-5 h-5 rounded flex items-center justify-center shrink-0
          ${supported ? 'text-slate-400' : 'text-red-400'}`}
        aria-hidden="true"
      >
        {isImg
          ? <FileImage className="w-3.5 h-3.5" />
          : <FileText className="w-3.5 h-3.5" />
        }
      </span>
      <span className={`text-xs truncate flex-1 ${supported ? 'text-slate-600' : 'text-red-600'}`}>
        {name}
      </span>
      {!supported && (
        <span className="text-xs text-red-500 shrink-0 font-medium">Not supported</span>
      )}
    </li>
  );
}

export default function ZipContentSummary({ isValidating, supportedFiles, unsupportedFiles }) {
  const [expanded, setExpanded] = useState(false);

  const totalDocs = supportedFiles.length + unsupportedFiles.length;
  const allFiles = [...supportedFiles, ...unsupportedFiles];
  const overLimit = supportedFiles.length > MAX_DOCS;
  const isEmpty = totalDocs === 0 && !isValidating;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isValidating) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" aria-hidden="true" />
        <span>Checking your ZIP file…</span>
      </div>
    );
  }

  // ── Empty ZIP ──────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-medium">No supported documents were found.</p>
          <p className="text-xs mt-0.5 text-amber-700">
            Please upload a ZIP containing PDF, DOCX, JPG or PNG files.
          </p>
        </div>
      </div>
    );
  }

  // ── Over limit ─────────────────────────────────────────────────────────────
  if (overLimit) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-medium">
            This ZIP contains {supportedFiles.length} documents — the maximum is {MAX_DOCS}.
          </p>
          <p className="text-xs mt-0.5 text-red-700">
            Please upload a ZIP containing {MAX_DOCS} or fewer documents.
          </p>
        </div>
      </div>
    );
  }

  // ── Normal summary ─────────────────────────────────────────────────────────
  const previewFiles = expanded ? allFiles : allFiles.slice(0, PREVIEW_LIMIT);
  const remaining = allFiles.length - PREVIEW_LIMIT;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
      {/* Header row */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          ZIP contents
        </span>

        {/* Supported count */}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          {supportedFiles.length} supported
        </span>

        {/* Unsupported count */}
        {unsupportedFiles.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {unsupportedFiles.length} not supported
          </span>
        )}

        {unsupportedFiles.length === 0 && (
          <span className="text-xs text-green-700 font-medium">
            ✓ All documents are supported.
          </span>
        )}
      </div>

      {/* Unsupported warning */}
      {unsupportedFiles.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
          <span className="font-medium">Some files in this ZIP are not supported</span> and will be skipped during comparison.
        </div>
      )}

      {/* File list */}
      <ul className="px-4 py-2 divide-y divide-slate-50" aria-label="Files in ZIP">
        {previewFiles.map(name => (
          <FileRow key={name} name={name} />
        ))}
      </ul>

      {/* Expand / collapse */}
      {allFiles.length > PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-slate-100
            text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50
            transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600"
          aria-expanded={expanded}
          aria-label={expanded ? 'Show fewer files' : `Show ${remaining} more files`}
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> Show fewer</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /> +{remaining} more files</>
          )}
        </button>
      )}
    </div>
  );
}
