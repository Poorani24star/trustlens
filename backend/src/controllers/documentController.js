const { registerUpload } = require('../services/uploadRegistryService');

/**
 * Controller for Error Detection — Single document upload
 */
async function uploadSingle(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a document to upload.'
      });
    }

    const userId = req.user ? req.user.uid : 'anonymous';

    const fileMetadata = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadPath: req.file.path,
      uploadedAt: new Date().toISOString(),
    };

    const session = registerUpload(userId, 'single', fileMetadata);

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      uploadId: session.uploadId,
      file: fileMetadata
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller for Copied Content Detection — Multiple files or ZIP archive upload
 */
async function uploadMultiple(req, res, next) {
  try {
    const rawFiles = req.files || (req.file ? [req.file] : []);

    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded. Please select document files or a ZIP archive to upload.'
      });
    }

    const userId = req.user ? req.user.uid : 'anonymous';

    const fileList = rawFiles.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      uploadPath: f.path,
      uploadedAt: new Date().toISOString(),
    }));

    const uploadType = req.file && req.file.originalname.toLowerCase().endsWith('.zip') ? 'zip' : 'multiple';
    const session = registerUpload(userId, uploadType, fileList);

    return res.status(201).json({
      success: true,
      message: `${fileList.length} file(s) uploaded successfully`,
      uploadId: session.uploadId,
      files: fileList
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadSingle,
  uploadMultiple,
};
