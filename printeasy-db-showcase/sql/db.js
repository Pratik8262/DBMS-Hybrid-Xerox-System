'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.SQLITE_DB_PATH || './printeasy.db';
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH, { verbose: null });

    // Enable WAL mode and foreign keys immediately
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Auto-initialize schema on first launch
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    // Split by semicolons but handle multi-statement blocks (triggers)
    // Run the entire schema as an exec call (supports multiple statements)
    db.exec(schema);

    console.log(`[SQLite] Connected to ${DB_PATH}`);
    console.log('[SQLite] Schema initialized (tables created if not existed)');
  }
  return db;
}

// Initialize immediately on require
getDb();

module.exports = { getDb };
