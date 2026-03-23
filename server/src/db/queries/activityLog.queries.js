/**
 * activityLog.queries.js
 */
const db = require('../index')

const ActivityLogQueries = {

  findBySession: async (sessionId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM activity_log WHERE session_id = ? ORDER BY created_at ASC').all(sessionId)
    }
    const { data, error } = await db
      .from('activity_log').select('*').eq('session_id', sessionId).order('created_at')
    if (error) throw error
    return data
  },

  findByUser: async (userId, { limit = 50, offset = 0 } = {}) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(userId, limit, offset)
    }
    const { data, error } = await db
      .from('activity_log').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) throw error
    return data
  },

  write: async ({ sessionId, userId, shopId, eventType, description = null }) => {
    if (db._mode === 'sqlite') {
      db.prepare(`
        INSERT INTO activity_log (session_id, user_id, shop_id, event_type, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId, userId ?? null, shopId ?? null, eventType, description)
      return
    }
    const { error } = await db.from('activity_log').insert({
      session_id: sessionId, user_id: userId ?? null,
      shop_id: shopId ?? null, event_type: eventType, description,
    })
    if (error) throw error
  },
}

module.exports = ActivityLogQueries


/**
 * qrToken.queries.js
 * SQLite-only — local server only.
 * Online server does not have a qr_tokens table.
 */

const QrTokenQueries = {

  findByToken: (token) => {
    return db.prepare('SELECT * FROM qr_tokens WHERE token = ?').get(token) ?? null
  },

  create: ({ shopId, token, expiresAt }) => {
    const stmt = db.prepare(`
      INSERT INTO qr_tokens (shop_id, token, expires_at) VALUES (?, ?, ?)
    `)
    const result = stmt.run(shopId, token, expiresAt)
    return QrTokenQueries.findByToken(token)
  },

  /**
   * Validate token — returns the token row if valid, null otherwise.
   * A valid token: exists, not yet used, not expired.
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
   * Consume a token — marks it used and links to a session.
   */
  consume: (tokenId, sessionId) => {
    db.prepare(`
      UPDATE qr_tokens SET used_at = datetime('now'), session_id = ? WHERE token_id = ?
    `).run(sessionId, tokenId)
  },

  /** Cleanup expired, unused tokens older than 1 day */
  cleanupExpired: () => {
    db.prepare(`
      DELETE FROM qr_tokens
      WHERE used_at IS NULL
        AND expires_at < datetime('now', '-1 day')
    `).run()
  },
}

module.exports = { ActivityLogQueries, QrTokenQueries }
