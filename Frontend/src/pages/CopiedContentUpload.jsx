import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { Copy, Loader2 } from 'lucide-react';

import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/Button';
import Toast from '../components/ui/Toast';
import ZipUploader from '../components/copiedContent/ZipUploader';
import SelectedZipCard from '../components/copiedContent/SelectedZipCard';
import ZipContentSummary from '../components/copiedContent/ZipContentSummary';
import ZipReviewSummary from '../components/copiedContent/ZipReviewSummary';
import StepIndicator from '../components/copiedContent/StepIndicator';
import { useAuth } from '../context/AuthContext';
import { uploadCopiedContentDocuments } from '../services/uploadService';
import { extractText } from '../services/extractionService';
import { analyzeCopiedContent } from '../services/copiedContentService';

const MAX_DOCS = 60;
const SUPPORTED_EXTS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];

function isMetaEntry(name) {
  return (
    name.startsWith('__MACOSX/') ||
    name.startsWith('.') ||
    name.endsWith('/') ||
    name.includes('/.') ||
    name === 'Thumbs.db' ||
    name === 'desktop.ini'
  );
}

function getExt(name) {
  return '.' + name.split('.').pop().toLowerCase();
}

async function inspectZip(file) {
  const zip = await JSZip.loadAsync(file);
  const supported = [];
  const unsupported = [];

  zip.forEach((relativePath, entry) => {
    if (entry.dir || isMetaEntry(relativePath)) return;
    const name = relativePath.split('/').pop();
    if (SUPPORTED_EXTS.includes(getExt(name))) {
      supported.push(name);
    } else {
      unsupported.push(name);
    }
  });

  return { supported, unsupported };
}

function deriveStep(zip, isValidating, supportedFiles) {
  if (!zip) return 1;
  if (isValidating) return 2;
  if (supportedFiles.length > 0) return 3;
  return 2;
}

