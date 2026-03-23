const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const dbPath = process.env.SQLITE_PATH || './printeasy.db';
const db = new Database(dbPath, { verbose: console.log });

const schema = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  device_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. shops
CREATE TABLE IF NOT EXISTS shops (
  shop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  shop_name TEXT NOT NULL,
  email TEXT,
  contact TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. shop_address
CREATE TABLE IF NOT EXISTS shop_address (
  shop_id INTEGER PRIMARY KEY,
  address TEXT,
  area TEXT,
  city TEXT,
  pincode TEXT,
  local_ip TEXT,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 4. network_config
CREATE TABLE IF NOT EXISTS network_config (
  network_id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER,
  ssid TEXT,
  auth_type TEXT CHECK (auth_type IN ('WPA2', 'WPA3', 'Open', 'WEP')),
  credential_ref TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 5. printers
CREATE TABLE IF NOT EXISTS printers (
  printer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER,
  name TEXT,
  ip_address TEXT,
  protocol TEXT CHECK (protocol IN ('ipp', 'cups', 'raw_tcp')),
  status TEXT CHECK (status IN ('online', 'offline', 'error', 'busy')) DEFAULT 'online',
  capabilities TEXT,
  last_seen TEXT,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 6. pricing
CREATE TABLE IF NOT EXISTS pricing (
  pricing_id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER,
  color_type TEXT CHECK (color_type IN ('bw', 'color', 'grayscale')),
  paper_size TEXT CHECK (paper_size IN ('A4', 'A3', 'Letter', 'Legal')),
  finishing_type TEXT CHECK (finishing_type IN ('none', 'staple', 'binding', 'laminate')) DEFAULT 'none',
  duplex_supported INTEGER DEFAULT 1,
  price_per_page REAL,
  UNIQUE(shop_id, color_type, paper_size, finishing_type),
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 7. storage
CREATE TABLE IF NOT EXISTS storage (
  storage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER,
  storage_type TEXT CHECK (storage_type IN ('local', 'cloudinary', 's3', 'gcs', 'azure')),
  path TEXT,
  checksum TEXT,
  expiry_at TEXT,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 8. sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  shop_id INTEGER,
  network_id INTEGER,
  is_local INTEGER DEFAULT 0,
  qr_token TEXT UNIQUE,
  qr_used_at TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
  FOREIGN KEY (network_id) REFERENCES network_config(network_id) ON DELETE SET NULL
);

-- 9. files
CREATE TABLE IF NOT EXISTS files (
  file_id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  storage_id INTEGER,
  session_id INTEGER,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('pdf', 'docx', 'jpg', 'png', 'txt')),
  size INTEGER,
  pages INTEGER,
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK (status IN ('pending', 'ready', 'expired', 'deleted')) DEFAULT 'pending',
  FOREIGN KEY (storage_id) REFERENCES storage(storage_id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- 10. print_settings
CREATE TABLE IF NOT EXISTS print_settings (
  settings_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  color_mode TEXT CHECK (color_mode IN ('bw', 'color', 'grayscale')) DEFAULT 'bw',
  orientation TEXT CHECK (orientation IN ('portrait', 'landscape')) DEFAULT 'portrait',
  scaling TEXT CHECK (scaling IN ('fit', 'fill', 'actual', 'custom')) DEFAULT 'fit',
  sides TEXT CHECK (sides IN ('simplex', 'duplex_long', 'duplex_short')) DEFAULT 'simplex',
  paper_size TEXT CHECK (paper_size IN ('A4', 'A3', 'Letter', 'Legal')) DEFAULT 'A4',
  copies INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 11. print_jobs
CREATE TABLE IF NOT EXISTS print_jobs (
  job_id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  file_id INTEGER,
  printer_id INTEGER,
  settings_id INTEGER,
  session_id INTEGER,
  shop_id INTEGER,
  origin TEXT CHECK (origin IN ('online', 'offline')) DEFAULT 'online',
  status TEXT CHECK (status IN ('queued', 'printing', 'done', 'failed', 'cancelled')) DEFAULT 'queued',
  queue_position INTEGER,
  payment_group_id INTEGER,
  priority INTEGER DEFAULT 5,
  cost REAL,
  retry_count INTEGER DEFAULT 0,
  error_code TEXT,
  printed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(file_id) ON DELETE CASCADE,
  FOREIGN KEY (printer_id) REFERENCES printers(printer_id) ON DELETE SET NULL,
  FOREIGN KEY (settings_id) REFERENCES print_settings(settings_id),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 12. print_job_pricing
CREATE TABLE IF NOT EXISTS print_job_pricing (
  job_id INTEGER,
  pricing_id INTEGER,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  amount REAL,
  PRIMARY KEY (job_id, pricing_id),
  FOREIGN KEY (job_id) REFERENCES print_jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (pricing_id) REFERENCES pricing(pricing_id) ON DELETE CASCADE
);

-- 13. payments
CREATE TABLE IF NOT EXISTS payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  job_id INTEGER,
  payment_group_id INTEGER,
  method TEXT CHECK (method IN ('cash', 'upi', 'card', 'wallet', 'netbanking')),
  amount REAL NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'refunded')) DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  gateway_txn_id TEXT UNIQUE,
  attempt_no INTEGER DEFAULT 1,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES print_jobs(job_id) ON DELETE CASCADE
);

-- 14. notifications
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  shop_id INTEGER,
  target_type TEXT CHECK (target_type IN ('customer', 'shopkeeper')),
  type TEXT CHECK (type IN ('job_complete', 'payment', 'alert', 'info', 'new_job')),
  job_id INTEGER,
  message TEXT,
  status TEXT CHECK (status IN ('unread', 'read', 'dismissed')) DEFAULT 'unread',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES print_jobs(job_id) ON DELETE CASCADE
);

-- 15. activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  user_id INTEGER,
  shop_id INTEGER,
  event_type TEXT CHECK (event_type IN ('upload', 'print', 'payment', 'login', 'logout', 'error', 'qr_scan')),
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 16. outbox
CREATE TABLE IF NOT EXISTS outbox (
  outbox_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT,
  entity_uuid TEXT,
  operation TEXT CHECK (operation IN ('insert', 'update', 'delete')),
  payload TEXT,
  synced_at TEXT,
  failed_at TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 17. qr_tokens
CREATE TABLE IF NOT EXISTS qr_tokens (
  token_id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  session_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outbox_poll ON outbox(synced_at, created_at);
`;

try {
    db.exec(schema);
    console.log("Successfully initialized SQLite schema.");
    
    // Seed a shop if none exists
    const shopCount = db.prepare("SELECT count(*) as count FROM shops").get().count;
    if (shopCount === 0) {
        db.prepare("INSERT INTO shops (uuid, shop_name, email, status) VALUES (?, ?, ?, ?)").run(
            '11111111-1111-1111-1111-111111111111',
            'Local Shop',
            'pratik@example.com',
            'active'
        );
        console.log("Seeded default shop.");
    }
} catch (err) {
    console.error("Error initializing schema:", err);
    process.exit(1);
} finally {
    db.close();
}
