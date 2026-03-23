const express = require('express')
const router = express.Router()
const webhookController = require('../controllers/webhook.controller')

// No auth middleware here! Webhooks must be public.
router.post('/razorpay', webhookController.razorpayWebhook)

module.exports = router
