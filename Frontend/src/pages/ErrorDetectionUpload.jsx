import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanSearch, Loader2, Plus } from 'lucide-react';

import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/Button';
import Toast from '../components/ui/Toast';
import FileUploader from '../components/errorDetection/FileUploader';
import SelectedFilesList from '../components/errorDetection/SelectedFilesList';
import CategorySelect from '../components/errorDetection/CategorySelect';
import ReviewSummary from '../components/errorDetection/ReviewSummary';
import { uploadErrorDetectionDocument } from '../services/uploadService';
import { extractText } from '../services/extractionService';
import { analyzeErrorDetection } from '../services/errorDetectionService';

const MAX_BATCH_SIZE = 10;

export default function ErrorDetectionUpload() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedFiles, setSelectedFiles]     = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadError, setUploadError]         = useState('');
  const [categoryError, setCategoryError]     = useState('');
  const [isProcessing, setIsProcessing]       = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [toast, setToast]                     = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFilesSelect = useCallback((files) => {
    const filesArray = Array.isArray(files) ? files : [files];
    setUploadError('');

    setSelectedFiles((prev) => {
      // Prevent duplicates by checking name and size
      const existingKeys = new Set(prev.map((item) => `${item.file.name}_${item.file.size}`));
      const newItems = [];

      for (const f of filesArray) {
        const key = `${f.name}_${f.size}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newItems.push({
            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file: f,
            status: 'pending',
            errorMessage: null,
            reportId: null,
            domain: null,
            primaryTopic: null,
            detectedTopics: [],
          });
        }
      }

      const combined = [...prev, ...newItems];

      if (combined.length > MAX_BATCH_SIZE) {
        setUploadError(`Maximum batch limit reached. You can upload a maximum of ${MAX_BATCH_SIZE} documents at a time.`);
        setToast({ message: `Max ${MAX_BATCH_SIZE} documents allowed per session.`, variant: 'error' });
        return combined.slice(0, MAX_BATCH_SIZE);
      }

      setToast({ message: `${newItems.length} document(s) added successfully.`, variant: 'success' });
      return combined;
    });
  }, []);

  const handleFileError = useCallback((msg) => {
    setUploadError(msg);
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
    setUploadError('');
  }, []);

  const handleCategoryChange = useCallback((val) => {
    setSelectedCategory(val);
    if (val) setCategoryError('');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedCategory) {
      setCategoryError('Please select a document category.');
      return;
    }

    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one document to analyze.');
      return;
    }

    setIsProcessing(true);
    setUploadError('');

    try {
      const rawFiles = selectedFiles.map((item) => item.file);

      // Step 1: Upload document(s)
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'uploading' })));
      setProcessingStage(`Uploading ${rawFiles.length} document(s)…`);

      const uploadResult = await uploadErrorDetectionDocument(rawFiles);
      const uploadId = uploadResult.uploadId;
      if (!uploadId) throw new Error('Upload failed: missing uploadId session token.');

      // Step 2: Extract text (Normal + OCR fallback)
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'extracting' })));
      setProcessingStage('Extracting text and scanning pages with OCR where necessary…');
      await extractText(uploadId, 'error-detection');

      // Step 3: Domain Validation, Topic Detection, Knowledge Retrieval, Cosine Comparison, Classification
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'analyzing' })));
      setProcessingStage('Analyzing Computer Science facts and running factual error classification…');
      const analysisResult = await analyzeErrorDetection(uploadId);

      if (analysisResult && analysisResult.supported === false) {
        setSelectedFiles((prev) => prev.map((item) => ({
          ...item,
          status: 'unsupported',
          errorMessage: analysisResult.message || 'TrustLens Error Detection currently supports Computer Science documents only.',
        })));
        setUploadError(analysisResult.message || 'TrustLens Error Detection currently supports Computer Science documents only.');
        setIsProcessing(false);
        return;
      }

      // Step 4: Validate persistent report creation and saved Firebase report ID
      const reportId = analysisResult?.reportId;
      if (!reportId) {
        throw new Error('Factual check completed, but the report could not be saved.');
      }

      // Step 5: Save Confirmation & Navigation to Report Details
      setProcessingStage('Opening report details…');
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'completed', reportId })));

      setToast({
        message: 'Analysis complete & report saved! Opening report details…',
        variant: 'success',
      });

      // Automatically navigate to the Error Detection Report Details page
      navigate(`/reports/${reportId}`, {
        state: {
          newReportId: reportId,
          report: {
            id: reportId,
            reportId,
            reportType: 'error-detection',
            title: rawFiles.length === 1 ? `Error Detection - ${rawFiles[0].name}` : `Error Detection - ${rawFiles.length} Documents Batch`,
            status: 'completed',
            createdAt: new Date().toISOString(),
            ...analysisResult,
          },
          message: 'Error detection analysis complete.'
        }
      });

    } catch (err) {
      console.error('[ErrorDetectionUpload] Session analysis error:', err);
      setIsProcessing(false);
      setSelectedFiles((prev) => prev.map((item) => ({
        ...item,
        status: 'failed',
        errorMessage: err.message || 'Failed to complete analysis.',
      })));
      const msg = err.message || '';
      if (msg.includes('saved') || msg.includes('Firestore') || msg.includes('report')) {
        setUploadError('Factual check completed, but the report could not be saved.');
      } else {
        setUploadError(msg || 'Analysis could not be completed. Please try again.');
      }
    }
  }

  const hasFiles = selectedFiles.length > 0;
  const canSubmit = hasFiles && !!selectedCategory && !isProcessing;
  const firstFile = selectedFiles[0]?.file;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout pageTitle="Error Detection">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page heading */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span
              className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"
              aria-hidden="true"
            >
              <ScanSearch className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Check Documents</h2>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed pl-[2.625rem]">
            Upload one or more Computer Science documents to verify factual statements against trusted reference sources.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => setToast(null)}
          />
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Step 1: Upload ── */}
          <section
            aria-labelledby="upload-heading"
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  1
                </span>
                <h3 id="upload-heading" className="text-sm font-semibold text-slate-700">
                  Select document(s)
                </h3>
              </div>

              {hasFiles && selectedFiles.length < MAX_BATCH_SIZE && !isProcessing && (
                <span className="text-xs text-slate-500 font-medium">
                  {selectedFiles.length}/{MAX_BATCH_SIZE} files
                </span>
              )}
            </div>

            {/* Upload error */}
            {uploadError && (
              <Toast
                message={uploadError}
                variant="error"
                onDismiss={() => setUploadError('')}
              />
            )}

            {/* Always show FileUploader for drop zone / adding more files */}
            {(!hasFiles || selectedFiles.length < MAX_BATCH_SIZE) && !isProcessing && (
              <FileUploader
                onFileSelect={(file) => handleFilesSelect([file])}
                onFilesSelect={handleFilesSelect}
                onError={handleFileError}
                multiple={true}
              />
            )}

            {/* Selected files list */}
            {hasFiles && (
              <SelectedFilesList
                files={selectedFiles}
                onRemoveFile={handleRemoveFile}
                isProcessing={isProcessing}
              />
            )}
          </section>

          {/* ── Step 2: Category ── */}
          <section
            aria-labelledby="category-heading"
            className={`bg-white rounded-2xl border shadow-card p-5 space-y-4 transition-opacity duration-150
              ${!hasFiles ? 'opacity-50 pointer-events-none' : 'border-slate-200'}`}
            aria-disabled={!hasFiles}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                  ${hasFiles ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                aria-hidden="true"
              >
                2
              </span>
              <h3 id="category-heading" className="text-sm font-semibold text-slate-700">
                Choose a category
              </h3>
            </div>

            <CategorySelect
              value={selectedCategory}
              onChange={handleCategoryChange}
              error={categoryError}
            />
          </section>

          {/* ── Step 3: Review ── */}
          {hasFiles && selectedCategory && firstFile && (
            <ReviewSummary file={firstFile} category={selectedCategory} />
          )}

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-blue-800 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
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
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" aria-hidden="true" />}
              {isProcessing
                ? 'Processing Analysis…'
                : selectedFiles.length > 1
                ? `Start Error Detection (${selectedFiles.length} Documents)`
                : 'Start Error Detection'}
            </Button>

            {!canSubmit && !isProcessing && (
              <p id="submit-hint" className="mt-2 text-xs text-slate-400">
                {!hasFiles
                  ? 'Upload at least one document to continue.'
                  : 'Select a category to continue.'}
              </p>
            )}
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
