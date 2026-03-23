/**
 * local.js — Local server entry point (Raspberry Pi / shop mini PC)
 * Starts HTTP server + outbox sync worker + printer heartbeat worker
 */

require('dotenv').config({ path: '.env.local' })
process.env.SERVER_MODE = 'local'

const http   = require('http')
const app    = require('./src/app')
const { startOutboxWorker }  = require('./src/workers/outbox.worker')
const { startPrinterWorker } = require('./src/workers/printer.worker')
const { startCleanupWorker } = require('./src/workers/cleanup.worker')
const { getLocalIp }         = require('./src/utils/network')
const ShopQueries            = require('./src/db/queries/shop.queries')
const logger = require('./src/utils/logger')

const PORT = process.env.PORT || 3001

const httpServer = http.createServer(app)

httpServer.listen(PORT, '0.0.0.0', async () => {
  const localIp = getLocalIp()
  logger.info(`✓ Local server running on port ${PORT} (LAN accessible: http://${localIp}:${PORT})`)
  
  // Auto-record local IP for QR code generation
  try {
    if (process.env.SHOP_ID) {
      await ShopQueries.updateLocalIp(process.env.SHOP_ID, localIp)
      logger.info(`✓ Registered local IP ${localIp} for Shop ID ${process.env.SHOP_ID}`)
    }
  } catch (err) {
    logger.error(`Failed to register local IP: ${err.message}`)
  }

  startOutboxWorker()
  startPrinterWorker()
  startCleanupWorker()
})

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`)
})
