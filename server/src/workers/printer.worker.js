/**
 * printer.worker.js
 *
 * Manages heartbeat checks with connected printers via IPP.
 * Periodically polls configured printers to check availability.
 * (Stub for initial implementation — IPP integration TBD)
 */

const logger = require('../utils/logger')

const startPrinterWorker = () => {
  logger.info('[printer.worker] Printer heartbeat worker started (stub mode).')
  // TODO: Implement IPP-based printer polling here
  // e.g. setInterval(() => { checkAllPrinters() }, 30000)
}

module.exports = { startPrinterWorker }
