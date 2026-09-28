import { API_BASE_URL } from '../config/api';
import { auth } from '../config/firebase';

const TOKEN_TIMEOUT_MS = 15000; // 15s — covers slow token refresh on poor connections
const DEFAULT_TIMEOUT_MS = 60000; // 60s for normal requests
const UPLOAD_TIMEOUT_MS = 120000; // 120s for file uploads (FormData)

/**
 * Fetches a fresh or cached Firebase ID token with retry on expiry
 * @param {boolean} forceRefresh
 */
async function getAuthToken(forceRefresh = false) {
  if (!auth.currentUser) {
    // Fallback: session storage token
    try {
      const raw = sessionStorage.getItem('trustlens_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.token && !u.token.startsWith('demo-token-')) return u.token;
      }
    } catch (_) {}
    return null;
  }

  try {
    return await Promise.race([
      auth.currentUser.getIdToken(forceRefresh),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Token fetch timeout')), TOKEN_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn('[ApiClient] Token fetch failed:', err.message);
    return null;
  }
}

/**
 * Centralized API client request function
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isUpload = options.body instanceof FormData;
  const timeoutMs = options.timeout ?? (isUpload ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  const headers = { ...options.headers };

  // Use provided token or fetch from Firebase (use cached token first)
  let token = options.token ||
    (headers['Authorization'] ? headers['Authorization'].replace('Bearer ', '').trim() : null);

  if (!token) {
    token = await getAuthToken(false);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !isUpload && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config = {
    ...options,
    headers,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // Token expired — force refresh and retry once
    if (response.status === 401 && auth.currentUser) {
      const freshToken = await getAuthToken(true);
      if (freshToken && freshToken !== token) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);
        const retryResponse = await fetch(url, { ...config, headers, signal: retryController.signal });
        clearTimeout(retryTimeoutId);
        return await parseResponse(retryResponse);
      }
    }

    return await parseResponse(response);
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      const timeoutErr = new Error(
        isUpload
          ? 'Upload timed out. Please check your connection and try again.'
          : 'Request timed out. Please try again.'
      );
      timeoutErr.statusCode = 408;
      throw timeoutErr;
    }

    // Network error (backend down, CORS, etc.)
    if (!err.statusCode) {
      err.message = err.message?.includes('fetch')
        ? 'Unable to reach the server. Please ensure the backend is running and try again.'
        : err.message;
      err.statusCode = 503;
    }
    throw err;
  }
}

async function parseResponse(response) {
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.statusCode = response.status;
    error.data = data;
    if (response.status === 403 && data.message?.includes('suspended')) {
      error.isSuspended = true;
    }
    throw error;
  }

  return data;
}

export default apiRequest;
