/**
 * middleware/upload.middleware.js
 * Multer config for file uploads.
 * Files are held in memory buffer then pushed to Cloudinary.
 * Max size: 50MB. Allowed types match the files.type ENUM.
 */

const multer = require('multer')
const { AppError, ERRORS } = require('../constants/errors')

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain',
])

const MIME_TO_TYPE = {
  'application/pdf':        'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg':             'jpg',
  'image/png':              'png',
  'text/plain':             'txt',
}

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new AppError(ERRORS.FILE_TYPE_UNSUPPORTED), false)
  }
  // Attach the normalised type to the file object for downstream use
  file.normalizedType = MIME_TO_TYPE[file.mimetype]
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB
})

module.exports = { upload, MIME_TO_TYPE }
