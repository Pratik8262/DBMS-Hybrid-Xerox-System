/**
 * validators/pricing.validator.js
 * Zod schemas for pricing management endpoints.
 */

const { z } = require('zod')

/**
 * POST /api/pricing
 */
const createPricingSchema = z.object({
  body: z.object({
    shop_id:          z.number({ required_error: 'shop_id is required' }).int().positive(),
    color_type:       z.enum(['bw', 'color', 'grayscale']),
    paper_size:       z.enum(['A4', 'A3', 'Letter', 'Legal']),
    finishing_type:   z.enum(['none', 'staple', 'binding', 'laminate']).default('none'),
    duplex_supported: z.boolean().default(false),
    price_per_page:   z.number().positive('price_per_page must be positive'),
  }),
})

/**
 * PATCH /api/pricing/:id
 */
const updatePricingSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Pricing ID must be numeric'),
  }),
  body: z.object({
    price_per_page:   z.number().positive().optional(),
    duplex_supported: z.boolean().optional(),
    finishing_type:   z.enum(['none', 'staple', 'binding', 'laminate']).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  }),
})

/**
 * GET /api/pricing/:shopId
 */
const getPricingSchema = z.object({
  params: z.object({
    shopId: z.string().regex(/^\d+$/, 'shopId must be numeric'),
  }),
})

module.exports = {
  createPricingSchema,
  updatePricingSchema,
  getPricingSchema,
}
