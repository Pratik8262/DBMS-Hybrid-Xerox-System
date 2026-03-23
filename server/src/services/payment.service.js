/**
 * services/payment.service.js
 * Razorpay order creation and payment verification.
 * All Razorpay interactions go through here — never in controllers.
 */

const Razorpay = require('razorpay')
const { verifyRazorpaySignature } = require('../utils/crypto')
const { generateUuid }            = require('../utils/uuid')
const { AppError, ERRORS }        = require('../constants/errors')
const { PaymentQueries, PrintJobQueries } = require('../db/queries')
const logger                      = require('../utils/logger')

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const PaymentService = {

  /**
   * Create a Razorpay order and a pending payment row in DB.
   *
   * @param {number} jobId
   * @param {number} amount  - Total cost in INR (e.g. 12.50)
   * @param {string} method  - Payment method enum
   * @param {string} paymentGroupId - Optional grouping ID for batch jobs
   * @returns {{ payment, razorpayOrder }}
   */
  createOrder: async (jobId, amount, method = 'upi', paymentGroupId = null) => {
    // Amount in paise (Razorpay requires integer paise)
    const amountPaise = Math.round(amount * 100)

    let razorpayOrder
    try {
      razorpayOrder = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `job_${jobId}`,
      })
    } catch (err) {
      logger.error(`[payment.service] Razorpay order creation failed: ${err.message}`)
      throw new AppError(ERRORS.PAYMENT_ORDER_FAILED)
    }

    const payment = await PaymentQueries.create({
      uuid:               generateUuid(),
      job_id:             jobId,
      payment_group_id:   paymentGroupId || jobId, // use passed group OR fallback to jobId
      method,
      amount,
      razorpay_order_id:  razorpayOrder.id,
    })

    logger.info(`[payment.service] Order created group=${payment.payment_group_id} rp_order=${razorpayOrder.id} amount=₹${amount}`)

    return { payment, razorpayOrder }
  },

  /**
   * Verify Razorpay signature and mark payment as successful.
   * Called after the customer completes checkout in the browser.
   *
   * @param {string} razorpayOrderId
   * @param {string} razorpayPaymentId
   * @param {string} razorpaySignature
   * @returns {Object} Updated payment row
   */
  verifyAndCapture: async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    // 1. Find the pending payment row
    const payment = await PaymentQueries.findByRazorpayOrderId(razorpayOrderId)
    if (!payment) throw new AppError(ERRORS.PAYMENT_NOT_FOUND)

    // 2. Idempotency — already processed
    if (payment.status === 'success') {
      logger.warn(`[payment.service] Duplicate verify attempt for order=${razorpayOrderId}`)
      throw new AppError(ERRORS.PAYMENT_ALREADY_SUCCESS)
    }

    // 3. Verify HMAC signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
    if (!isValid) {
      await PaymentQueries.markFailed(payment.payment_id)
      logger.warn(`[payment.service] Signature mismatch order=${razorpayOrderId}`)
      throw new AppError(ERRORS.PAYMENT_VERIFICATION_FAILED)
    }

    // 4. Mark payment success
    const updatedPayment = await PaymentQueries.markSuccess(payment.payment_id, {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature:  razorpaySignature,
    })

    // 5. Update associated jobs to 'queued'
    if (payment.payment_group_id) {
      await PrintJobQueries.updateStatusByGroupId(payment.payment_group_id, 'queued')
      logger.info(`[payment.service] Batch jobs queued group=${payment.payment_group_id}`)
    } else if (payment.job_id) {
      await PrintJobQueries.updateStatus(payment.job_id, 'queued')
      logger.info(`[payment.service] Single job queued id=${payment.job_id}`)
    }

    return updatedPayment
  },

  /**
   * Handle Razorpay webhook event `payment.captured`.
   * Acts as a safety net if browser closes before verifyAndCapture runs.
   * Always idempotent.
   *
   * @param {Object} event - Parsed webhook payload
   */
  handleWebhookCapture: async (event) => {
    const entity    = event.payload?.payment?.entity
    const paymentId = entity?.id
    const orderId   = entity?.order_id

    if (!paymentId || !orderId) {
      logger.warn('[payment.service] Webhook missing payment entity fields')
      return
    }

    // Idempotency check
    const existing = await PaymentQueries.findByRazorpayPaymentId(paymentId)
    if (existing?.status === 'success') {
      logger.info(`[payment.service] Webhook: payment already success rp_payment=${paymentId}`)
      return
    }

    const payment = await PaymentQueries.findByRazorpayOrderId(orderId)
    if (!payment) {
      logger.warn(`[payment.service] Webhook: no payment found for order=${orderId}`)
      return
    }

    await PaymentQueries.markSuccess(payment.payment_id, {
      razorpay_payment_id: paymentId,
      razorpay_signature:  'webhook',  // no client sig in webhook flow
    })

    await PrintJobQueries.updateStatus(payment.job_id, 'queued')

    logger.info(`[payment.service] Webhook captured job=${payment.job_id} rp_payment=${paymentId}`)
  },

}

module.exports = PaymentService
