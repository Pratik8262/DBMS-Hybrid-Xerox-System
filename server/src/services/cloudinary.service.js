/**
 * services/cloudinary.service.js
 * All Cloudinary interactions. Upload, delete, get secure URL.
 */

const cloudinary = require('../config/cloudinary')
const { generateUuid } = require('../utils/uuid')
const logger = require('../utils/logger')

const CloudinaryService = {

  /**
   * Upload a file buffer to Cloudinary.
   * Returns the Cloudinary response (public_id, secure_url, bytes, pages, etc.)
   *
   * @param {Buffer} buffer       - File buffer from multer memoryStorage
   * @param {string} mimeType     - e.g. 'application/pdf'
   * @param {string} originalName - Original filename for reference
   * @returns {Object} Cloudinary upload result
   */
  upload: async (buffer, mimeType, originalName) => {
    const publicId = `printeasy/${generateUuid()}`

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id:     publicId,
          resource_type: 'auto',         // auto handles images and documents gracefully
          use_filename:  false,
          overwrite:     false,
          tags:          ['printeasy'],
        },
        (error, result) => {
          if (error) return reject(error)
          resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    logger.info(`[cloudinary] Uploaded public_id=${result.public_id} size=${result.bytes}B`)
    return result
  },

  /**
   * Delete a file from Cloudinary by public_id.
   * Called when a job is done/cancelled and the 24h cleanup window expires.
   */
  delete: async (publicId) => {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
      logger.info(`[cloudinary] Deleted public_id=${publicId}`)
    } catch (err) {
      logger.warn(`[cloudinary] Delete failed for public_id=${publicId}: ${err.message}`)
    }
  },

  /**
   * Get a signed, time-limited URL for downloading a file.
   * Used to send the file URL to the printer service.
   *
   * @param {string} publicId
   * @param {number} expiresInSeconds - Default 1 hour
   */
  getSignedUrl: (publicId, expiresInSeconds = 3600) => {
    return cloudinary.utils.private_download_url(publicId, '', {
      resource_type: 'raw',
      expires_at:    Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  },
}

module.exports = CloudinaryService
