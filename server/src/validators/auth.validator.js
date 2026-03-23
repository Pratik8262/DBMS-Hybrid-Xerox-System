const { z } = require('zod')

const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(15).optional(),
    email: z.string().email().optional(),
    device_id: z.string().optional()
  }).refine(data => data.phone || data.email, {
    message: "Either phone or email must be provided"
  })
})

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    phone: z.string().min(10).max(15).optional(),
    email: z.string().email().optional(),
    device_id: z.string().optional()
  }).refine(data => data.phone || data.email, {
    message: "Either phone or email must be provided"
  })
})

module.exports = { loginSchema, registerSchema }
