const paymentService = require('../services/payment.service')
const { sendSuccess, sendError } = require('../utils/response')
const PaymentQueries = require('../db/queries/payment.queries')
const { ActivityLogQueries } = require('../db/queries/activityLog.queries')
const { NotificationService } = require('../services/notification.service')
const logger = require('../utils/logger')
const { EVENT_TYPE, NOTIFICATION_TYPE } = require('../constants/enums')

const createOrder = async (req, res, next) => {
  try {
    const { job_id, amount, method, payment_group_id = null } = req.body
    if (!job_id || !amount) {
      return res.status(400).json({ success: false, message: 'job_id and amount are required' })
    }
    const result = await paymentService.createOrder(job_id, amount, method, payment_group_id)
    sendSuccess(res, result, 'Razorpay order created')
  } catch (error) {
    logger.error(`[payment.controller] createOrder failed: ${error.message}`, error)
    next(error)
  }
}

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    const result = await paymentService.verifyAndCapture(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    sendSuccess(res, result, 'Payment verified successfully')

    // Log payment event and notify customer (fire-and-forget)
    const userId = req.user?.user_id ?? null
    ActivityLogQueries.write({
      sessionId: result?.session_id ?? null,
      userId,
      shopId: result?.shop_id ?? null,
      eventType: EVENT_TYPE.PAYMENT,
      description: `Payment verified: order ${razorpay_order_id}`,
    }).catch(() => {})

    if (userId && result?.job_id) {
      NotificationService.notifyCustomer(
        userId, result.job_id, NOTIFICATION_TYPE.PAYMENT,
        'Your payment was successful. Your job is now queued for printing.'
      ).catch(() => {})
    }
  } catch (error) { next(error) }
}

const getPayment = async (req, res, next) => {
  try {
    sendSuccess(res, null, 'Fetch payment by jobId not fully mocked in queries')
  } catch (error) { next(error) }
}

module.exports = { createOrder, verifyPayment, getPayment }
