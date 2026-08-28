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

export async function getAnalyses(params = {}) {
  try {
    const rawReports = await getReports(params);
    return rawReports.map(r => {
      const isErrorDetection =
        r.reportType === 'error-detection' ||
        r.reportType === 'error_detection' ||
        r.type === 'error-detection' ||
        r.type === 'error_detection';

      const created = parseSafeDate(r.createdAt);
      
      const fileName =
        r.document?.originalName ||
        r.document?.fileName ||
        r.title ||
        (isErrorDetection ? 'Document_Analysis.pdf' : 'Documents_Analysis.zip');
      
      const verified = r.summary?.verified ?? r.summary?.supported ?? 0;
      const contradictions = r.summary?.potentialContradictions ?? r.summary?.incorrect ?? r.summary?.contradictions ?? 0;
      const totalStmts = r.summary?.totalStatements ?? r.summary?.analyzedStatements ?? 0;

      const resultText = isErrorDetection
        ? `${verified} Verified · ${contradictions} Contradictions`
        : (r.summary?.matchingPairs ? `${r.summary.matchingPairs} matching pairs` : 'Analysis completed');

      const detailText = isErrorDetection
        ? `${totalStmts} statements analyzed against reference sources`
        : (`${r.summary?.totalPairsCompared || 0} pairs compared · ${r.summary?.matchingPairs || 0} matching pairs`);

      return {
        id: r.id || r.reportId,
        fileName,
        type: isErrorDetection ? 'error-detection' : 'copied-content',
        typeLabel: isErrorDetection ? 'Error Detection' : 'Copied Content',
        date: created.toISOString().split('T')[0],
        time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: r.status || 'completed',
        result: resultText,
        reportStatus: 'available',
        detail: detailText,
      };
    });
  } catch (err) {
    console.warn('[AnalysisService] Unable to fetch live reports:', err.message);
    return [];
  }
}

export function getAnalysisSummary(analyses = []) {
  const errorDetection = analyses.filter(a => a.type === 'error-detection').length;
  const copiedContent  = analyses.filter(a => a.type === 'copied-content').length;
  const reportsAvailable = analyses.filter(a => a.reportStatus === 'available').length;
  return {
    total: analyses.length,
    errorDetection,
    copiedContent,
    reportsAvailable,
  };
}

export async function fetchAnalysisSummary() {
  try {
    const summary = await getReportSummary();
    return {
      total: summary.totalReports || 0,
      errorDetection: summary.errorDetectionReports || 0,
      copiedContent: summary.copiedContentReports || 0,
      reportsAvailable: summary.totalReports || 0,
    };
  } catch (err) {
    return { total: 0, errorDetection: 0, copiedContent: 0, reportsAvailable: 0 };
  }
}
