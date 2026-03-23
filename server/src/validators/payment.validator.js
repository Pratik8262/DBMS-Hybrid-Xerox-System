/**
 * validators/payment.validator.js
 * Zod schemas for payment creation and verification.
 */

const { z } = require('zod')

/**
 * POST /api/payments/create-order
 */
const createOrderSchema = z.object({
  body: z.object({
    job_id:            z.number({ required_error: 'job_id is required' }).int().positive(),
    amount:            z.number({ required_error: 'amount is required' }).positive(),
    method:            z.enum(['cash', 'upi', 'card', 'wallet', 'netbanking']).default('upi'),
    payment_group_id:  z.number().int().positive().optional().nullable(),
  }),
})

/**
 * POST /api/payments/verify
 */
const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id:   z.string({ required_error: 'razorpay_order_id is required' }).min(1),
    razorpay_payment_id: z.string({ required_error: 'razorpay_payment_id is required' }).min(1),
    razorpay_signature:  z.string({ required_error: 'razorpay_signature is required' }).min(1),
  }),
})

/**
 * GET /api/payments/:jobId
 */
const getPaymentSchema = z.object({
  params: z.object({
    jobId: z.string().regex(/^\d+$/, 'jobId must be numeric'),
  }),
})

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  getPaymentSchema,
}
