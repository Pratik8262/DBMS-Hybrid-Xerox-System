/**
 * middleware/error.middleware.js
 * Global error handler. Must be registered LAST in app.js.
 * All errors from controllers/services flow here via next(err).
 */

const logger = require('../utils/logger')

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  // Known application error
  if (err.isAppError) {
    logger.warn(`[${err.code}] ${req.method} ${req.path} — ${err.message}`)
    return res.status(err.status).json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
  }

  // Supabase / DB constraint errors
  if (err.code === '23505') {    // unique violation (PostgreSQL)
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'A record with this value already exists' },
    })
  }

  // SQLite constraint errors
  if (err.message?.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'A record with this value already exists' },
    })
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum allowed size' },
    })
  }

  // Unknown errors — log full stack, return generic message
  logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, { stack: err.stack })
  return res.status(500).json({
    success: false,
    error: {
      code:    'SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  })
}

module.exports = { errorMiddleware }
