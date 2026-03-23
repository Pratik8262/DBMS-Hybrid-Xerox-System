const { z } = require('zod')
const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    device_id: z.string().optional()
  })
})
module.exports = { updateUserSchema }
