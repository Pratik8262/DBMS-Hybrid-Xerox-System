/**
 * printSettings.queries.js
 */
const db = require('../index')

const PrintSettingQueries = {

  findById: async (settingsId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM print_settings WHERE settings_id = ?').get(settingsId) ?? null
    }
    const { data, error } = await db.from('print_settings').select('*').eq('settings_id', settingsId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /** Get saved settings for a user (last 5 unique combos used) */
  findSavedByUser: async (userId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM print_settings WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
      `).all(userId)
    }
    const { data, error } = await db
      .from('print_settings').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5)
    if (error) throw error
    return data
  },

  create: async (settingsData) => {
    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO print_settings (user_id, color_mode, orientation, scaling, sides, paper_size, copies)
        VALUES (@user_id, @color_mode, @orientation, @scaling, @sides, @paper_size, @copies)
      `)
      const result = stmt.run({
        user_id: null, color_mode: 'bw', orientation: 'portrait',
        scaling: 'fit', sides: 'simplex', paper_size: 'A4', copies: 1,
        ...settingsData,
      })
      return PrintSettingQueries.findById(result.lastInsertRowid)
    }
    const { data, error } = await db.from('print_settings').insert(settingsData).select().single()
    if (error) throw error
    return data
  },

  /**
   * Find an exact matching settings row for the given combination.
   * If no matching row exists, create one automatically.
   * This means you NEVER need to pre-seed every combination —
   * any settings a customer selects will be auto-inserted on first use.
   *
   * @param {Object} combo - { color_mode, orientation, scaling, sides, paper_size, copies, user_id? }
   * @returns {Object} The existing or newly-created print_settings row
   */
  findOrCreate: async ({
    color_mode = 'bw',
    orientation = 'portrait',
    scaling = 'fit',
    sides = 'simplex',
    paper_size = 'A4',
    copies = 1,
    user_id = null,
  } = {}) => {
    if (db._mode === 'sqlite') {
      // If we have a user_id, look for the combo specifically for that user
      // If not, look for a global (null) row
      const existing = user_id
        ? db.prepare(`
            SELECT * FROM print_settings
            WHERE color_mode = ? AND orientation = ? AND scaling = ?
              AND sides = ? AND paper_size = ? AND copies = ?
              AND user_id = ?
            LIMIT 1
          `).get(color_mode, orientation, scaling, sides, paper_size, copies, user_id)
        : db.prepare(`
            SELECT * FROM print_settings
            WHERE color_mode = ? AND orientation = ? AND scaling = ?
              AND sides = ? AND paper_size = ? AND copies = ?
              AND user_id IS NULL
            LIMIT 1
          `).get(color_mode, orientation, scaling, sides, paper_size, copies)

      if (existing) return existing

      const stmt = db.prepare(`
        INSERT INTO print_settings (user_id, color_mode, orientation, scaling, sides, paper_size, copies)
        VALUES (@user_id, @color_mode, @orientation, @scaling, @sides, @paper_size, @copies)
      `)
      const result = stmt.run({ user_id, color_mode, orientation, scaling, sides, paper_size, copies })
      return PrintSettingQueries.findById(result.lastInsertRowid)
    }

    // Supabase (PostgreSQL) — look up by user_id if provided, else by null
    let query = db
      .from('print_settings')
      .select('*')
      .eq('color_mode', color_mode)
      .eq('orientation', orientation)
      .eq('scaling', scaling)
      .eq('sides', sides)
      .eq('paper_size', paper_size)
      .eq('copies', copies)
      .limit(1)

    query = user_id ? query.eq('user_id', user_id) : query.is('user_id', null)

    const { data: existing, error: lookupErr } = await query.maybeSingle()
    if (lookupErr && lookupErr.code !== 'PGRST116') throw lookupErr
    if (existing) return existing

    // Not found — create row with the specific user_id (or null for anonymous)
    const { data: created, error: insertErr } = await db
      .from('print_settings')
      .insert({ user_id: user_id || null, color_mode, orientation, scaling, sides, paper_size, copies })
      .select()
      .single()
    if (insertErr) throw insertErr
    return created
  },
}

module.exports = PrintSettingQueries
