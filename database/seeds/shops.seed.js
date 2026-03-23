/**
 * database/seeds/shops.seed.js
 *
 * Seeds a sample shop + address for local development and testing.
 * Run with: node database/seeds/shops.seed.js
 *
 * Requires SERVER_MODE and DB env vars to be set.
 */

require('dotenv').config({ path: './server/.env' })
const db = require('./server/src/db/index')
const { generateUuid } = require('./server/src/utils/uuid')

async function seedShops() {
  const shopUuid = generateUuid()

  if (db._mode === 'sqlite') {
    // SQLite
    db.prepare(`
      INSERT OR IGNORE INTO shops (uuid, shop_name, email, contact, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(shopUuid, 'PrintEasy Demo Shop', 'shop@demo.com', '9999999999', 'active')

    const shop = db.prepare('SELECT * FROM shops WHERE uuid = ?').get(shopUuid)

    db.prepare(`
      INSERT OR IGNORE INTO shop_address (shop_id, address, area, city, pincode, local_ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(shop.shop_id, '1, Main Street, Near College', 'Akurdi', 'Pune', '411035', '192.168.1.1')

    console.log(`✅ Shop seeded [SQLite]: ${shop.shop_name} (ID: ${shop.shop_id}, UUID: ${shop.uuid})`)

  } else {
    // Supabase / PostgreSQL
    const { data: shop } = await db
      .from('shops')
      .insert({ uuid: shopUuid, shop_name: 'PrintEasy Demo Shop', email: 'shop@demo.com', contact: '9999999999', status: 'active' })
      .select()
      .single()

    await db.from('shop_address').insert({
      shop_id: shop.shop_id,
      address: '1, Main Street, Near College',
      area:    'Akurdi',
      city:    'Pune',
      pincode: '411035',
      local_ip:'192.168.1.1',
    })

    console.log(`✅ Shop seeded [Supabase]: ${shop.shop_name} (ID: ${shop.shop_id})`)
  }
}

seedShops().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
