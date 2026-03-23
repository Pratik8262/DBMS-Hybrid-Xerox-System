const paymentService = require('../services/payment.service')
const { verifyWebhook } = require('../utils/crypto')
const logger = require('../utils/logger')

const razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    
    // Security: Verify webhook signature using the raw body buffer
    // For this to work, app.use('/api/webhooks', express.raw({ type: 'application/json' }))
    // must be mounted BEFORE express.json() in app.js
    const isValid = verifyWebhook(req.body, signature, process.env.RAZORPAY_WEBHOOK_SECRET)
    if (!isValid) {
      logger.warn('[webhook.controller] Invalid Razorpay webhook signature')
      return res.status(400).send('Invalid signature')
    }

    // Since express.raw was used, req.body is a Buffer.
    const event = JSON.parse(req.body.toString('utf8'))

    if (event.event === 'payment.captured') {
      await paymentService.handleWebhookCapture(event)
    }

    // Always return 200 OK quickly for webhooks
    res.status(200).send('OK')
  } catch (error) {
    logger.error(`[webhook.controller] Error: ${error.message}`)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = { razorpayWebhook }
