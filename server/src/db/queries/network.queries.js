/**
 * network.queries.js
 */
const db = require('../index')

const NetworkQueries = {

  findByShopId: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM network_config WHERE shop_id = ?').all(shopId)
    }
    const { data, error } = await db.from('network_config').select('*').eq('shop_id', shopId)
    if (error) throw error
    return data
  },

  findPrimaryByShop: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM network_config WHERE shop_id = ? AND is_primary = 1').get(shopId) ?? null
    }
    const { data, error } = await db.from('network_config').select('*').eq('shop_id', shopId).eq('is_primary', true).maybeSingle()
    if (error) throw error
    return data
  },

  create: async (networkData) => {
    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO network_config (shop_id, ssid, auth_type, credential_ref, is_primary)
        VALUES (@shop_id, @ssid, @auth_type, @credential_ref, @is_primary)
      `)
      const result = stmt.run({
        is_primary: 0,
        auth_type: 'WPA2', // Default
        ...networkData,
        // SQLITE boolean handle
        is_primary: networkData.is_primary ? 1 : 0
      })
      return NetworkQueries.findById(result.lastInsertRowid)
    }
    const { data, error } = await db.from('network_config').insert(networkData).select().single()
    if (error) throw error
    return data
  },

  findById: async (networkId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM network_config WHERE network_id = ?').get(networkId) ?? null
    }
    const { data, error } = await db.from('network_config').select('*').eq('network_id', networkId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  update: async (networkId, updateData) => {
    if (db._mode === 'sqlite') {
      const sets = Object.keys(updateData).map(k => `${k} = ?`).join(', ')
      const values = Object.values(updateData).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v)
      db.prepare(`UPDATE network_config SET ${sets} WHERE network_id = ?`).run(...values, networkId)
      return NetworkQueries.findById(networkId)
    }
    const { data, error } = await db.from('network_config').update(updateData).eq('network_id', networkId).select().single()
    if (error) throw error
    return data
  },

  delete: async (networkId) => {
    if (db._mode === 'sqlite') {
      db.prepare('DELETE FROM network_config WHERE network_id = ?').run(networkId)
      return
    }
    const { error } = await db.from('network_config').delete().eq('network_id', networkId)
    if (error) throw error
  }
}

module.exports = NetworkQueries
