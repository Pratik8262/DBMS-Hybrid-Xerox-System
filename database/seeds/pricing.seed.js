/**
 * database/seeds/pricing.seed.js
 *
 * Seeds default pricing rules for shop_id = 1.
 * Covers: B&W + Color in A4/A3, all with no finishing.
 *
 * Run with: node database/seeds/pricing.seed.js
 */

require('dotenv').config({ path: './server/.env' })
const db = require('./server/src/db/index')

const SHOP_ID = parseInt(process.env.SHOP_ID || '1')

const RULES = [
  { color_type: 'bw',    paper_size: 'A4', finishing_type: 'none', price_per_page: 2.00,  duplex_supported: 1 },
  { color_type: 'bw',    paper_size: 'A3', finishing_type: 'none', price_per_page: 4.00,  duplex_supported: 1 },
  { color_type: 'color', paper_size: 'A4', finishing_type: 'none', price_per_page: 10.00, duplex_supported: 1 },
  { color_type: 'color', paper_size: 'A3', finishing_type: 'none', price_per_page: 18.00, duplex_supported: 0 },
  { color_type: 'grayscale', paper_size: 'A4', finishing_type: 'none', price_per_page: 3.00, duplex_supported: 1 },
  { color_type: 'bw',    paper_size: 'A4', finishing_type: 'staple',  price_per_page: 2.50, duplex_supported: 1 },
]

async function seedPricing() {
  let count = 0

  for (const rule of RULES) {
    try {
      if (db._mode === 'sqlite') {
        db.prepare(`
          INSERT OR IGNORE INTO pricing
            (shop_id, color_type, paper_size, finishing_type, duplex_supported, price_per_page)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(SHOP_ID, rule.color_type, rule.paper_size, rule.finishing_type, rule.duplex_supported, rule.price_per_page)
      } else {
        await db.from('pricing').upsert({
          shop_id: SHOP_ID, ...rule
        }, { onConflict: 'shop_id,color_type,paper_size,finishing_type', ignoreDuplicates: true })
      }
      count++
      console.log(`  ✅ ${rule.color_type.toUpperCase()} ${rule.paper_size} ${rule.finishing_type} — ₹${rule.price_per_page}/page`)
    } catch (e) {
      console.warn(`  ⚠️ Skipped (duplicate?): ${rule.color_type} ${rule.paper_size} — ${e.message}`)
    }
  }

  console.log(`\n✅ Seeded ${count} pricing rules for Shop ID ${SHOP_ID}`)
}

seedPricing().catch(err => {
  console.error('❌ Pricing seed failed:', err.message)
  process.exit(1)
})