export default function CopiedContentUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty';

  const [selectedZip, setSelectedZip]         = useState(null);
  const [isValidating, setIsValidating]       = useState(false);
  const [supportedFiles, setSupportedFiles]   = useState([]);
  const [unsupportedFiles, setUnsupportedFiles] = useState([]);
  const [uploadError, setUploadError]         = useState('');
  const [isProcessing, setIsProcessing]       = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [toast, setToast]                     = useState(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const overLimit = supportedFiles.length > MAX_DOCS;
  const isEmpty   = selectedZip && !isValidating && supportedFiles.length === 0 && unsupportedFiles.length === 0;
  const hasValidated = selectedZip && !isValidating && (supportedFiles.length > 0 || unsupportedFiles.length > 0 || isEmpty);
  const canSubmit = hasValidated && supportedFiles.length > 0 && !overLimit && !isProcessing;
  const currentStep = deriveStep(selectedZip, isValidating, supportedFiles);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleZipSelect = useCallback(async (file) => {
    setSelectedZip(file);
    setSupportedFiles([]);
    setUnsupportedFiles([]);
    setUploadError('');
    setToast({ message: 'ZIP file added. Checking contents…', variant: 'info' });
    setIsValidating(true);

    try {
      const { supported, unsupported } = await inspectZip(file);
      setSupportedFiles(supported);
      setUnsupportedFiles(unsupported);

      if (supported.length === 0) {
        setToast({ message: 'No supported documents found in this ZIP.', variant: 'error' });
      } else if (supported.length > MAX_DOCS) {
        setToast({ message: `This ZIP contains ${supported.length} documents — the maximum is ${MAX_DOCS}.`, variant: 'error' });
      } else {
        setToast({ message: `${supported.length} document${supported.length !== 1 ? 's' : ''} found.`, variant: 'success' });
      }
    } catch {
      setUploadError('Could not read this ZIP file. Please check the file and try again.');
      setSelectedZip(null);
      setToast(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleZipError = useCallback((msg) => {
    setUploadError(msg);
    setSelectedZip(null);
    setSupportedFiles([]);
    setUnsupportedFiles([]);
    setToast(null);
  }, []);

  const handleRemoveZip = useCallback(() => {
    setSelectedZip(null);
    setSupportedFiles([]);
    setUnsupportedFiles([]);
    setUploadError('');
    setToast(null);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsProcessing(true);
    setUploadError('');

    try {
      // Step 1: Upload ZIP file
      setProcessingStage('Uploading ZIP package to server…');
      const uploadResult = await uploadCopiedContentDocuments(selectedZip);
      const uploadId = uploadResult.uploadId;

      // Step 2: Extract text from zip contents
      setProcessingStage('Extracting documents from ZIP…');
      await extractText(uploadId, 'copied-content');

      // Step 3: Run Copied Content Pairwise Engine and persist report
      setProcessingStage('Running pairwise content comparison engine and saving report…');
      const analysisResult = await analyzeCopiedContent(uploadId);

      // Verify that analysisResult returned a valid reportId from backend persistence
      if (!analysisResult || !analysisResult.reportId) {
        throw new Error('Analysis completed, but the report could not be saved.');
      }

      setToast({ message: 'Comparison complete! Report saved successfully.', variant: 'success' });

      setTimeout(() => {
        navigate(`/reports/${analysisResult.reportId}`, {
          state: {
            newReportId: analysisResult.reportId,
            message: 'Copied content analysis complete.'
          }
        });
      }, 800);

    } catch (err) {
      console.error('[CopiedContentUpload] Pipeline error:', err);
      const errorMsg = err.message || '';
      if (errorMsg.includes('saved') || errorMsg.includes('Firestore') || errorMsg.includes('report')) {
        setUploadError('Analysis completed, but the report could not be saved.');
      } else {
        setUploadError(errorMsg || 'Analysis failed. Please try again.');
      }
      setIsProcessing(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout pageTitle="Copied Content">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page heading */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span
              className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600"
              aria-hidden="true"
            >
              <Copy className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {isFaculty ? 'Compare Student Assignments' : 'Compare Your Documents'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed pl-[2.625rem]">
            Upload multiple documents to identify exact or near-exact copied text between them.
          </p>
          <p className="text-xs text-slate-400 mt-1 pl-[2.625rem]">
            Similar ideas or common terminology are not automatically treated as copied content.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => setToast(null)}
          />
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Step 1 & 2: Upload ── */}
          <section
            aria-labelledby="upload-heading"
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                1
              </span>
              <h3 id="upload-heading" className="text-sm font-semibold text-slate-700">
                Upload your ZIP file
              </h3>
            </div>

            {/* Upload error */}
            {uploadError && (
              <Toast
                message={uploadError}
                variant="error"
                onDismiss={() => setUploadError('')}
              />
            )}

            {/* Uploader or selected card */}
            {selectedZip ? (
              <SelectedZipCard file={selectedZip} onRemove={handleRemoveZip} />
            ) : (
              <ZipUploader onFileSelect={handleZipSelect} onError={handleZipError} />
            )}

            {/* Help text — always visible */}
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
              <p className="text-xs text-slate-600 font-medium">
                Put all documents you want to compare into one ZIP file.
              </p>
              <ul className="space-y-0.5">
                {[
                  `Maximum: ${MAX_DOCS} documents`,
                  'Supported formats inside ZIP: PDF, DOCX, JPG, PNG',
                  'Scanned documents and images are supported.',
                ].map(line => (
                  <li key={line} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="mt-0.5 text-slate-300" aria-hidden="true">·</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Step 3: ZIP contents ── */}
          {selectedZip && (
            <section
              aria-labelledby="contents-heading"
              className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                    ${hasValidated ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                  aria-hidden="true"
                >
                  2
                </span>
                <h3 id="contents-heading" className="text-sm font-semibold text-slate-700">
                  Review documents
                </h3>
              </div>

              <ZipContentSummary
                isValidating={isValidating}
                supportedFiles={supportedFiles}
                unsupportedFiles={unsupportedFiles}
              />
            </section>
          )}

          {/* ── Review summary ── */}
          {canSubmit && (
            <ZipReviewSummary file={selectedZip} supportedCount={supportedFiles.length} />
          )}

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3 text-indigo-800 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
              <span>{processingStage}</span>
            </div>
          )}

          {/* ── Submit ── */}
          <div className="pt-1">
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              aria-describedby={!canSubmit ? 'submit-hint' : undefined}
              style={{ backgroundColor: canSubmit ? '#4f46e5' : undefined, borderColor: canSubmit ? '#4f46e5' : undefined }}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
              {isProcessing ? 'Processing Comparison…' : 'Start Comparison'}
            </Button>

            {!canSubmit && !isProcessing && (
              <p id="submit-hint" className="mt-2 text-xs text-slate-400">
                {!selectedZip
                  ? 'Upload a ZIP file to continue.'
                  : isValidating
                  ? 'Checking your ZIP file…'
                  : overLimit
                  ? `Reduce the number of documents to ${MAX_DOCS} or fewer.`
                  : isEmpty
                  ? 'No supported documents found in this ZIP.'
                  : 'Waiting for validation to complete.'}
              </p>
            )}
          </div>

        </form>

        {/* ── Responsible use card ── */}
        <aside
          aria-label="How copied content is identified"
          className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-2"
        >
          <h3 className="text-sm font-semibold text-slate-700">How copied content is identified</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            TrustLens focuses on exact and near-exact textual overlap between documents. Documents discussing the same topic may naturally contain similar terms or ideas, which does not automatically mean the content was copied.
          </p>
          <p className="text-xs text-slate-400">
            Review highlighted matches before making a final decision.
          </p>
        </aside>

      </div>
    </DashboardLayout>
  );
}
