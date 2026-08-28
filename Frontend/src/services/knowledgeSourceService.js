import { apiRequest } from './apiClient';

/**
 * Fetch list of trusted knowledge sources
 */
export async function getKnowledgeSources(params = { status: 'all' }) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.category) query.append('category', params.category);
  if (params.topic) query.append('topic', params.topic);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiRequest(`/knowledge${queryString}`);
  return res.sources || res.data || [];
}

/**
 * Upload a document file to Trusted Knowledge Repository
 */
export async function uploadKnowledgeDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.category) formData.append('category', metadata.category);
  if (metadata.topics) formData.append('topics', JSON.stringify(metadata.topics));
  if (metadata.sourceType) formData.append('sourceType', metadata.sourceType);
  if (metadata.sourceOrganization) formData.append('sourceOrganization', metadata.sourceOrganization);
  if (metadata.description) formData.append('description', metadata.description);
  if (metadata.sourceUrl) formData.append('sourceUrl', metadata.sourceUrl);
  if (metadata.status) formData.append('status', metadata.status);

  const res = await apiRequest('/knowledge/upload', {
    method: 'POST',
    body: formData,
  });

  return res.source || res;
}

/**
 * Add a direct text entry or website reference metadata
 */
export async function addKnowledgeText(data) {
  const res = await apiRequest('/knowledge/text', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return res.source || res;
}

/**
 * Update an existing Knowledge Source document
 */
export async function updateKnowledgeSource(id, data) {
  const res = await apiRequest(`/knowledge/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  return res.source || res;
}

/**
 * Update knowledge source status (e.g. active, inactive, archived)
 */
export async function updateKnowledgeSourceStatus(id, status) {
  const res = await apiRequest(`/knowledge/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return res.source || res;
}

/**
 * Delete a trusted knowledge source
 */
export async function deleteKnowledgeSource(id) {
  const res = await apiRequest(`/knowledge/${id}`, {
    method: 'DELETE',
  });

  return res;
}
