/**
 * constants/errors.js
 * All error codes used across the application.
 * Controllers/services throw these — error middleware formats them.
 */

const ERRORS = {
  // Auth
  AUTH_INVALID_CREDENTIALS:   { code: 'AUTH_INVALID_CREDENTIALS',   status: 401, message: 'Invalid phone or password' },
  AUTH_TOKEN_MISSING:         { code: 'AUTH_TOKEN_MISSING',         status: 401, message: 'Authentication token required' },
  AUTH_TOKEN_INVALID:         { code: 'AUTH_TOKEN_INVALID',         status: 401, message: 'Invalid or expired token' },
  AUTH_FORBIDDEN:             { code: 'AUTH_FORBIDDEN',             status: 403, message: 'You do not have permission to perform this action' },

  // User
  USER_NOT_FOUND:             { code: 'USER_NOT_FOUND',             status: 404, message: 'User not found' },
  USER_PHONE_EXISTS:          { code: 'USER_PHONE_EXISTS',          status: 409, message: 'Phone number already registered' },
  USER_EMAIL_EXISTS:          { code: 'USER_EMAIL_EXISTS',          status: 409, message: 'Email already registered' },

  // Shop
  SHOP_NOT_FOUND:             { code: 'SHOP_NOT_FOUND',             status: 404, message: 'Shop not found' },
  SHOP_INACTIVE:              { code: 'SHOP_INACTIVE',              status: 400, message: 'Shop is not currently active' },

  // File
  FILE_NOT_FOUND:             { code: 'FILE_NOT_FOUND',             status: 404, message: 'File not found' },
  FILE_TOO_LARGE:             { code: 'FILE_TOO_LARGE',             status: 413, message: 'File exceeds maximum allowed size' },
  FILE_TYPE_UNSUPPORTED:      { code: 'FILE_TYPE_UNSUPPORTED',      status: 415, message: 'File type not supported' },
  FILE_NOT_READY:             { code: 'FILE_NOT_READY',             status: 400, message: 'File is not ready for printing' },

  // Print job
  JOB_NOT_FOUND:              { code: 'JOB_NOT_FOUND',              status: 404, message: 'Print job not found' },
  JOB_CANNOT_CANCEL:          { code: 'JOB_CANNOT_CANCEL',          status: 400, message: 'Job cannot be cancelled in its current state' },
  JOB_NO_PRICING:             { code: 'JOB_NO_PRICING',             status: 400, message: 'No pricing rule found for selected settings' },

  // Printer
  PRINTER_NOT_FOUND:          { code: 'PRINTER_NOT_FOUND',          status: 404, message: 'Printer not found' },
  PRINTER_UNAVAILABLE:        { code: 'PRINTER_UNAVAILABLE',        status: 503, message: 'No printers are currently available' },

  // Payment
  PAYMENT_NOT_FOUND:          { code: 'PAYMENT_NOT_FOUND',          status: 404, message: 'Payment not found' },
  PAYMENT_ALREADY_SUCCESS:    { code: 'PAYMENT_ALREADY_SUCCESS',    status: 409, message: 'Payment already processed successfully' },
  PAYMENT_VERIFICATION_FAILED:{ code: 'PAYMENT_VERIFICATION_FAILED',status: 400, message: 'Payment signature verification failed' },
  PAYMENT_ORDER_FAILED:       { code: 'PAYMENT_ORDER_FAILED',       status: 502, message: 'Failed to create payment order' },

  // QR / Offline
  QR_TOKEN_INVALID:           { code: 'QR_TOKEN_INVALID',           status: 401, message: 'QR token is invalid or expired' },
  QR_TOKEN_USED:              { code: 'QR_TOKEN_USED',              status: 401, message: 'QR token has already been used' },

  // Pricing
  PRICING_NOT_FOUND:          { code: 'PRICING_NOT_FOUND',          status: 404, message: 'Pricing rule not found' },
  PRICING_DUPLICATE:          { code: 'PRICING_DUPLICATE',          status: 409, message: 'A pricing rule for this combination already exists' },

  // Sync
  SYNC_SECRET_INVALID:        { code: 'SYNC_SECRET_INVALID',        status: 401, message: 'Invalid sync secret' },

  // Generic
  VALIDATION_ERROR:           { code: 'VALIDATION_ERROR',           status: 422, message: 'Validation failed' },
  NOT_FOUND:                  { code: 'NOT_FOUND',                  status: 404, message: 'Resource not found' },
  SERVER_ERROR:               { code: 'SERVER_ERROR',               status: 500, message: 'An unexpected error occurred' },
}

/**
 * AppError — throw this anywhere; error middleware catches it.
 *
 * Usage:
 *   throw new AppError(ERRORS.JOB_NOT_FOUND)
 *   throw new AppError(ERRORS.VALIDATION_ERROR, { field: 'copies', issue: 'must be >= 1' })
 */
class AppError extends Error {
  constructor(errorDef, details = null) {
    super(errorDef.message)
    this.code    = errorDef.code
    this.status  = errorDef.status
    this.details = details
    this.isAppError = true
  }
}

module.exports = { ERRORS, AppError }
