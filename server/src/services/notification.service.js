/**
 * services/notification.service.js
 * Creates DB notifications and emits socket events to the right room.
 */

const { NotificationQueries } = require('../db/queries')
const { NOTIFICATION_TYPE, NOTIFICATION_TARGET } = require('../constants/enums')
const logger = require('../utils/logger')

let io  // Set by socket.js after initialization

const setIo = (socketIo) => { io = socketIo }

const NotificationService = {

  /**
   * Notify a customer about their job status.
   */
  notifyCustomer: async (userId, jobId, type, message) => {
    await NotificationQueries.create({
      user_id:     userId,
      target_type: NOTIFICATION_TARGET.CUSTOMER,
      type,
      job_id:      jobId,
      message,
    })
    if (io) {
      io.to(`job:${jobId}`).emit('job:update', { jobId, type, message })
    }
    logger.info(`[notification] Customer notified user=${userId} job=${jobId} type=${type}`)
  },

  /**
   * Notify shopkeeper about a new job or alert.
   */
  notifyShopkeeper: async (shopId, jobId, type, message) => {
    await NotificationQueries.create({
      shop_id:     shopId,
      target_type: NOTIFICATION_TARGET.SHOPKEEPER,
      type,
      job_id:      jobId,
      message,
    })
    if (io) {
      io.to(`shop:${shopId}`).emit('job:new', { jobId, type, message })
    }
    logger.info(`[notification] Shopkeeper notified shop=${shopId} job=${jobId} type=${type}`)
  },

  /**
   * Fire both — used when a job is confirmed after payment.
   */
  jobConfirmed: async ({ userId, shopId, jobId }) => {
    await NotificationService.notifyCustomer(
      userId, jobId, NOTIFICATION_TYPE.JOB_COMPLETE,
      'Your print job has been confirmed and is queued.'
    )
    await NotificationService.notifyShopkeeper(
      shopId, jobId, NOTIFICATION_TYPE.NEW_JOB,
      `New print job #${jobId} received.`
    )
  },
}

module.exports = { NotificationService, setIo }
