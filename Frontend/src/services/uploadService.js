import { apiRequest } from './apiClient';

/**
 * Upload single or multiple documents for Error Detection
 */
export async function uploadErrorDetectionDocument(filesOrFile) {
  const formData = new FormData();
  let endpoint = '/documents/upload/single';

  if (Array.isArray(filesOrFile) && filesOrFile.length > 1) {
    endpoint = '/documents/upload/multiple';
    filesOrFile.forEach(f => formData.append('files', f));
  } else {
    const file = Array.isArray(filesOrFile) ? filesOrFile[0] : filesOrFile;
    formData.append('file', file);
  }

  const res = await apiRequest(endpoint, {
    method: 'POST',
    body: formData,
  });

  return res;
}

/**
 * Upload multiple documents or ZIP file for Copied Content Analysis
 */
export async function uploadCopiedContentDocuments(filesOrZip) {
  const formData = new FormData();
  let endpoint = '/documents/upload/multiple';

  if (filesOrZip && (filesOrZip.name?.endsWith('.zip') || filesOrZip.type?.includes('zip'))) {
    formData.append('zipFile', filesOrZip);
    endpoint = '/documents/upload/zip';
  } else if (Array.isArray(filesOrZip)) {
    filesOrZip.forEach(file => {
      formData.append('files', file);
    });
  } else if (filesOrZip instanceof FileList) {
    Array.from(filesOrZip).forEach(file => {
      formData.append('files', file);
    });
  } else {
    formData.append('files', filesOrZip);
  }

  const res = await apiRequest(endpoint, {
    method: 'POST',
    body: formData,
  });

  return res;
}
