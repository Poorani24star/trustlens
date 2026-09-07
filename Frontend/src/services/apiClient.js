import { API_BASE_URL } from '../config/api';
import { auth } from '../config/firebase';

/**
 * Centralized API client request function
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = { ...options.headers };

  // Attach Firebase ID Token or session demo token if user is logged in
  let token = null;

  if (auth.currentUser) {
    try {
      token = await Promise.race([
        auth.currentUser.getIdToken(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Token fetch timeout')), 2000))
      ]);
    } catch (err) {
      console.warn('[ApiClient] Unable to retrieve Firebase ID token, using session token:', err.message);
    }
  }

  if (!token) {
    try {
      const raw = sessionStorage.getItem('trustlens_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.token && !u.token.startsWith('demo-token-')) {
          token = u.token;
        }
      }
    } catch (e) {
      // Ignore session read error
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set JSON Content-Type if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
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
      
      if (response.status === 403 && data.message && data.message.includes('suspended')) {
        error.isSuspended = true;
      }
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
}

export default apiRequest;
