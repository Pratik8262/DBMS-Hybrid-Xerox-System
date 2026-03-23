/**
 * session.queries.js
 * All DB operations for the `sessions` table.
 */

const db = require('../index')

const SessionQueries = {

  findById: async (sessionId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) ?? null
    }
    const { data, error } = await db.from('sessions').select('*').eq('session_id', sessionId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByUuid: async (uuid) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM sessions WHERE uuid = ?').get(uuid) ?? null
    }
    const { data, error } = await db.from('sessions').select('*').eq('uuid', uuid).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Get all active (not ended) sessions for a user.
   */
  findActiveByUser: async (userId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM sessions
        WHERE user_id = ? AND ended_at IS NULL
        ORDER BY started_at DESC
      `).all(userId)
    }
    const { data, error } = await db
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
    if (error) throw error
    return data
  },

  /**
   * Create a new session.
   * @param {Object} sessionData - { uuid, user_id, shop_id?, network_id?, is_local, qr_token? }
   */
  create: async (sessionData) => {
    const now = new Date().toISOString()
    const qrUsedAt = sessionData.qr_token ? now : null

    if (db._mode === 'sqlite') {
      const tx = db.transaction((data) => {
        const stmt = db.prepare(`
          INSERT INTO sessions (uuid, user_id, shop_id, network_id, is_local, qr_token, qr_used_at)
          VALUES (@uuid, @user_id, @shop_id, @network_id, @is_local, @qr_token, @qr_used_at)
        `)
        const result = stmt.run(data)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('session', data.uuid, 'insert', JSON.stringify(data))
        
        return result.lastInsertRowid
      })
      
      const lastId = tx({
        shop_id: null, network_id: null, qr_token: null,
        is_local: 0,
        ...sessionData,
        qr_used_at: qrUsedAt
      })
      return SessionQueries.findById(lastId)
    }
    const { data, error } = await db.from('sessions').insert({ ...sessionData, qr_used_at: qrUsedAt }).select().single()
    if (error) throw error
    return data
  },

  /**
   * End a session by setting ended_at to now.
   */
  end: async (sessionId) => {
    const now = new Date().toISOString()
    if (db._mode === 'sqlite') {
      const session = await SessionQueries.findById(sessionId)
      if (!session) return null

      const tx = db.transaction((data) => {
        db.prepare('UPDATE sessions SET ended_at = ? WHERE session_id = ?').run(data.now, data.sessionId)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('session', session.uuid, 'update', JSON.stringify({ ended_at: data.now }))
      })
      
      tx({ sessionId, now })
      return SessionQueries.findById(sessionId)
    }
    const { data, error } = await db
      .from('sessions')
      .update({ ended_at: now })
      .eq('session_id', sessionId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Mark QR token as consumed for an offline session.
   */
  markQrUsed: async (sessionId) => {
    const now = new Date().toISOString()
    if (db._mode === 'sqlite') {
      const session = await SessionQueries.findById(sessionId)
      if (!session) return

      const tx = db.transaction((data) => {
        db.prepare('UPDATE sessions SET qr_used_at = ? WHERE session_id = ?').run(data.now, data.sessionId)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('session', session.uuid, 'update', JSON.stringify({ qr_used_at: data.now }))
      })
      
      tx({ sessionId, now })
    }
    const { error } = await db
      .from('sessions')
      .update({ qr_used_at: now })
      .eq('session_id', sessionId)
    if (error) throw error
  },

}

module.exports = SessionQueries
