import { apiRequest } from './apiClient';

/**
 * Fetch Admin Dashboard statistics
 */
export async function getDashboardStats() {
  const res = await apiRequest('/admin/dashboard');
  return res.dashboard || res;
}

/**
 * Fetch user list with optional filters
 */
export async function listUsers(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.role && params.role !== 'all') queryParams.append('role', params.role);
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const res = await apiRequest(`/admin/users${queryString ? `?${queryString}` : ''}`);
  return res.users || [];
}

/**
 * Fetch single user details
 */
export async function getUserDetails(userId) {
  const res = await apiRequest(`/admin/users/${userId}`);
  return res.user || res;
}

/**
 * Update user status ('active' or 'suspended')
 */
export async function updateUserStatus(userId, status) {
  const res = await apiRequest(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res;
}

/**
 * Fetch recent activity logs
 */
export async function getActivity(limit = 20) {
  const res = await apiRequest(`/admin/activity?limit=${limit}`);
  return res.activity || [];
}

/**
 * Fetch Admin profile
 */
export async function getAdminProfile() {
  const res = await apiRequest('/admin/profile');
  return res.profile || res;
}

/**
 * Fetch system report list for Admin with optional filters
 */
export async function listAdminReports(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.type && params.type !== 'all') queryParams.append('type', params.type);
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const res = await apiRequest(`/admin/reports${queryString ? `?${queryString}` : ''}`);
  return res.reports || [];
}

/**
 * Fetch detailed system report for Admin
 */
export async function getAdminReportDetails(reportId) {
  const res = await apiRequest(`/admin/reports/${reportId}`);
  return res.report || res;
}

/**
 * Fetch system analytics and trends for Admin
 */
export async function getAnalytics(period = '7d') {
  const res = await apiRequest(`/admin/analytics?period=${encodeURIComponent(period)}`);
  return res.analytics || res;
}
