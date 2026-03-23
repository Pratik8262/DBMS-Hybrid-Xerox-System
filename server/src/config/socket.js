/**
 * config/socket.js
 * Socket.io server setup. Rooms:
 *   shop:{shopId}  — shopkeeper joins this to receive new job alerts
 *   job:{jobId}    — customer joins this to receive status updates
 */

const { Server } = require('socket.io')
const logger     = require('../utils/logger')
const { setIo }  = require('../services/notification.service')

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || '*',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    logger.debug(`[socket] Connected ${socket.id}`)

    // Customer subscribes to a specific job's status
    socket.on('join:job', (jobId) => {
      socket.join(`job:${jobId}`)
      logger.debug(`[socket] ${socket.id} joined job:${jobId}`)
    })

    // Shopkeeper subscribes to their shop's job feed
    socket.on('join:shop', (shopId) => {
      socket.join(`shop:${shopId}`)
      logger.debug(`[socket] ${socket.id} joined shop:${shopId}`)
    })

    socket.on('disconnect', () => {
      logger.debug(`[socket] Disconnected ${socket.id}`)
    })
  })

  // Inject io into notification service
  setIo(io)

  return io
}

module.exports = { initSocket }
