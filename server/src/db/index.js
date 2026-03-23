/**
 * db/index.js
 *
 * Returns the correct DB adapter based on SERVER_MODE env variable.
 *   SERVER_MODE=online  → Supabase client
 *   SERVER_MODE=local   → better-sqlite3 instance
 *
 * All query files import from here. They never import adapters directly.
 */

const { SERVER_MODE } = process.env

let db

if (SERVER_MODE === 'local') {
  const Database = require('better-sqlite3')
  const path     = require('path')
  const logger   = require('../utils/logger')
  const dbPath   = process.env.SQLITE_PATH || path.join(__dirname, '../../../data/printeasy.db')

  db = new Database(dbPath, { 
    verbose: process.env.NODE_ENV !== 'production' 
      ? (sql) => logger.debug(`[sqlite] ${sql}`) 
      : null 
  })

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Wrap SQLite in a Supabase-compatible async shim
  // so query files don't need to branch on adapter type
  db._mode = 'sqlite'
} else {
  const { createClient } = require('@supabase/supabase-js')

  db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  db._mode = 'supabase'
}

module.exports = db
