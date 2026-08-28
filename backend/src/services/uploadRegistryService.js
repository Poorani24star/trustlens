// In-memory store for upload session metadata
const uploadRegistry = new Map();

/**
 * Registers an upload session in memory
 */
function registerUpload(userId, uploadType, files) {
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const normalizedFiles = Array.isArray(files) ? files : [files];

  const entry = {
    uploadId,
    userId,
    uploadType, // 'single' | 'multiple' | 'zip'
    files: normalizedFiles,
    createdAt: Date.now(),
  };

  uploadRegistry.set(uploadId, entry);
  return entry;
}

/**
 * Retrieves an upload session by uploadId
 */
function getUpload(uploadId) {
  return uploadRegistry.get(uploadId) || null;
}

/**
 * Validates that an upload session exists and belongs to the given userId
 */
function validateOwnership(uploadId, userId) {
  if (!uploadId) {
    const err = new Error('uploadId is required');
    err.statusCode = 400;
    throw err;
  }

  const entry = uploadRegistry.get(uploadId);

  if (!entry) {
    const err = new Error('Upload session not found or expired');
    err.statusCode = 404;
    throw err;
  }

  if (entry.userId !== userId) {
    const err = new Error('You do not have permission to access this upload session');
    err.statusCode = 403;
    throw err;
  }

  return entry;
}

module.exports = {
  registerUpload,
  getUpload,
  validateOwnership,
};
