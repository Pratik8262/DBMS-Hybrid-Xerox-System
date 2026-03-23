-- PrintEasy 17-Table Schema
-- Copy and run this in your Supabase SQL Editor

-- Drop existing tables to ensure a clean slate since we upgraded the schema
DROP TABLE IF EXISTS 
  outbox, activity_log, notifications, payments, 
  print_job_pricing, print_jobs, print_settings, 
  files, sessions, storage, pricing, printers, 
  network_config, shop_address, qr_tokens, 
  users, shops CASCADE;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  phone VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  device_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. shops
CREATE TABLE IF NOT EXISTS shops (
  shop_id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  shop_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  contact VARCHAR(50),
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. shop_address [1:1 with shops]
CREATE TABLE IF NOT EXISTS shop_address (
  shop_id INTEGER PRIMARY KEY REFERENCES shops(shop_id) ON DELETE CASCADE,
  address TEXT,
  area VARCHAR(100),
  city VARCHAR(100),
  pincode VARCHAR(20),
  local_ip VARCHAR(50)
);

-- 4. network_config
CREATE TABLE IF NOT EXISTS network_config (
  network_id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  ssid VARCHAR(100),
  auth_type VARCHAR(20) CHECK (auth_type IN ('WPA2', 'WPA3', 'Open', 'WEP')),
  credential_ref VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. printers
CREATE TABLE IF NOT EXISTS printers (
  printer_id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  name VARCHAR(255),
  ip_address VARCHAR(50),
  protocol VARCHAR(20) CHECK (protocol IN ('ipp', 'cups', 'raw_tcp')),
  status VARCHAR(20) CHECK (status IN ('online', 'offline', 'error', 'busy')) DEFAULT 'online',
  capabilities JSONB,
  last_seen TIMESTAMPTZ
);

-- 6. pricing
CREATE TABLE IF NOT EXISTS pricing (
  pricing_id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  color_type VARCHAR(20) CHECK (color_type IN ('bw', 'color', 'grayscale')),
  paper_size VARCHAR(20) CHECK (paper_size IN ('A4', 'A3', 'Letter', 'Legal')),
  finishing_type VARCHAR(20) CHECK (finishing_type IN ('none', 'staple', 'binding', 'laminate')) DEFAULT 'none',
  duplex_supported BOOLEAN DEFAULT true,
  price_per_page DECIMAL(10,4),
  UNIQUE(shop_id, color_type, paper_size, finishing_type)
);

-- 7. storage
CREATE TABLE IF NOT EXISTS storage (
  storage_id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  storage_type VARCHAR(20) CHECK (storage_type IN ('local', 'cloudinary', 's3', 'gcs', 'azure')),
  path TEXT,
  checksum VARCHAR(255),
  expiry_at TIMESTAMPTZ
);

-- 8. sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  network_id INTEGER REFERENCES network_config(network_id) ON DELETE SET NULL,
  is_local BOOLEAN DEFAULT false,
  qr_token VARCHAR(64) UNIQUE,
  qr_used_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 9. files
CREATE TABLE IF NOT EXISTS files (
  file_id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  storage_id INTEGER REFERENCES storage(storage_id) ON DELETE SET NULL,
  session_id INTEGER REFERENCES sessions(session_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('pdf', 'docx', 'jpg', 'png', 'txt')),
  size INTEGER,
  pages INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) CHECK (status IN ('pending', 'ready', 'expired', 'deleted')) DEFAULT 'pending'
);

-- 10. print_settings
CREATE TABLE IF NOT EXISTS print_settings (
  settings_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  color_mode VARCHAR(20) CHECK (color_mode IN ('bw', 'color', 'grayscale')) DEFAULT 'bw',
  orientation VARCHAR(20) CHECK (orientation IN ('portrait', 'landscape')) DEFAULT 'portrait',
  scaling VARCHAR(20) CHECK (scaling IN ('fit', 'fill', 'actual', 'custom')) DEFAULT 'fit',
  sides VARCHAR(20) CHECK (sides IN ('simplex', 'duplex_long', 'duplex_short')) DEFAULT 'simplex',
  paper_size VARCHAR(20) CHECK (paper_size IN ('A4', 'A3', 'Letter', 'Legal')) DEFAULT 'A4',
  copies SMALLINT DEFAULT 1
);

-- 11. print_jobs
CREATE TABLE IF NOT EXISTS print_jobs (
  job_id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  file_id INTEGER REFERENCES files(file_id) ON DELETE CASCADE,
  printer_id INTEGER REFERENCES printers(printer_id) ON DELETE SET NULL,
  settings_id INTEGER REFERENCES print_settings(settings_id),
  session_id INTEGER REFERENCES sessions(session_id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  origin VARCHAR(20) CHECK (origin IN ('online', 'offline')) DEFAULT 'online',
  status VARCHAR(20) CHECK (status IN ('queued', 'printing', 'done', 'failed', 'cancelled')) DEFAULT 'queued',
  queue_position INTEGER,
  payment_group_id INTEGER,
  priority SMALLINT DEFAULT 5,
  cost DECIMAL(10,2),
  retry_count INTEGER DEFAULT 0,
  error_code VARCHAR(100),
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. print_job_pricing [M:N junction]
CREATE TABLE IF NOT EXISTS print_job_pricing (
  job_id INTEGER REFERENCES print_jobs(job_id) ON DELETE CASCADE,
  pricing_id INTEGER REFERENCES pricing(pricing_id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(10,2),
  PRIMARY KEY (job_id, pricing_id)
);

-- 13. payments
CREATE TABLE IF NOT EXISTS payments (
  payment_id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  job_id INTEGER REFERENCES print_jobs(job_id) ON DELETE CASCADE,
  payment_group_id INTEGER,
  method VARCHAR(20) CHECK (method IN ('cash', 'upi', 'card', 'wallet', 'netbanking')),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'success', 'failed', 'refunded')) DEFAULT 'pending',
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255) UNIQUE,
  razorpay_signature VARCHAR(255),
  gateway_txn_id VARCHAR(255) UNIQUE,
  attempt_no INTEGER DEFAULT 1,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. notifications
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  target_type VARCHAR(20) CHECK (target_type IN ('customer', 'shopkeeper')),
  type VARCHAR(20) CHECK (type IN ('job_complete', 'payment', 'alert', 'info', 'new_job')),
  job_id INTEGER REFERENCES print_jobs(job_id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) CHECK (status IN ('unread', 'read', 'dismissed')) DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  log_id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  event_type VARCHAR(50) CHECK (event_type IN ('upload', 'print', 'payment', 'login', 'logout', 'error', 'qr_scan')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. outbox
CREATE TABLE IF NOT EXISTS outbox (
  outbox_id SERIAL PRIMARY KEY,
  entity VARCHAR(50),
  entity_uuid CHAR(36),
  operation VARCHAR(20) CHECK (operation IN ('insert', 'update', 'delete')),
  payload JSONB,
  synced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_poll ON outbox(synced_at, created_at);

-- 17. qr_tokens
CREATE TABLE IF NOT EXISTS qr_tokens (
  token_id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  session_id INTEGER REFERENCES sessions(session_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions for Supabase client
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
