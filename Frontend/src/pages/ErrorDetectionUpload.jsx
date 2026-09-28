import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanSearch, Loader2, Plus, FileText, Edit3 } from 'lucide-react';

import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/Button';
import Toast from '../components/ui/Toast';
import FileUploader from '../components/errorDetection/FileUploader';
import SelectedFilesList from '../components/errorDetection/SelectedFilesList';
import CategorySelect from '../components/errorDetection/CategorySelect';
import ReviewSummary from '../components/errorDetection/ReviewSummary';
import LiveAnalysisProgressModal from '../components/analysis/LiveAnalysisProgressModal';
import { uploadErrorDetectionDocument } from '../services/uploadService';
import { useAnalysisProgress } from '../hooks/useAnalysisProgress';

const MAX_BATCH_SIZE = 10;

export default function ErrorDetectionUpload() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [inputMode, setInputMode]             = useState('file'); // 'file' | 'text'
  const [pastedText, setPastedText]           = useState('');
  const [selectedFiles, setSelectedFiles]     = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadError, setUploadError]         = useState('');
  const [categoryError, setCategoryError]     = useState('');
  const [isProcessing, setIsProcessing]       = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [toast, setToast]                     = useState(null);

  // ── Live Analysis Progress Queue Hook ──────────────────────────────────────
  const {
    jobId,
    status: jobStatus,
    progress: jobProgress,
    result: jobResult,
    error: jobError,
    isRunning: isJobRunning,
    startJob,
    cancelJob,
    retryFile,
    reset: resetJob
  } = useAnalysisProgress({
    onComplete: (analysisResult) => {
      setIsProcessing(false);
      if (analysisResult && analysisResult.supported === false) {
        setSelectedFiles((prev) => prev.map((item) => ({
          ...item,
          status: 'unsupported',
          errorMessage: analysisResult.message || 'TrustLens Error Detection currently supports Computer Science documents only.',
        })));
        setUploadError(analysisResult.message || 'TrustLens Error Detection currently supports Computer Science documents only.');
        return;
      }

      const reportId = analysisResult?.reportId;
      if (!reportId) {
        setUploadError('Factual check completed, but the report could not be saved.');
        return;
      }

      const rawFiles = selectedFiles.map((item) => item.file);
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'completed', reportId })));

      setToast({
        message: 'Analysis complete & report saved! Opening report details…',
        variant: 'success',
      });

      setTimeout(() => {
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
      }, 700);
    },
    onError: (err) => {
      setIsProcessing(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to complete analysis.';
      setUploadError(msg);
      setSelectedFiles((prev) => prev.map((item) => ({
        ...item,
        status: 'failed',
        errorMessage: msg,
      })));
    },
    onCancel: () => {
      setIsProcessing(false);
      setToast({ message: 'Analysis was cancelled.', variant: 'info' });
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'pending' })));
    }
  });

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
    resetJob();
  }, [resetJob]);

  const handleViewReport = useCallback(() => {
    const reportId = jobResult?.reportId;
    if (!reportId) return;
    const rawFiles = selectedFiles.map((item) => item.file);
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
          ...jobResult,
        },
        message: 'Error detection analysis complete.'
      }
    });
  }, [jobResult, selectedFiles, navigate]);

  const handleCloseModal = useCallback(() => {
    resetJob();
    setIsProcessing(false);
  }, [resetJob]);

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

    let rawFiles = [];

    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        setUploadError('Please enter or paste your document or exam text.');
        return;
      }
      const blob = new Blob([pastedText.trim()], { type: 'text/plain' });
      const textFile = new File([blob], 'Handwritten_Exam_Answers.txt', { type: 'text/plain' });
      rawFiles = [textFile];
      setSelectedFiles([{
        id: `doc_${Date.now()}`,
        file: textFile,
        status: 'pending',
        errorMessage: null,
        reportId: null
      }]);
    } else {
      if (selectedFiles.length === 0) {
        setUploadError('Please select at least one document to analyze.');
        return;
      }
      rawFiles = selectedFiles.map((item) => item.file);
    }

    setIsProcessing(true);
    setUploadError('');

    try {
      // Step 1: Upload document(s)
      setSelectedFiles((prev) => prev.map((item) => ({ ...item, status: 'uploading' })));
      setProcessingStage(`Uploading ${rawFiles.length} document(s)…`);

      const uploadResult = await uploadErrorDetectionDocument(rawFiles);
      const uploadId = uploadResult?.uploadId;
      if (!uploadId) throw new Error('Upload failed: missing uploadId session token.');

      // Step 2: Start background live analysis job
      setProcessingStage('Queuing error detection analysis job…');
      await startJob({
        type: 'error-detection',
        uploadId,
        files: rawFiles.map((f, i) => ({
          originalName: f.name,
          name: f.name,
          id: `file_${i + 1}`
        }))
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
        setUploadError(msg || 'Analysis could not be started. Please try again.');
      }
    }
  }

  const hasFiles = selectedFiles.length > 0;
  const hasContent = inputMode === 'text' ? !!pastedText.trim() : hasFiles;
  const canSubmit = hasContent && !!selectedCategory && !isProcessing && !isJobRunning;
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

            {/* Mode Switcher: Upload File vs Paste Text */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  inputMode === 'file' 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Upload Document / Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  inputMode === 'text' 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Paste Text Directly</span>
              </button>
            </div>

            {/* Upload error */}
            {uploadError && (
              <Toast
                message={uploadError}
                variant="error"
                onDismiss={() => setUploadError('')}
              />
            )}

            {inputMode === 'file' ? (
              <>
                {(!hasFiles || selectedFiles.length < MAX_BATCH_SIZE) && !isProcessing && (
                  <FileUploader
                    onFileSelect={(file) => handleFilesSelect([file])}
                    onFilesSelect={handleFilesSelect}
                    onError={handleFileError}
                    multiple={true}
                  />
                )}

                {hasFiles && (
                  <SelectedFilesList
                    files={selectedFiles}
                    onRemoveFile={handleRemoveFile}
                    isProcessing={isProcessing}
                  />
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="pasted-text" className="text-xs font-semibold text-slate-700">
                    Document / Exam Answer Text
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText(`CAT Test (Cloud Computing)\n\n1a) Data Parallelism\nGiven:\nWe have 1000 high-resolution photos, & each photo goes through the same three steps:\n1. Resizing 2. Applying an AI color filter 3. watermarking and saving\n\nAnswer:-\nThis can be related to data parallelism, where the same operation is performed simultaneously on different portions of data.\n\nInstead of Processing:\nPhoto 1 -> Photo 2 -> Photo 3 .... -> Photo 1000 we divide the 1000 photos among multiple Processors / cores - Each processor performs the same sequence of operation on a different set of photos. Therefore, this is data parallelism, because the same computation is applied independently to multiple data items simultaneously. It reduces the overall processing time.\n\n1b) Fog Computing vs Cloud Computing\nFog Computing:\nFog computing extends cloud capabilities closer to the end devices / users. Processing is performed at intermediate devices such as gateways, routers & edge servers.\n\nCloud computing:-\nCloud computing provides computing, storage & software resources through centralized remote data centers over the internet.`);
                      if (!selectedCategory) setSelectedCategory('Assignments');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    Load Sample Exam Text
                  </button>
                </div>
                <textarea
                  id="pasted-text"
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Type or paste student handwritten test answers, essay text, or lecture notes here..."
                  className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  ⚡ 100% exact character transcription — bypasses optical scanning distortions.
                </p>
              </div>
            )}
          </section>

          {/* ── Step 2: Category ── */}
          <section
            aria-labelledby="category-heading"
            className={`bg-white rounded-2xl border shadow-card p-5 space-y-4 transition-opacity duration-150
              ${!hasContent ? 'opacity-50 pointer-events-none' : 'border-slate-200'}`}
            aria-disabled={!hasContent}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                  ${hasContent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}
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
          {hasContent && selectedCategory && (
            <ReviewSummary 
              file={firstFile || { name: 'Handwritten_Exam_Answers.txt', size: pastedText.length }} 
              category={selectedCategory} 
            />
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
                : inputMode === 'text'
                ? 'Start Error Detection on Text'
                : selectedFiles.length > 1
                ? `Start Error Detection (${selectedFiles.length} Documents)`
                : 'Start Error Detection'}
            </Button>

            {!canSubmit && !isProcessing && (
              <p id="submit-hint" className="mt-2 text-xs text-slate-400">
                {!hasContent
                  ? 'Upload at least one document or paste text to continue.'
                  : 'Select a category to continue.'}
              </p>
            )}
          </div>

        </form>

        {/* ── Live Analysis Progress & Background Queue Modal ── */}
        <LiveAnalysisProgressModal
          isOpen={isJobRunning || jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'cancelled'}
          status={jobStatus}
          progress={jobProgress}
          result={jobResult}
          error={uploadError || jobError}
          onCancel={cancelJob}
          onRetryFile={retryFile}
          onClose={handleCloseModal}
          onViewReport={handleViewReport}
          title="Fact-Checking & Error Detection"
        />

      </div>
    </DashboardLayout>
  );
}
