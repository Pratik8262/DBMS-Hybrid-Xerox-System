/**
 * server.js — Online server entry point
 * Starts HTTP server + Socket.io
 */

require('dotenv').config()
process.env.SERVER_MODE = 'online'

const http   = require('http')
const app    = require('./src/app')
const { initSocket } = require('./src/config/socket')
const { startCleanupWorker } = require('./src/workers/cleanup.worker')
const logger = require('./src/utils/logger')

const PORT = process.env.PORT || 3000

const httpServer = http.createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  logger.info(`✓ Online server running on port ${PORT}`)
  startCleanupWorker()
})

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`)
})
