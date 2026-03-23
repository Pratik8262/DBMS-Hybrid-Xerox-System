/**
 * middleware/rateLimit.middleware.js
 * Rate limiting using express-rate-limit.
 * Apply these to sensitive routes (auth, upload, payments).
 */

const rateLimit = require('express-rate-limit')
const { AppError, ERRORS } = require('../constants/errors')

/**
 * Standard API rate limit: 100 requests per 15 minutes.
 * Applied globally via app.js.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        details: null,
      },
    })
  },
})

/**
 * Strict limiter for auth routes: 10 attempts per 15 minutes.
 * Prevents brute force on login/register.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please wait 15 minutes.',
        details: null,
      },
    })
  },
})

/**
 * Upload limiter: 20 uploads per 10 minutes per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many uploads. Please wait before trying again.',
        details: null,
      },
    })
  },
})

/**
 * Payment limiter: 5 payment attempts per 10 minutes.
 * Prevents payment fraud attempts.
 */
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
        message: 'Too many payment attempts. Please wait before retrying.',
        details: null,
      },
    })
  },
})

module.exports = {
  globalLimiter,
  authLimiter,
  uploadLimiter,
  paymentLimiter,
}
