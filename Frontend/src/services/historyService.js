import { getAnalyses, fetchAnalysisSummary } from './analysisService';

export async function getHistory(params = {}) {
  try {
    return await getAnalyses(params);
  } catch {
    return [];
  }
}

export async function getSummary() {
  try {
    return await fetchAnalysisSummary();
  } catch {
    return { total: 0, errorDetection: 0, copiedContent: 0 };
  }
}
