/**
 * pricing.queries.js
 */
const db = require('../index')

const PricingQueries = {

  findById: async (pricingId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM pricing WHERE pricing_id = ?').get(pricingId) ?? null
    }
    const { data, error } = await db.from('pricing').select('*').eq('pricing_id', pricingId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByShop: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM pricing WHERE shop_id = ? ORDER BY color_type, paper_size').all(shopId)
    }
    const { data, error } = await db
      .from('pricing').select('*').eq('shop_id', shopId)
      .order('color_type').order('paper_size')
    if (error) throw error
    return data
  },

  /**
   * Find the specific pricing rule matching a job's settings.
   * Used by costCalculator service.
   */
  findMatchingRule: async (shopId, colorType, paperSize, finishingType = 'none') => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM pricing
        WHERE shop_id = ? AND color_type = ? AND paper_size = ? AND finishing_type = ?
        LIMIT 1
      `).get(shopId, colorType, paperSize, finishingType) ?? null
    }
    const { data, error } = await db
      .from('pricing').select('*')
      .eq('shop_id', shopId)
      .eq('color_type', colorType)
      .eq('paper_size', paperSize)
      .eq('finishing_type', finishingType)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  create: async (pricingData) => {
    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO pricing (shop_id, color_type, paper_size, finishing_type, duplex_supported, price_per_page)
        VALUES (@shop_id, @color_type, @paper_size, @finishing_type, @duplex_supported, @price_per_page)
      `)
      const result = stmt.run({ finishing_type: 'none', duplex_supported: 0, ...pricingData })
      return PricingQueries.findById(result.lastInsertRowid)
    }
    const { data, error } = await db.from('pricing').insert(pricingData).select().single()
    if (error) throw error
    return data
  },

  update: async (pricingId, updates) => {
    if (db._mode === 'sqlite') {
      const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ')
      db.prepare(`UPDATE pricing SET ${fields} WHERE pricing_id = @pricing_id`).run({ ...updates, pricing_id: pricingId })
      return PricingQueries.findById(pricingId)
    }
    const { data, error } = await db.from('pricing').update(updates).eq('pricing_id', pricingId).select().single()
    if (error) throw error
    return data
  },

  /** Link a pricing rule to a print job in the junction table */
  attachToJob: async (jobId, pricingId, amount) => {
    if (db._mode === 'sqlite') {
      db.prepare(`
        INSERT OR IGNORE INTO print_job_pricing (job_id, pricing_id, amount)
        VALUES (?, ?, ?)
      `).run(jobId, pricingId, amount)
      return
    }
    const { error } = await db.from('print_job_pricing').upsert({ job_id: jobId, pricing_id: pricingId, amount })
    if (error) throw error
  },
}

module.exports = PricingQueries
