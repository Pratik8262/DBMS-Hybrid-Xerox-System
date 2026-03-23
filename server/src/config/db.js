/**
 * config/db.js
 *
 * Database client initialisation.
 * Returns the correct adapter based on SERVER_MODE env variable:
 *   SERVER_MODE=online  → Supabase (PostgreSQL) client
 *   SERVER_MODE=local   → better-sqlite3 instance (SQLite)
 *
 * This is the single source of truth for DB connection config.
 * All query files import the adapter from db/index.js (which re-exports this).
 */

const { SERVER_MODE } = process.env

let db

if (SERVER_MODE === 'local') {
  const Database = require('better-sqlite3')
  const path     = require('path')
  const logger   = require('../utils/logger')

  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../../data/printeasy.db')

  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV !== 'production'
      ? (sql) => logger.debug(`[sqlite] ${sql}`)
      : null,
  })

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db._mode = 'sqlite'

  const logger2 = require('../utils/logger')
  logger2.info(`[db] SQLite connected → ${dbPath}`)

} else {
  const { createClient } = require('@supabase/supabase-js')

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('[db] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in online mode')
  }

  db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  db._mode = 'supabase'

  const logger = require('../utils/logger')
  logger.info(`[db] Supabase connected → ${process.env.SUPABASE_URL}`)
}

module.exports = db
