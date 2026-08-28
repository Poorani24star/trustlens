const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure backend/uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.zip', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error(`Unsupported file type '${ext}'. Allowed types: PDF, DOCX, DOC, TXT, ZIP, JPG, JPEG, PNG.`);
    err.statusCode = 400;
    cb(err, false);
  }
}

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

/**
 * Express Middleware Wrapper for single file upload (Error Detection)
 */
function handleSingleUpload(fieldName = 'file') {
  const upload = multerInstance.single(fieldName);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size exceeds maximum limit of 25MB.'
            });
          }
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
          });
        }
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || 'File upload failed.'
        });
      }
      next();
    });
  };
}

/**
 * Express Middleware Wrapper for multi-file upload (Copied Content Detection)
 */
function handleMultipleUpload(fieldName = 'files', maxCount = 10) {
  const upload = multerInstance.array(fieldName, maxCount);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'One or more files exceed the maximum size limit of 25MB.'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: `Maximum allowed files per upload is ${maxCount}.`
            });
          }
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
          });
        }
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || 'File upload failed.'
        });
      }
      next();
    });
  };
}

module.exports = {
  handleSingleUpload,
  handleMultipleUpload,
  uploadsDir,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES
};
