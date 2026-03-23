/**
 * config/razorpay.js
 *
 * Razorpay Node SDK initialisation.
 * Exports a single Razorpay instance used across payment.service.js
 * and webhook.controller.js.
 *
 * Requires:
 *   RAZORPAY_KEY_ID     — from Razorpay Dashboard → Settings → API Keys
 *   RAZORPAY_KEY_SECRET — keep secret, never expose to client
 */

const Razorpay = require('razorpay')
const logger   = require('../utils/logger')

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  // Warn but don't crash — local server runs without Razorpay
  logger.warn('[razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set. Payment features disabled.')
}

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
})

module.exports = razorpay
