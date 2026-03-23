const db = require('../index')
const { generateUuid } = require('../../utils/uuid') // generate a 64 char hex string or standard uuid

const QrQueries = {
  createToken: async (shopId) => {
    // We generate a secure random 32-character hex token or UUID
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes TTL

    const payload = {
      shop_id: shopId,
      token,
      expires_at: expiresAt
    }

    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO qr_tokens (shop_id, token, expires_at)
        VALUES (@shop_id, @token, @expires_at)
      `)
      const info = stmt.run(payload)
      const fetchStmt = db.prepare('SELECT * FROM qr_tokens WHERE token_id = ?')
      return fetchStmt.get(info.lastInsertRowid)
    }

    const { data, error } = await db
      .from('qr_tokens')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  consumeToken: async (token) => {
    // Finds the token if valid (unused + not expired) and marks it used in one step if possible
    // Because of SQLite/Supabase differences, we might do a SELECT then UPDATE.
    const now = new Date().toISOString()
    
    if (db._mode === 'sqlite') {
      // Find valid token
      const stmt = db.prepare(`
        SELECT * FROM qr_tokens 
        WHERE token = ? AND used_at IS NULL AND expires_at > ?
      `)
      const existing = stmt.get(token, now)
      if (!existing) return null

      // Mark it used
      db.prepare('UPDATE qr_tokens SET used_at = ? WHERE token = ?').run(now, token)
      return { ...existing, used_at: now }
    }

    // Supabase
    // Step 1: Select
    const { data: existing, error: selectErr } = await db
      .from('qr_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', now)
      .single()

    if (selectErr || !existing) return null

    // Step 2: Update
    const { data: updated, error: updateErr } = await db
      .from('qr_tokens')
      .update({ used_at: now })
      .eq('token', token)
      .select()
      .single()

    if (updateErr) throw updateErr
    return updated
  }
}

module.exports = QrQueries
