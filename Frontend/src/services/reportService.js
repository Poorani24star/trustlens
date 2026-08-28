import { apiRequest } from './apiClient';

/**
 * Retrieves report list with optional type, status, search, limit, and cursor filters
 */
export async function getReports(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.type && params.type !== 'all') queryParams.append('type', params.type);
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const endpoint = `/reports${queryString ? `?${queryString}` : ''}`;
  
  const res = await apiRequest(endpoint);
  return res.reports || [];
}

/**
 * Retrieves details for a specific report including detailed findings/document pairs
 */
export async function getReportDetails(reportId) {
  const res = await apiRequest(`/reports/${reportId}`);
  return res.report || res;
}

/**
 * Deletes a specific report
 */
export async function deleteReport(reportId) {
  const res = await apiRequest(`/reports/${reportId}`, {
    method: 'DELETE',
  });
  return res;
}

/**
 * Retrieves report summary statistics
 */
export async function getReportSummary() {
  const res = await apiRequest('/reports/stats/summary');
  return res.stats || {
    totalReports: 0,
    errorDetectionReports: 0,
    copiedContentReports: 0,
  };
}
