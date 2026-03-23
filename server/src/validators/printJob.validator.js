/**
 * validators/printJob.validator.js
 * Zod schemas for print job creation and management.
 */

const { z } = require('zod')

/**
 * POST /api/jobs
 */
const createJobSchema = z.object({
  body: z.object({
    file_id:    z.number({ required_error: 'file_id is required' }).int().positive(),
    session_id: z.number({ required_error: 'session_id is required' }).int().positive(),
    shop_id:    z.number({ required_error: 'shop_id is required' }).int().positive(),
    settings: z.object({
      color_mode:   z.enum(['bw', 'color', 'grayscale']).default('bw'),
      orientation:  z.enum(['portrait', 'landscape']).default('portrait'),
      scaling:      z.enum(['fit', 'fill', 'actual', 'custom']).default('fit'),
      sides:        z.enum(['simplex', 'duplex_long', 'duplex_short']).default('simplex'),
      paper_size:   z.enum(['A4', 'A3', 'Letter', 'Legal']).default('A4'),
      copies:       z.number().int().min(1).max(999).default(1),
    }),
    origin:     z.enum(['online', 'offline']).default('online'),
    priority:   z.number().int().min(1).max(10).optional().default(5),
  }),
})

/**
 * PATCH /api/jobs/:id/status  — shopkeeper status update
 */
const updateJobStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Job ID must be numeric'),
  }),
  body: z.object({
    status: z.enum(['queued', 'printing', 'done', 'failed', 'cancelled']),
    error_code: z.string().optional(),
  }),
})

/**
 * PATCH /api/jobs/:id/cancel
 */
const cancelJobSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Job ID must be numeric'),
  }),
})

module.exports = {
  createJobSchema,
  updateJobStatusSchema,
  cancelJobSchema,
}
