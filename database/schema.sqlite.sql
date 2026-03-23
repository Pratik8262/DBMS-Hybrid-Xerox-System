-- ============================================================
--  PRINT SHOP PLATFORM — SQLite-Compatible Schema
--  Used by the LOCAL server (better-sqlite3)
--  Differences from PostgreSQL version:
--    - SERIAL → INTEGER PRIMARY KEY AUTOINCREMENT
--    - UUID() → handled in application layer (generateUuid())
--    - BOOLEAN → INTEGER (0/1)
--    - JSONB → TEXT (JSON stored as string)
--    - TIMESTAMPTZ → TEXT (ISO-8601 stored as string)
--    - ENUMs → CHECK constraints
--    - gen_random_uuid() → not available; app sets uuid field
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid       TEXT    NOT NULL UNIQUE,
    name       TEXT    NOT NULL,
    phone      TEXT    NOT NULL UNIQUE,
    email      TEXT    UNIQUE,
    device_id  TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 2: shops
-- ============================================================
CREATE TABLE IF NOT EXISTS shops (
    shop_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid       TEXT    NOT NULL UNIQUE,
    shop_name  TEXT    NOT NULL,
    email      TEXT    UNIQUE,
    contact    TEXT    NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'active'
                       CHECK(status IN ('active','inactive','suspended')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 3: shop_address  [1:1 with shops]
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_address (
    shop_id  INTEGER PRIMARY KEY,
    address  TEXT    NOT NULL,
    area     TEXT,
    city     TEXT    NOT NULL,
    pincode  TEXT    NOT NULL,
    local_ip TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 4: network_config
-- ============================================================
CREATE TABLE IF NOT EXISTS network_config (
    network_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id        INTEGER NOT NULL,
    ssid           TEXT    NOT NULL,
    auth_type      TEXT    NOT NULL DEFAULT 'WPA2'
                           CHECK(auth_type IN ('WPA2','WPA3','Open','WEP')),
    credential_ref TEXT,
    is_primary     INTEGER NOT NULL DEFAULT 0,  -- 0=false, 1=true
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 5: printers
-- ============================================================
CREATE TABLE IF NOT EXISTS printers (
    printer_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id      INTEGER NOT NULL,
    name         TEXT    NOT NULL,
    ip_address   TEXT    NOT NULL,
    protocol     TEXT    NOT NULL DEFAULT 'ipp'
                         CHECK(protocol IN ('ipp','cups','raw_tcp')),
    status       TEXT    NOT NULL DEFAULT 'offline'
                         CHECK(status IN ('online','offline','error','busy')),
    capabilities TEXT,   -- JSON string
    last_seen    TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE RESTRICT,
    UNIQUE (shop_id, ip_address)
);

-- ============================================================
-- TABLE 6: pricing
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing (
    pricing_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id          INTEGER NOT NULL,
    color_type       TEXT    NOT NULL CHECK(color_type IN ('bw','color','grayscale')),
    paper_size       TEXT    NOT NULL CHECK(paper_size IN ('A4','A3','Letter','Legal')),
    finishing_type   TEXT    NOT NULL DEFAULT 'none'
                             CHECK(finishing_type IN ('none','staple','binding','laminate')),
    duplex_supported INTEGER NOT NULL DEFAULT 0,
    price_per_page   REAL    NOT NULL CHECK(price_per_page > 0),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    UNIQUE (shop_id, color_type, paper_size, finishing_type)
);

-- ============================================================
-- TABLE 7: storage
-- ============================================================
CREATE TABLE IF NOT EXISTS storage (
    storage_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id      INTEGER,
    storage_type TEXT    NOT NULL DEFAULT 'local'
                         CHECK(storage_type IN ('local','cloudinary','s3','gcs','azure')),
    path         TEXT    NOT NULL,
    checksum     TEXT,
    expiry_at    TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 8: sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid        TEXT    NOT NULL UNIQUE,
    user_id     INTEGER,
    shop_id     INTEGER,
    network_id  INTEGER,
    is_local    INTEGER NOT NULL DEFAULT 0,  -- 0=false, 1=true (offline QR session)
    qr_token    TEXT    UNIQUE,
    qr_used_at  TEXT,
    started_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    ended_at    TEXT,
    FOREIGN KEY (user_id)    REFERENCES users(user_id)           ON DELETE CASCADE,
    FOREIGN KEY (shop_id)    REFERENCES shops(shop_id)           ON DELETE SET NULL,
    FOREIGN KEY (network_id) REFERENCES network_config(network_id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 9: files
-- ============================================================
CREATE TABLE IF NOT EXISTS files (
    file_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid        TEXT    NOT NULL UNIQUE,
    storage_id  INTEGER NOT NULL,
    session_id  INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('pdf','docx','jpg','png','txt')),
    size        INTEGER NOT NULL CHECK(size > 0),
    pages       INTEGER,
    uploaded_at TEXT    NOT NULL DEFAULT (datetime('now')),
    status      TEXT    NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','ready','expired','deleted')),
    FOREIGN KEY (storage_id) REFERENCES storage(storage_id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE RESTRICT
);

-- ============================================================
-- TABLE 10: print_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS print_settings (
    settings_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    color_mode  TEXT    NOT NULL DEFAULT 'bw'
                        CHECK(color_mode IN ('bw','color','grayscale')),
    orientation TEXT    NOT NULL DEFAULT 'portrait'
                        CHECK(orientation IN ('portrait','landscape')),
    scaling     TEXT    NOT NULL DEFAULT 'fit'
                        CHECK(scaling IN ('fit','fill','actual','custom')),
    sides       TEXT    NOT NULL DEFAULT 'simplex'
                        CHECK(sides IN ('simplex','duplex_long','duplex_short')),
    paper_size  TEXT    NOT NULL DEFAULT 'A4'
                        CHECK(paper_size IN ('A4','A3','Letter','Legal')),
    copies      INTEGER NOT NULL DEFAULT 1 CHECK(copies BETWEEN 1 AND 999),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 11: print_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS print_jobs (
    job_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid            TEXT    NOT NULL UNIQUE,
    file_id         INTEGER NOT NULL,
    printer_id      INTEGER NOT NULL,
    settings_id     INTEGER,
    session_id      INTEGER NOT NULL,
    shop_id         INTEGER NOT NULL,
    origin          TEXT    NOT NULL DEFAULT 'online'
                            CHECK(origin IN ('online','offline')),
    status          TEXT    NOT NULL DEFAULT 'queued'
                            CHECK(status IN ('queued','printing','done','failed','cancelled')),
    queue_position  INTEGER,
    payment_group_id INTEGER,
    priority        INTEGER NOT NULL DEFAULT 5 CHECK(priority BETWEEN 1 AND 10),
    cost            REAL    CHECK(cost IS NULL OR cost >= 0),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    error_code      TEXT,
    printed_at      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (file_id)     REFERENCES files(file_id)           ON DELETE RESTRICT,
    FOREIGN KEY (printer_id)  REFERENCES printers(printer_id)     ON DELETE RESTRICT,
    FOREIGN KEY (settings_id) REFERENCES print_settings(settings_id),
    FOREIGN KEY (session_id)  REFERENCES sessions(session_id)     ON DELETE RESTRICT,
    FOREIGN KEY (shop_id)     REFERENCES shops(shop_id)           ON DELETE RESTRICT
);

-- ============================================================
-- TABLE 12: print_job_pricing  [M:N junction]
-- ============================================================
CREATE TABLE IF NOT EXISTS print_job_pricing (
    job_id     INTEGER NOT NULL,
    pricing_id INTEGER NOT NULL,
    applied_at TEXT    NOT NULL DEFAULT (datetime('now')),
    amount     REAL    NOT NULL CHECK(amount >= 0),
    PRIMARY KEY (job_id, pricing_id),
    FOREIGN KEY (job_id)     REFERENCES print_jobs(job_id)  ON DELETE CASCADE,
    FOREIGN KEY (pricing_id) REFERENCES pricing(pricing_id) ON DELETE RESTRICT
);

-- ============================================================
-- TABLE 13: payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid                 TEXT    NOT NULL UNIQUE,
    job_id               INTEGER NOT NULL,
    payment_group_id     INTEGER,
    method               TEXT    NOT NULL
                                 CHECK(method IN ('cash','upi','card','wallet','netbanking')),
    amount               REAL    NOT NULL CHECK(amount > 0),
    status               TEXT    NOT NULL DEFAULT 'pending'
                                 CHECK(status IN ('pending','success','failed','refunded')),
    razorpay_order_id    TEXT,
    razorpay_payment_id  TEXT    UNIQUE,
    razorpay_signature   TEXT,
    gateway_txn_id       TEXT    UNIQUE,
    attempt_no           INTEGER NOT NULL DEFAULT 1 CHECK(attempt_no >= 1),
    paid_at              TEXT,
    FOREIGN KEY (job_id) REFERENCES print_jobs(job_id) ON DELETE RESTRICT
);

-- ============================================================
-- TABLE 14: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER,
    shop_id         INTEGER,
    target_type     TEXT    NOT NULL CHECK(target_type IN ('customer','shopkeeper')),
    type            TEXT    NOT NULL
                            CHECK(type IN ('job_complete','payment','alert','info','new_job')),
    job_id          INTEGER,
    message         TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'unread'
                            CHECK(status IN ('unread','read','dismissed')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)      ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id)      ON DELETE CASCADE,
    FOREIGN KEY (job_id)  REFERENCES print_jobs(job_id)  ON DELETE SET NULL
);

-- ============================================================
-- TABLE 15: activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    log_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL,
    user_id     INTEGER,
    shop_id     INTEGER,
    event_type  TEXT    NOT NULL
                        CHECK(event_type IN ('upload','print','payment','login','logout','error','qr_scan')),
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE SET NULL,
    FOREIGN KEY (shop_id)    REFERENCES shops(shop_id)       ON DELETE SET NULL
);

-- ============================================================
-- TABLE 16: outbox  [LOCAL SERVER ONLY — offline sync queue]
-- ============================================================
CREATE TABLE IF NOT EXISTS outbox (
    outbox_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    entity      TEXT    NOT NULL,
    entity_uuid TEXT    NOT NULL,
    operation   TEXT    NOT NULL DEFAULT 'insert'
                        CHECK(operation IN ('insert','update','delete')),
    payload     TEXT    NOT NULL,   -- JSON string
    synced_at   TEXT,               -- NULL = pending
    failed_at   TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(synced_at, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_entity  ON outbox(entity, entity_uuid, synced_at);

-- ============================================================
-- TABLE 17: qr_tokens  [LOCAL SERVER ONLY]
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_tokens (
    token_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id    INTEGER NOT NULL,
    token      TEXT    NOT NULL UNIQUE,
    expires_at TEXT    NOT NULL,
    used_at    TEXT,
    session_id INTEGER,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id)    REFERENCES shops(shop_id)       ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_shop    ON print_jobs(shop_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_session ON print_jobs(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pay_status   ON payments(status, job_id);
CREATE INDEX IF NOT EXISTS idx_notif_user   ON notifications(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_shop   ON notifications(shop_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_files_sess   ON files(session_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_printer_seen ON printers(shop_id, status, last_seen);
CREATE INDEX IF NOT EXISTS idx_log_user     ON activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qr_valid     ON qr_tokens(token, used_at, expires_at);
