/**
 * qrToken.queries.js
 * SQLite-only — runs on local server only.
 * Online server does not need this table.
 */
const db = require('../index')

const QrTokenQueries = {

  findByToken: (token) => {
    return db.prepare('SELECT * FROM qr_tokens WHERE token = ?').get(token) ?? null
  },

  create: ({ shopId, token, expiresAt }) => {
    db.prepare(`
      INSERT INTO qr_tokens (shop_id, token, expires_at) VALUES (?, ?, ?)
    `).run(shopId, token, expiresAt)
    return QrTokenQueries.findByToken(token)
  },

  /**
   * Validate — returns row only if token exists, unused, and not expired.
   */
  validate: (token) => {
    return db.prepare(`
      SELECT * FROM qr_tokens
      WHERE token = ?
        AND used_at IS NULL
        AND expires_at > datetime('now')
    `).get(token) ?? null
  },

  /**
   * Consume a token — mark used + link session.
   */
  consume: (tokenId, sessionId) => {
    db.prepare(`
      UPDATE qr_tokens
      SET used_at = datetime('now'), session_id = ?
      WHERE token_id = ?
    `).run(sessionId, tokenId)
  },

  cleanupExpired: () => {
    db.prepare(`
      DELETE FROM qr_tokens
      WHERE used_at IS NULL AND expires_at < datetime('now', '-1 day')
    `).run()
  },
}

module.exports = QrTokenQueries
