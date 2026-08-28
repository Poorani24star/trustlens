import { apiRequest } from './apiClient';

/**
 * Trigger text extraction for an uploaded document
 */
export async function extractText(uploadId, moduleType = 'error-detection') {
  const endpoint = moduleType === 'copied-content' ? '/extraction/copied-content' : '/extraction/error-detection';
  const res = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ uploadId, temporaryUploadId: uploadId }),
  });

  return res;
}
