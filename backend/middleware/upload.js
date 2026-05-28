'use strict';
/**
 * backend/middleware/upload.js
 * Multer configuration for image upload handling.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Store uploads in memory — we pass the buffer directly to yoloService
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    // multer v2: pass an Error (not MulterError) from fileFilter
    const err = new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`);
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
});

/**
 * Multer error handler middleware — must be called AFTER the multer middleware.
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({ error: 'file_too_large', message: 'Image must be under 10 MB.' });
    }
    return res.status(422).json({ error: 'upload_error', message: err.message });
  }
  if (err && err.code === 'INVALID_FILE_TYPE') {
    return res.status(422).json({ error: 'invalid_file_type', message: err.message });
  }
  return next(err);
}

module.exports = { upload, handleUploadError };
