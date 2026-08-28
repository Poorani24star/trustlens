import { apiRequest } from './apiClient';

/**
 * Perform Copied Content Pairwise Analysis on extracted documents
 */
export async function analyzeCopiedContent(temporaryUploadId) {
  const res = await apiRequest('/copied-content/analyze', {
    method: 'POST',
    body: JSON.stringify({ temporaryUploadId }),
  });

  return res;
}
