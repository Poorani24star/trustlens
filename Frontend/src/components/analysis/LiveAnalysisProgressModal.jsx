import { useState } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import Button from '../Button';

export default function LiveAnalysisProgressModal({
  isOpen,
  status,
  progress,
  result,
  error,
  onCancel,
  onRetryFile,
  onClose,
  onViewReport,
  title = 'Analyzing Documents with TrustLens'
}) {
  const [showFilesList, setShowFilesList] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!isOpen) return null;

  const percent = progress?.percent || 0;
  const stage = progress?.stage || 'running';
  const stageTitle = progress?.stageTitle || 'Processing…';
  const message = progress?.message || 'Analyzing documents…';
  const files = progress?.files || [];
  const pairs = progress?.pairs || { current: 0, total: 0, currentPair: '' };

  const completedFiles = files.filter(f => f.status === 'completed').length;
  const failedFiles = files.filter(f => f.status === 'failed').length;

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isUnsupported = stage === 'unsupported' || result?.supported === false;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md transition-all animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden transition-all transform scale-100">
        
        {/* Glowing Top Ambient Header */}
        <div className={`h-2 w-full ${isUnsupported ? 'bg-amber-500' : isFailed ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 animate-pulse'}`} />

        <div className="p-6 sm:p-8 space-y-6">

          {/* Modal Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 border ${
                isUnsupported 
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : isCompleted 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : isFailed 
                      ? 'bg-rose-50 border-rose-200 text-rose-600' 
                      : 'bg-blue-50 border-blue-100 text-blue-600'
              }`}>
                {isUnsupported ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : isFailed ? (
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                )}
              </div>
              <div>
                <h3 id="progress-modal-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {title}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {isUnsupported ? 'Domain Validation Notice' : stageTitle}
                </p>
              </div>
            </div>

            {/* Top Right: Close Button or Percentage Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className={`text-2xl font-extrabold tracking-tight ${isUnsupported ? 'text-amber-600' : isFailed ? 'text-rose-600' : 'text-blue-600'}`}>
                  {percent}%
                </span>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isUnsupported ? 'Completed' : isCompleted ? 'Completed' : 'Progress'}
                </p>
              </div>

              {(isCompleted || isFailed || isCancelled || isUnsupported) && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${percent}%` }}
              />
            </div>
            
            {/* Live Message Pulse */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-2 font-medium truncate max-w-[85%]">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                <span className="truncate">{message}</span>
              </span>
              {files.length > 0 && (
                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                  {completedFiles}/{files.length} Docs
                </span>
              )}
            </div>
          </div>

          {/* Granular Pair Comparison Tracker (if Copied Content module) */}
          {pairs.total > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 text-xs text-indigo-900 space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Pairwise Document Comparisons:
                </span>
                <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  {pairs.current} of {pairs.total} Pairs
                </span>
              </div>
              {pairs.currentPair && (
                <p className="text-[11px] text-indigo-700 truncate font-mono">
                  Current: {pairs.currentPair}
                </p>
              )}
            </div>
          )}

          {/* Step Breadcrumbs Checklist */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            {[
              { step: 1, label: 'Upload' },
              { step: 2, label: 'Extraction' },
              { step: 3, label: 'Analysis' },
              { step: 4, label: 'Report' }
            ].map(item => {
              const currentStep = progress?.currentStep || 1;
              const isPast = currentStep > item.step || isCompleted;
              const isCurrent = currentStep === item.step && !isCompleted;

              return (
                <div 
                  key={item.step} 
                  className={`p-2 rounded-xl border text-[11px] font-medium transition-all ${
                    isPast 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : isCurrent 
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[9px] flex items-center justify-center shrink-0">
                        {item.step}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expandable Document Breakdown Drawer */}
          {files.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowFilesList(v => !v)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Document Status Breakdown ({completedFiles}/{files.length})</span>
                  {failedFiles > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                      {failedFiles} Failed
                    </span>
                  )}
                </div>
                {showFilesList ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showFilesList && (
                <div className="max-h-48 overflow-y-auto px-4 pb-3 pt-1 divide-y divide-slate-100 text-xs">
                  {files.map(file => (
                    <div key={file.id || file.name} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700 max-w-[240px]">
                          {file.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {file.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {file.status === 'extracting' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Extracting
                          </span>
                        )}
                        {file.status === 'pending' && (
                          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                        {file.status === 'failed' && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                            {onRetryFile && (
                              <button
                                type="button"
                                onClick={() => onRetryFile(file.id)}
                                className="p-1 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                title="Retry this file"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status Feedback Banner */}
          {isUnsupported ? (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 text-sm">Document Domain Notice</p>
                  <p className="text-amber-800 leading-relaxed">
                    {result?.message || error || 'TrustLens Error Detection currently supports Computer Science documents only. Please ensure your document focuses on Computer Science concepts.'}
                  </p>
                </div>
              </div>
            </div>
          ) : isFailed || (status === 'failed' && error) ? (
            <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs text-rose-900 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-900 text-sm">Analysis Encountered an Error</p>
                  <p className="text-rose-800 leading-relaxed">
                    {error || result?.message || 'An unexpected error occurred during document processing.'}
                  </p>
                </div>
              </div>
            </div>
          ) : isCompleted && !isUnsupported && result?.reportId ? (
            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold text-emerald-900 text-sm">Analysis Complete!</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Your verified report is ready. You can inspect factual statements, matching evidence, and similarity analysis now.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Cancellation Confirmation or Action Controls */}
          {confirmCancel ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-3 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900">Are you sure you want to cancel this analysis?</p>
                  <p className="text-rose-700 mt-0.5">
                    Any processing completed for this batch will be terminated and discarded.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Keep Running
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCancel(false);
                    onCancel('Cancelled by user');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Yes, Cancel Analysis
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 order-2 sm:order-1">
                ⚡ Real-time live pipeline powered by TrustLens
              </p>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
                {isCompleted && !isUnsupported && (
                  <>
                    {onClose && (
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={onClose}
                      >
                        Close
                      </Button>
                    )}
                    {onViewReport && result?.reportId && (
                      <Button 
                        type="button" 
                        variant="primary" 
                        size="sm" 
                        onClick={onViewReport}
                        className="shadow-sm font-semibold gap-1.5"
                      >
                        <span>View Report</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}

                {isUnsupported && onClose && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={onClose}
                    className="font-semibold"
                  >
                    Dismiss & Try Another File
                  </Button>
                )}

                {(isFailed || isCancelled) && onClose && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={onClose}
                  >
                    Close
                  </Button>
                )}

                {!isCompleted && !isFailed && !isCancelled && !isUnsupported && (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 hover:underline transition-colors px-2 py-1"
                  >
                    Cancel Analysis
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
