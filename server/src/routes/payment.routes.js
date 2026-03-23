const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/payment.controller')
const { validate } = require('../middleware/validate.middleware')
const { authenticate } = require('../middleware/auth.middleware')
const { paymentLimiter } = require('../middleware/rateLimit.middleware')
const { createOrderSchema, verifyPaymentSchema, getPaymentSchema } = require('../validators/payment.validator')

router.post('/create-order', authenticate, paymentLimiter, validate(createOrderSchema), paymentController.createOrder)
router.post('/verify',       authenticate, paymentLimiter, validate(verifyPaymentSchema), paymentController.verifyPayment)
router.get('/:jobId',        authenticate, validate(getPaymentSchema), paymentController.getPayment)

module.exports = router
