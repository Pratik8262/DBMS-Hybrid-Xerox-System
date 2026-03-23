/**
 * database/seeds/printers.seed.js
 *
 * Seeds a default printer for shop_id = 1.
 * This is required for job creation to succeed (printer_id FK).
 *
 * Run with: node database/seeds/printers.seed.js
 */

require('dotenv').config({ path: './server/.env' })
const db = require('./server/src/db/index')

const SHOP_ID = parseInt(process.env.SHOP_ID || '1')

const PRINTERS = [
  {
    name:         'Default Printer',
    ip_address:   '192.168.1.100',
    protocol:     'ipp',
    status:       'online',
    capabilities: JSON.stringify({
      paper_sizes:  ['A4', 'A3', 'Letter'],
      color:        true,
      duplex:       true,
      max_copies:   999,
    }),
  },
]

async function seedPrinters() {
  for (const printer of PRINTERS) {
    if (db._mode === 'sqlite') {
      db.prepare(`
        INSERT OR IGNORE INTO printers
          (shop_id, name, ip_address, protocol, status, capabilities)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(SHOP_ID, printer.name, printer.ip_address, printer.protocol, printer.status, printer.capabilities)

      const p = db.prepare('SELECT * FROM printers WHERE shop_id = ? AND ip_address = ?').get(SHOP_ID, printer.ip_address)
      console.log(`✅ Printer seeded [SQLite]: ${p.name} (ID: ${p.printer_id}) at ${p.ip_address}`)
    } else {
      const { data: p } = await db.from('printers')
        .upsert({ shop_id: SHOP_ID, ...printer, capabilities: JSON.parse(printer.capabilities) },
                 { onConflict: 'shop_id,ip_address', ignoreDuplicates: true })
        .select().single()
      console.log(`✅ Printer seeded [Supabase]: ${p?.name} (ID: ${p?.printer_id})`)
    }
  }
}

seedPrinters().catch(err => {
  console.error('❌ Printer seed failed:', err.message)
  process.exit(1)
})
