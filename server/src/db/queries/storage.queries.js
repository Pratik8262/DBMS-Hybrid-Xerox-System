/**
 * storage.queries.js
 * DB operations for the `storage` table — tracks where each file is physically stored.
 */
const db = require('../index')

const StorageQueries = {

  findById: async (storageId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM storage WHERE storage_id = ?').get(storageId) ?? null
    }
    const { data, error } = await db.from('storage').select('*').eq('storage_id', storageId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Create a storage record for a newly uploaded file.
   * @param {Object} storageData - { shop_id?, storage_type, path, checksum?, expiry_at? }
   */
  create: async (storageData) => {
    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO storage (shop_id, storage_type, path, checksum, expiry_at)
        VALUES (@shop_id, @storage_type, @path, @checksum, @expiry_at)
      `)
      const result = stmt.run({
        shop_id: null,
        checksum: null,
        expiry_at: null,
        ...storageData,
      })
      return StorageQueries.findById(result.lastInsertRowid)
    }
    const { data, error } = await db.from('storage').insert(storageData).select().single()
    if (error) throw error
    return data
  },

  updateShopId: async (storageId, shopId) => {
    if (db._mode === 'sqlite') {
      db.prepare('UPDATE storage SET shop_id = ? WHERE storage_id = ? AND shop_id IS NULL').run(shopId, storageId)
      return StorageQueries.findById(storageId)
    }
    const { data, error } = await db
      .from('storage')
      .update({ shop_id: shopId })
      .eq('storage_id', storageId)
      .is('shop_id', null)
      .select()
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findExpired: async () => {
    const now = new Date().toISOString()
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM storage WHERE expiry_at <= ?').all(now)
    }
    const { data, error } = await db.from('storage').select('*').lte('expiry_at', now)
    if (error) throw error
    return data
  },

  delete: async (storageId) => {
    if (db._mode === 'sqlite') {
      db.prepare('DELETE FROM storage WHERE storage_id = ?').run(storageId)
      return
    }
    const { error } = await db.from('storage').delete().eq('storage_id', storageId)
    if (error) throw error
  }
}

module.exports = StorageQueries
