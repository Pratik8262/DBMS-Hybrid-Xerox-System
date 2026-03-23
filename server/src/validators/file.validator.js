/**
 * validators/file.validator.js
 * Zod schemas for file-related API endpoints.
 */

const { z } = require('zod')

/**
 * DELETE /api/files/:id
 */
const deleteFileSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'File ID is required'),
  }),
})

/**
 * GET /api/files/:id
 */
const getFileSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'File ID is required'),
  }),
})

module.exports = {
  deleteFileSchema,
  getFileSchema,
}
