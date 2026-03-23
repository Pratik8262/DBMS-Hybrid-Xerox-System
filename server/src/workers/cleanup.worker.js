const cron = require('node-cron')
const fs = require('fs')
const path = require('path')
const PrintJobQueries = require('../db/queries/printJob.queries')
const FileQueries = require('../db/queries/file.queries')
const StorageQueries = require('../db/queries/storage.queries')
const CloudinaryService = require('../services/cloudinary.service')
const logger = require('../utils/logger')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')

/**
 * Cleanup expired storage records and physical files.
 */
const cleanupExpiredStorage = async () => {
  try {
    const expired = await StorageQueries.findExpired()
    if (expired.length > 0) {
      logger.info(`[cleanup-worker] Found ${expired.length} expired storage records to delete`)
    }

    for (const storage of expired) {
      try {
        if (storage.storage_type === 'cloudinary' && storage.checksum) {
          // checksum holds the public_id
          await CloudinaryService.delete(storage.checksum)
        } else if (storage.storage_type === 'local' && storage.path) {
          const fullPath = path.isAbsolute(storage.path) 
            ? storage.path 
            : path.join(__dirname, '../../', storage.path.replace(/^\//, ''))
          
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
            logger.info(`[cleanup-worker] Deleted local file: ${fullPath}`)
          }
        }

        // Remove from DB
        await StorageQueries.delete(storage.storage_id)
        logger.debug(`[cleanup-worker] Deleted storage record ID=${storage.storage_id}`)
      } catch (err) {
        logger.error(`[cleanup-worker] Error deleting storage ID=${storage.storage_id}: ${err.message}`)
      }
    }
  } catch (err) {
    logger.error(`[cleanup-worker] Storage Cleanup Error: ${err.message}`)
  }
}

/**
 * Main cleanup function.
 */
const performCleanup = async () => {
  logger.info('[cleanup-worker] Starting 24h cleanup cycle')
  
  try {
    // 1. First, cleanup physical storage (Rule 10)
    await cleanupExpiredStorage()

    // 2. Then, expire jobs done or cancelled > 24 hours ago
    const oldJobs = await PrintJobQueries.findOldCompleted(24)
    if (oldJobs.length > 0) {
      logger.info(`[cleanup-worker] Found ${oldJobs.length} eligible jobs for status expiry`)
    }

    for (const job of oldJobs) {
      try {
        await PrintJobQueries.updateStatus(job.job_id, 'cancelled')
        
        // Also mark file as deleted if still ready
        const file = await FileQueries.findById(job.file_id)
        if (file && file.status === 'ready') {
          await FileQueries.updateStatus(file.file_id, 'deleted')
        }
      } catch (jobErr) {
        logger.error(`[cleanup-worker] Failed to expire job_id=${job.job_id}: ${jobErr.message}`)
      }
    }
    
    logger.info('[cleanup-worker] Cycle complete')
  } catch (err) {
    logger.error(`[cleanup-worker] Global Cleanup Error: ${err.message}`)
  }
}

/**
 * Start the cleanup worker.
 */
const startCleanupWorker = () => {
  cron.schedule('0 * * * *', async () => {
    await performCleanup()
  })
  
  logger.info('[cleanup-worker] Started — running hourly')
}

module.exports = { startCleanupWorker, performCleanup }
