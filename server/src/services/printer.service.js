/**
 * services/printer.service.js
 * IPP job submission and printer status management.
 * Used by printJob.controller to actually send jobs to physical printers.
 */

const ipp     = require('ipp')
const logger  = require('../utils/logger')
const { PrinterQueries, PrintJobQueries } = require('../db/queries')
const { AppError, ERRORS } = require('../constants/errors')

const PrinterService = {

  /**
   * Submit a print job to an IPP printer.
   * @param {number} jobId      - DB print_job ID
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {Object} settings   - { color_mode, sides, copies, orientation, paper_size }
   * @param {Object} printer    - { printer_id, ip_address, protocol, name }
   * @returns {Object} IPP response
   */
  submitJob: async (jobId, fileBuffer, settings, printer) => {
    if (!printer || !printer.ip_address) {
      throw new AppError(ERRORS.PRINTER_NOT_FOUND)
    }

    const printerUrl = PrinterService._buildPrinterUrl(printer)

    // Build IPP attributes from print settings
    const ippAttrs = {
      'operation-attributes-tag': {
        'requesting-user-name':  'PrintEasy',
        'job-name':              `PrintEasy-Job-${jobId}`,
        'document-format':       'application/octet-stream',
      },
      'job-attributes-tag': {
        'copies':                settings.copies ?? 1,
        'sides':                 PrinterService._mapSides(settings.sides),
        'print-color-mode':      PrinterService._mapColorMode(settings.color_mode),
        'orientation-requested': PrinterService._mapOrientation(settings.orientation),
        'media':                 PrinterService._mapPaperSize(settings.paper_size),
      },
    }

    return new Promise((resolve, reject) => {
      const p = ipp.Printer(printerUrl)
      const msg = {
        'operation-attributes-tag': ippAttrs['operation-attributes-tag'],
        'job-attributes-tag':       ippAttrs['job-attributes-tag'],
        data: fileBuffer,
      }

      p.execute('Print-Job', msg, (err, res) => {
        if (err) {
          logger.error(`[printer.service] IPP submission failed job=${jobId} printer=${printer.printer_id}: ${err.message}`)
          reject(err)
          return
        }

        const statusCode = res?.['operation-attributes-tag']?.['status-message'] ?? 'unknown'
        logger.info(`[printer.service] Job submitted job=${jobId} printer=${printer.name} status=${statusCode}`)
        resolve(res)
      })
    })
  },

  /**
   * Check if a printer is reachable via IPP.
   * @param {Object} printer - { ip_address, protocol }
   * @returns {boolean}
   */
  checkStatus: async (printer) => {
    const url = PrinterService._buildPrinterUrl(printer)
    return new Promise((resolve) => {
      const p = ipp.Printer(url)
      p.execute('Get-Printer-Attributes', {
        'operation-attributes-tag': {
          'requested-attributes': ['printer-state', 'printer-state-message'],
        },
      }, (err, res) => {
        if (err) {
          logger.debug(`[printer.service] Heartbeat failed ${url}: ${err.message}`)
          resolve(false)
          return
        }
        // printer-state: 3=idle, 4=processing, 5=stopped
        const state = res?.['printer-attributes-tag']?.['printer-state']
        resolve(state === 3 || state === 4)
      })
    })
  },

  /**
   * Run heartbeat for all printers in a shop.
   * Updates DB status to 'online' / 'offline' based on connectivity.
   * @param {number} shopId
   */
  heartbeatShop: async (shopId) => {
    const printers = await PrinterQueries.findByShop(shopId)
    for (const printer of printers) {
      try {
        const isAlive = await PrinterService.checkStatus(printer)
        const newStatus = isAlive ? 'online' : 'offline'
        if (printer.status !== newStatus) {
          await PrinterQueries.updateStatus(printer.printer_id, newStatus)
          logger.info(`[printer.service] Printer ${printer.name} status → ${newStatus}`)
        } else {
          await PrinterQueries.heartbeat(printer.printer_id)
        }
      } catch (err) {
        logger.warn(`[printer.service] Heartbeat error printer=${printer.printer_id}: ${err.message}`)
        await PrinterQueries.updateStatus(printer.printer_id, 'error')
      }
    }
  },

  /**
   * Find the best available printer for a job.
   * Prefers 'online' printers; returns null if none available.
   * @param {number} shopId
   * @returns {Object|null} printer row
   */
  pickPrinter: async (shopId) => {
    const printers = await PrinterQueries.findOnlineByShop(shopId)
    if (!printers || printers.length === 0) return null
    // Simple strategy: pick the first online printer
    // Future: pick by load, capability match, etc.
    return printers[0]
  },

  // ─── Private helpers ────────────────────────────────────────────────────────

  _buildPrinterUrl: (printer) => {
    const protocol = printer.protocol === 'ipp' ? 'ipp' : 'ipp'
    return `${protocol}://${printer.ip_address}/ipp/print`
  },

  _mapSides: (sides) => {
    const map = {
      simplex:       'one-sided',
      duplex_long:   'two-sided-long-edge',
      duplex_short:  'two-sided-short-edge',
    }
    return map[sides] ?? 'one-sided'
  },

  _mapColorMode: (colorMode) => {
    const map = { bw: 'monochrome', color: 'color', grayscale: 'monochrome' }
    return map[colorMode] ?? 'monochrome'
  },

  _mapOrientation: (orientation) => {
    // IPP orientation values: 3=portrait, 4=landscape
    return orientation === 'landscape' ? 4 : 3
  },

  _mapPaperSize: (paperSize) => {
    const map = {
      A4:     'iso_a4_210x297mm',
      A3:     'iso_a3_297x420mm',
      Letter: 'na_letter_8.5x11in',
      Legal:  'na_legal_8.5x14in',
    }
    return map[paperSize] ?? 'iso_a4_210x297mm'
  },
}

module.exports = PrinterService
