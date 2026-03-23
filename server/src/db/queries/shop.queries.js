/**
 * shop.queries.js
 */
const db = require('../index')
const OutboxQueries = require('./outbox.queries')

const ShopQueries = {

  findById: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT s.*, sa.address, sa.area, sa.city, sa.pincode, sa.local_ip
        FROM shops s LEFT JOIN shop_address sa ON sa.shop_id = s.shop_id
        WHERE s.shop_id = ?
      `).get(shopId) ?? null
    }
    const { data, error } = await db
      .from('shops')
      .select('*, shop_address(*)')
      .eq('shop_id', shopId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByUuid: async (uuid) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM shops WHERE uuid = ?').get(uuid) ?? null
    }
    const { data, error } = await db.from('shops').select('*').eq('uuid', uuid).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByEmail: async (email) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT s.*, sa.address, sa.area, sa.city, sa.pincode, sa.local_ip
        FROM shops s LEFT JOIN shop_address sa ON sa.shop_id = s.shop_id
        WHERE s.email = ?
      `).get(email) ?? null
    }
    const { data, error } = await db
      .from('shops')
      .select('*, shop_address(*)')
      .eq('email', email)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findAll: async ({ status = 'active', limit = 20, offset = 0 } = {}) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT s.*, sa.city, sa.area FROM shops s
        LEFT JOIN shop_address sa ON sa.shop_id = s.shop_id
        WHERE s.status = ? ORDER BY s.created_at DESC LIMIT ? OFFSET ?
      `).all(status, limit, offset)
    }
    const { data, error } = await db
      .from('shops')
      .select('*, shop_address(city, area)')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return data
  },

  create: async (shopData, addressData) => {
    if (db._mode === 'sqlite') {
      const insertShop = db.prepare(`
        INSERT INTO shops (uuid, shop_name, email, contact, status)
        VALUES (@uuid, @shop_name, @email, @contact, 'active')
      `)
      const insertAddr = db.prepare(`
        INSERT INTO shop_address (shop_id, address, area, city, pincode, local_ip)
        VALUES (@shop_id, @address, @area, @city, @pincode, @local_ip)
      `)
      const tx = db.transaction(() => {
        const shopResult = insertShop.run(shopData)
        const shopId = shopResult.lastInsertRowid
        insertAddr.run({ shop_id: shopId, ...addressData })
        return shopId
      })
      const shopId = tx()
      return ShopQueries.findById(shopId)
    }
    const { data: shop, error: shopErr } = await db.from('shops').insert(shopData).select().single()
    if (shopErr) throw shopErr
    const { error: addrErr } = await db.from('shop_address').insert({ shop_id: shop.shop_id, ...addressData })
    if (addrErr) throw addrErr
    return ShopQueries.findById(shop.shop_id)
  },

  updateStatus: async (shopId, status) => {
    if (db._mode === 'sqlite') {
      db.prepare('UPDATE shops SET status = ? WHERE shop_id = ?').run(status, shopId)
      return ShopQueries.findById(shopId)
    }
    const { data, error } = await db.from('shops').update({ status }).eq('shop_id', shopId).select().single()
    if (error) throw error
    return data
  },

  update: async (shopId, shopUpdates, addressUpdates) => {
    if (db._mode === 'sqlite') {
      const tx = db.transaction(() => {
        if (Object.keys(shopUpdates).length > 0) {
          const shopFields = Object.keys(shopUpdates).map(k => `${k} = @${k}`).join(', ')
          db.prepare(`UPDATE shops SET ${shopFields} WHERE shop_id = @shop_id`).run({ ...shopUpdates, shop_id: shopId })
        }
        if (Object.keys(addressUpdates).length > 0) {
          const addrFields = Object.keys(addressUpdates).map(k => `${k} = @${k}`).join(', ')
          db.prepare(`UPDATE shop_address SET ${addrFields} WHERE shop_id = @shop_id`).run({ ...addressUpdates, shop_id: shopId })
        }
      })
      tx()
      return ShopQueries.findById(shopId)
    }
    
    // Supabase path
    if (Object.keys(shopUpdates).length > 0) {
      const { error: shopErr } = await db.from('shops').update(shopUpdates).eq('shop_id', shopId)
      if (shopErr) throw shopErr
    }
    if (Object.keys(addressUpdates).length > 0) {
      const { error: addrErr } = await db.from('shop_address').update(addressUpdates).eq('shop_id', shopId)
      if (addrErr) throw addrErr
    }
    return ShopQueries.findById(shopId)
  },

  updateLocalIp: async (shopId, localIp) => {
    if (db._mode === 'sqlite') {
      const shop = await ShopQueries.findById(shopId)
      if (!shop) return

      const tx = db.transaction(() => {
        // 1. Ensure address record exists (upsert)
        const addr = db.prepare('SELECT 1 FROM shop_address WHERE shop_id = ?').get(shopId)
        if (addr) {
          db.prepare('UPDATE shop_address SET local_ip = ? WHERE shop_id = ?').run(localIp, shopId)
        } else {
          // Insert minimal record if missing
          db.prepare('INSERT INTO shop_address (shop_id, address, city, pincode, local_ip) VALUES (?, ?, ?, ?, ?)')
            .run(shopId, 'Automatically detected', 'Local', '000000', localIp)
        }

        // 2. Atomic outbox write for sync
        OutboxQueries.write({
          entity: 'shop',
          entity_uuid: shop.uuid,
          operation: 'update',
          payload: { local_ip: localIp }
        })
      })
      
      tx()
      return
    }
    const { error } = await db.from('shop_address').update({ local_ip: localIp }).eq('shop_id', shopId)
    if (error) throw error
  },
}

module.exports = ShopQueries
