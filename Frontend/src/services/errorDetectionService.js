import { apiRequest } from './apiClient';

/**
 * Perform Error Detection Analysis on an extracted document
 */
export async function analyzeErrorDetection(temporaryUploadId) {
  const res = await apiRequest('/error-detection/analyze', {
    method: 'POST',
    body: JSON.stringify({ temporaryUploadId }),
  });

  return res;
}
