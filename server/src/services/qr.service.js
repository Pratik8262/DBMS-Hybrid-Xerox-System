/**
 * services/qr.service.js
 * QR token generation and validation for offline hotspot flow.
 * Local server only.
 */

const { generateSecureToken } = require('../utils/crypto')
const { QrTokenQueries }      = require('../db/queries')
const { AppError, ERRORS }    = require('../constants/errors')
const logger                  = require('../utils/logger')

const QR_TTL_MINUTES = parseInt(process.env.QR_TOKEN_TTL_MINUTES || '10', 10)

const QrService = {

  /**
   * Generate a new QR token for a shop.
   * Returns the full URL to encode into the QR image.
   *
   * @param {number} shopId
   * @param {string} localIp  - Shop's hotspot IP (from shop_address.local_ip)
   * @returns {{ token, url, expiresAt }}
   */
  generate: (shopId, localIp) => {
    const token     = generateSecureToken(32)
    const expiresAt = new Date(Date.now() + QR_TTL_MINUTES * 60 * 1000).toISOString()

    QrTokenQueries.create({ shopId, token, expiresAt })

    const url = `http://${localIp}:${process.env.PORT || 3001}/?token=${token}`

    logger.info(`[qr.service] Token generated shop=${shopId} expires=${expiresAt}`)

    return { token, url, expiresAt }
  },

  /**
   * Validate a token from an incoming request.
   * Returns the token row if valid. Throws AppError if not.
   *
   * @param {string} token
   * @returns {Object} qr_tokens row
   */
  validate: (token) => {
    const row = QrTokenQueries.validate(token)
    if (!row) throw new AppError(ERRORS.QR_TOKEN_INVALID)
    return row
  },

  /**
   * Consume a token — marks it used and links to a session.
   * Call this the moment the customer opens the upload UI.
   *
   * @param {number} tokenId
   * @param {number} sessionId
   */
  consume: (tokenId, sessionId) => {
    QrTokenQueries.consume(tokenId, sessionId)
    logger.info(`[qr.service] Token consumed token_id=${tokenId} session=${sessionId}`)
  },
}

module.exports = QrService
