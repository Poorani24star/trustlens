import { getReports, getReportSummary } from './reportService';

function parseSafeDate(dateVal) {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'string' || typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const sec = dateVal._seconds ?? dateVal.seconds;
    if (typeof sec === 'number') return new Date(sec * 1000);
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function getActivity() {
  try {
    const reports = await getReports({ limit: 5 });
    return reports.map(r => {
      const isErrorDetection =
        r.reportType === 'error-detection' ||
        r.reportType === 'error_detection' ||
        r.type === 'error-detection' ||
        r.type === 'error_detection';

      const created = parseSafeDate(r.createdAt);
      return {
        id: r.id,
        fileName: r.document?.fileName || r.document?.originalName || r.title || (isErrorDetection ? 'Document_Analysis.pdf' : 'Documents.zip'),
        type: isErrorDetection ? 'error-detection' : 'copied-content',
        typeLabel: isErrorDetection ? 'Error Detection' : 'Copied Content',
        result: r.summary?.totalIssues 
          ? `${r.summary.totalIssues} issues found` 
          : r.summary?.matchingPairs 
          ? `${r.summary.matchingPairs} matching pairs` 
          : 'Analysis completed',
        date: created.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        status: r.status || 'completed',
      };
    });
  } catch (err) {
    console.warn('[DashboardService] Live activity fetch notice:', err.message);
    return [];
  }
}

export async function getStats() {
  try {
    const summary = await getReportSummary();
    return {
      documentsAnalyzed: summary.totalReports || 0,
      issuesFound: summary.errorDetectionReports || 0,
      copiedContentAnalyses: summary.copiedContentReports || 0,
      reportsGenerated: summary.totalReports || 0,
    };
  } catch (err) {
    console.warn('[DashboardService] Live stats fetch notice:', err.message);
    return {
      documentsAnalyzed: 0,
      issuesFound: 0,
      copiedContentAnalyses: 0,
      reportsGenerated: 0,
    };
  }
}
