/**
 * utils/crypto.js
 * HMAC-SHA256 utilities for Razorpay signature verification
 * and outbox sync secret validation.
 */

const crypto = require('crypto')

/**
 * Verify a Razorpay payment signature.
 * Razorpay signs: `${order_id}|${payment_id}` with the key secret.
 *
 * @param {string} orderId      - razorpay_order_id
 * @param {string} paymentId    - razorpay_payment_id
 * @param {string} signature    - razorpay_signature from client
 * @returns {boolean}
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

/**
 * Verify a Razorpay webhook signature.
 * Razorpay sends the raw body signed with the webhook secret.
 *
 * @param {string|Buffer} rawBody  - Raw request body (must NOT be parsed)
 * @param {string} signature       - x-razorpay-signature header value
 * @returns {boolean}
 */
const verifyRazorpayWebhook = (rawBody, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

/**
 * Verify outbox sync secret (shared between local and online servers).
 */
const verifySyncSecret = (headerSecret) => {
  const expected = process.env.ONLINE_SYNC_SECRET
  if (!expected || !headerSecret) return false
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(headerSecret)
  )
}

/**
 * Generate a cryptographically secure random token string.
 * Used for QR tokens.
 *
 * @param {number} bytes - Number of random bytes (default 32 → 64 char hex)
 * @returns {string}
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex')
}

module.exports = {
  verifyRazorpaySignature,
  verifyRazorpayWebhook,
  verifySyncSecret,
  generateSecureToken,
}
