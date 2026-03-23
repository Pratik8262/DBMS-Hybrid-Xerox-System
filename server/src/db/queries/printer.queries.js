/**
 * printer.queries.js
 */
const db = require('../index')

const PrinterQueries = {

  findById: async (printerId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM printers WHERE printer_id = ?').get(printerId) ?? null
    }
    const { data, error } = await db.from('printers').select('*').eq('printer_id', printerId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByShop: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM printers WHERE shop_id = ? ORDER BY name ASC').all(shopId)
    }
    const { data, error } = await db.from('printers').select('*').eq('shop_id', shopId).order('name')
    if (error) throw error
    return data
  },

  findOnlineByShop: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM printers WHERE shop_id = ? AND status = 'online'
      `).all(shopId)
    }
    const { data, error } = await db
      .from('printers').select('*').eq('shop_id', shopId).eq('status', 'online')
    if (error) throw error
    return data
  },

  create: async (printerData) => {
    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO printers (shop_id, name, ip_address, protocol, status, capabilities)
        VALUES (@shop_id, @name, @ip_address, @protocol, 'offline', @capabilities)
      `)
      const result = stmt.run({
        protocol: 'ipp', capabilities: null,
        ...printerData,
        capabilities: printerData.capabilities ? JSON.stringify(printerData.capabilities) : null,
      })
      return PrinterQueries.findById(result.lastInsertRowid)
    }
    const { data, error } = await db.from('printers').insert({ status: 'offline', protocol: 'ipp', ...printerData }).select().single()
    if (error) throw error
    return data
  },

  updateStatus: async (printerId, status) => {
    const now = new Date().toISOString()
    if (db._mode === 'sqlite') {
      db.prepare('UPDATE printers SET status = ?, last_seen = ? WHERE printer_id = ?').run(status, now, printerId)
      return PrinterQueries.findById(printerId)
    }
    const { data, error } = await db
      .from('printers').update({ status, last_seen: now }).eq('printer_id', printerId).select().single()
    if (error) throw error
    return data
  },

  heartbeat: async (printerId) => {
    const now = new Date().toISOString()
    if (db._mode === 'sqlite') {
      db.prepare('UPDATE printers SET last_seen = ? WHERE printer_id = ?').run(now, printerId)
      return
    }
    const { error } = await db.from('printers').update({ last_seen: now }).eq('printer_id', printerId)
    if (error) throw error
  },
}

module.exports = PrinterQueries
