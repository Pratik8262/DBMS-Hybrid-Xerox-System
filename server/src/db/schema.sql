-- ============================================================
--  PRINT SHOP PLATFORM — COMPLETE MVP SCHEMA
--  Designed for: dual-server (online + local), Razorpay payments,
--  offline QR hotspot flow, outbox sync pattern
--  DB: MySQL 8.0+ (online: Supabase/PostgreSQL compatible with minor
--      type adjustments; local: SQLite with noted exceptions)
-- ============================================================


-- ============================================================
--  TABLE 1: users
--  Customers who use the platform (online or offline via QR)
-- ============================================================
CREATE TABLE users (
    user_id    INT            NOT NULL AUTO_INCREMENT,
    uuid       CHAR(36)       NOT NULL DEFAULT (UUID()),   -- stable cross-server ID
    name       VARCHAR(100)   NOT NULL,
    phone      VARCHAR(15)    NOT NULL,
    email      VARCHAR(150)   NULL,
    device_id  VARCHAR(100)   NULL,                        -- last registered device
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users     PRIMARY KEY (user_id),
    CONSTRAINT uq_user_uuid UNIQUE (uuid),
    CONSTRAINT uq_phone     UNIQUE (phone),
    CONSTRAINT uq_email     UNIQUE (email)
);


-- ============================================================
--  TABLE 2: shops
--  Print shop registrations
-- ============================================================
CREATE TABLE shops (
    shop_id    INT            NOT NULL AUTO_INCREMENT,
    uuid       CHAR(36)       NOT NULL DEFAULT (UUID()),
    shop_name  VARCHAR(150)   NOT NULL,
    email      VARCHAR(150)   NULL,
    contact    VARCHAR(15)    NOT NULL,
    status     ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_shops      PRIMARY KEY (shop_id),
    CONSTRAINT uq_shop_uuid  UNIQUE (uuid),
    CONSTRAINT uq_shop_email UNIQUE (email)
);


-- ============================================================
--  TABLE 3: shop_address
--  1:1 with shops. Stores location + local network IP for QR
-- ============================================================
CREATE TABLE shop_address (
    shop_id  INT            NOT NULL,
    address  VARCHAR(255)   NOT NULL,
    area     VARCHAR(100)   NULL,
    city     VARCHAR(100)   NOT NULL,
    pincode  VARCHAR(10)    NOT NULL,
    local_ip VARCHAR(45)    NULL,   -- hotspot IP encoded in QR code (IPv4/IPv6)
    CONSTRAINT pk_shop_addr PRIMARY KEY (shop_id),
    CONSTRAINT fk_addr_shop FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE CASCADE
);


-- ============================================================
--  TABLE 4: network_config
--  Shop hotspot / Wi-Fi details used to generate QR codes
-- ============================================================
CREATE TABLE network_config (
    network_id     INT            NOT NULL AUTO_INCREMENT,
    shop_id        INT            NOT NULL,
    ssid           VARCHAR(100)   NOT NULL,
    auth_type      ENUM('WPA2','WPA3','Open','WEP') NOT NULL DEFAULT 'WPA2',
    credential_ref VARCHAR(255)   NULL,      -- vault reference, never raw password
    is_primary     BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_netcfg   PRIMARY KEY (network_id),
    CONSTRAINT fk_net_shop FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE CASCADE
);


-- ============================================================
--  TABLE 5: printers
--  Physical printers registered under a shop
-- ============================================================
CREATE TABLE printers (
    printer_id   INT            NOT NULL AUTO_INCREMENT,
    shop_id      INT            NOT NULL,
    name         VARCHAR(100)   NOT NULL,
    ip_address   VARCHAR(45)    NOT NULL,
    protocol     ENUM('ipp','cups','raw_tcp') NOT NULL DEFAULT 'ipp',
    status       ENUM('online','offline','error','busy') NOT NULL DEFAULT 'offline',
    capabilities JSON           NULL,        -- paper sizes, duplex, color support
    last_seen    TIMESTAMP      NULL,        -- last heartbeat timestamp
    CONSTRAINT pk_printers  PRIMARY KEY (printer_id),
    CONSTRAINT fk_prt_shop  FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE RESTRICT,
    CONSTRAINT uq_prt_ip    UNIQUE (shop_id, ip_address)
);


-- ============================================================
--  TABLE 6: pricing
--  Per-shop pricing rules. Unique per combination.
-- ============================================================
CREATE TABLE pricing (
    pricing_id       INT            NOT NULL AUTO_INCREMENT,
    shop_id          INT            NOT NULL,
    color_type       ENUM('bw','color','grayscale')             NOT NULL,
    paper_size       ENUM('A4','A3','Letter','Legal')           NOT NULL,
    finishing_type   ENUM('none','staple','binding','laminate') NOT NULL DEFAULT 'none',
    duplex_supported BOOLEAN        NOT NULL DEFAULT FALSE,
    price_per_page   DECIMAL(10,4)  NOT NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_pricing     PRIMARY KEY (pricing_id),
    CONSTRAINT fk_price_shop  FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE CASCADE,
    CONSTRAINT uq_price_rule  UNIQUE (shop_id, color_type, paper_size, finishing_type),
    CONSTRAINT chk_price      CHECK (price_per_page > 0)
);


-- ============================================================
--  TABLE 7: storage
--  Backend file storage reference (Cloudinary for MVP)
--  shop_id added for future quota enforcement
-- ============================================================
CREATE TABLE storage (
    storage_id   INT            NOT NULL AUTO_INCREMENT,
    shop_id      INT            NULL,        -- which shop owns this storage entry
    storage_type ENUM('local','cloudinary','s3','gcs','azure') NOT NULL DEFAULT 'cloudinary',
    path         VARCHAR(500)   NOT NULL,    -- Cloudinary public_id or full path
    checksum     VARCHAR(64)    NULL,        -- SHA-256 integrity check
    expiry_at    TIMESTAMP      NULL,        -- auto-deletion deadline
    CONSTRAINT pk_storage      PRIMARY KEY (storage_id),
    CONSTRAINT fk_storage_shop FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE SET NULL
);


-- ============================================================
--  TABLE 8: sessions
--  One session per user visit — online or offline (QR-initiated)
--  qr_token: one-time token embedded in QR URL for offline auth
--  network_id: which hotspot the session came through
--  is_local: TRUE = originated from offline QR scan
-- ============================================================
CREATE TABLE sessions (
    session_id  INT            NOT NULL AUTO_INCREMENT,
    uuid        CHAR(36)       NOT NULL DEFAULT (UUID()),
    user_id     INT            NOT NULL,
    shop_id     INT            NULL,         -- NULL for purely online sessions
    network_id  INT            NULL,         -- FK to network_config (offline only)
    is_local    BOOLEAN        NOT NULL DEFAULT FALSE,
    qr_token    VARCHAR(64)    NULL,         -- one-time token from QR code
    qr_used_at  TIMESTAMP      NULL,         -- when token was consumed
    started_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at    TIMESTAMP      NULL,
    CONSTRAINT pk_sessions      PRIMARY KEY (session_id),
    CONSTRAINT uq_session_uuid  UNIQUE (uuid),
    CONSTRAINT fk_sess_user     FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_sess_shop     FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE SET NULL,
    CONSTRAINT fk_sess_network  FOREIGN KEY (network_id)
        REFERENCES network_config(network_id) ON DELETE SET NULL,
    CONSTRAINT uq_qr_token      UNIQUE (qr_token),
    CONSTRAINT chk_sess_times   CHECK (ended_at IS NULL OR ended_at > started_at)
);


-- ============================================================
--  TABLE 9: files
--  Uploaded documents. uuid for cross-server dedup on sync.
-- ============================================================
CREATE TABLE files (
    file_id     INT            NOT NULL AUTO_INCREMENT,
    uuid        CHAR(36)       NOT NULL DEFAULT (UUID()),
    storage_id  INT            NOT NULL,
    session_id  INT            NOT NULL,
    name        VARCHAR(255)   NOT NULL,    -- original filename
    type        ENUM('pdf','docx','jpg','png','txt') NOT NULL,
    size        INT            NOT NULL,    -- bytes
    pages       SMALLINT       NULL,        -- page count (for cost calculation)
    uploaded_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status      ENUM('pending','ready','expired','deleted') NOT NULL DEFAULT 'pending',
    CONSTRAINT pk_files       PRIMARY KEY (file_id),
    CONSTRAINT uq_file_uuid   UNIQUE (uuid),
    CONSTRAINT fk_file_store  FOREIGN KEY (storage_id)
        REFERENCES storage(storage_id) ON DELETE RESTRICT,
    CONSTRAINT fk_file_sess   FOREIGN KEY (session_id)
        REFERENCES sessions(session_id) ON DELETE RESTRICT,
    CONSTRAINT chk_file_size  CHECK (size > 0)
);


-- ============================================================
--  TABLE 10: print_settings
--  Reusable print configuration. user_id for saved preferences.
-- ============================================================
CREATE TABLE print_settings (
    settings_id INT            NOT NULL AUTO_INCREMENT,
    user_id     INT            NULL,         -- NULL = anonymous / one-off
    color_mode  ENUM('bw','color','grayscale')              NOT NULL DEFAULT 'bw',
    orientation ENUM('portrait','landscape')                NOT NULL DEFAULT 'portrait',
    scaling     ENUM('fit','fill','actual','custom')        NOT NULL DEFAULT 'fit',
    sides       ENUM('simplex','duplex_long','duplex_short') NOT NULL DEFAULT 'simplex',
    paper_size  ENUM('A4','A3','Letter','Legal')            NOT NULL DEFAULT 'A4',
    copies      TINYINT        NOT NULL DEFAULT 1,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_settings    PRIMARY KEY (settings_id),
    CONSTRAINT fk_settings_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_copies     CHECK (copies BETWEEN 1 AND 999)
);


-- ============================================================
--  TABLE 11: print_jobs
--  Core job entity. uuid for safe cross-server sync.
--  origin: 'online' (Razorpay flow) or 'offline' (QR hotspot)
-- ============================================================
CREATE TABLE print_jobs (
    job_id         INT            NOT NULL AUTO_INCREMENT,
    uuid           CHAR(36)       NOT NULL DEFAULT (UUID()),
    file_id        INT            NOT NULL,
    printer_id     INT            NOT NULL,
    settings_id    INT            NOT NULL,
    session_id     INT            NOT NULL,
    shop_id        INT            NOT NULL,   -- denormalized for fast shop-level queries
    origin         ENUM('online','offline') NOT NULL DEFAULT 'online',
    status         ENUM('queued','printing','done','failed','cancelled') NOT NULL DEFAULT 'queued',
    queue_position SMALLINT       NULL,
    priority       TINYINT        NOT NULL DEFAULT 5,
    cost           DECIMAL(10,2)  NULL,       -- total = SUM(print_job_pricing.amount)
    retry_count    TINYINT        NOT NULL DEFAULT 0,
    error_code     VARCHAR(50)    NULL,
    printed_at     TIMESTAMP      NULL,
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_jobs          PRIMARY KEY (job_id),
    CONSTRAINT uq_job_uuid      UNIQUE (uuid),
    CONSTRAINT fk_job_file      FOREIGN KEY (file_id)
        REFERENCES files(file_id)             ON DELETE RESTRICT,
    CONSTRAINT fk_job_printer   FOREIGN KEY (printer_id)
        REFERENCES printers(printer_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_job_settings  FOREIGN KEY (settings_id)
        REFERENCES print_settings(settings_id),
    CONSTRAINT fk_job_session   FOREIGN KEY (session_id)
        REFERENCES sessions(session_id)       ON DELETE RESTRICT,
    CONSTRAINT fk_job_shop      FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id)             ON DELETE RESTRICT,
    CONSTRAINT chk_cost         CHECK (cost IS NULL OR cost >= 0),
    CONSTRAINT chk_priority     CHECK (priority BETWEEN 1 AND 10)
);


-- ============================================================
--  TABLE 12: print_job_pricing  (Junction — M:N)
--  Links each job to the pricing rule(s) applied.
--  cost in print_jobs MUST always equal SUM(amount) here.
-- ============================================================
CREATE TABLE print_job_pricing (
    job_id     INT            NOT NULL,
    pricing_id INT            NOT NULL,
    applied_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount     DECIMAL(10,2)  NOT NULL,
    CONSTRAINT pk_jbp      PRIMARY KEY (job_id, pricing_id),
    CONSTRAINT fk_jbp_job  FOREIGN KEY (job_id)
        REFERENCES print_jobs(job_id) ON DELETE CASCADE,
    CONSTRAINT fk_jbp_prc  FOREIGN KEY (pricing_id)
        REFERENCES pricing(pricing_id) ON DELETE RESTRICT,
    CONSTRAINT chk_amount  CHECK (amount >= 0)
);


-- ============================================================
--  TABLE 13: payments
--  uuid for dedup on sync retry. Razorpay fields added.
--  Multiple rows per job allowed (split pay, retry, refund).
--  payment_group_id groups rows belonging to the same job attempt.
-- ============================================================
CREATE TABLE payments (
    payment_id        INT            NOT NULL AUTO_INCREMENT,
    uuid              CHAR(36)       NOT NULL DEFAULT (UUID()),
    job_id            INT            NOT NULL,
    payment_group_id  INT            NULL,     -- groups split / retry payments per job
    method            ENUM('cash','upi','card','wallet','netbanking') NOT NULL,
    amount            DECIMAL(10,2)  NOT NULL,
    status            ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
    -- Razorpay specific fields
    razorpay_order_id   VARCHAR(100)  NULL,    -- from orders.create()
    razorpay_payment_id VARCHAR(100)  NULL,    -- returned after capture
    razorpay_signature  VARCHAR(255)  NULL,    -- HMAC-SHA256 for verification
    gateway_txn_id      VARCHAR(100)  NULL,    -- generic fallback for non-Razorpay
    attempt_no          TINYINT       NOT NULL DEFAULT 1,
    paid_at             TIMESTAMP     NULL,
    CONSTRAINT pk_payments       PRIMARY KEY (payment_id),
    CONSTRAINT uq_pay_uuid       UNIQUE (uuid),
    CONSTRAINT uq_gateway_txn    UNIQUE (gateway_txn_id),
    CONSTRAINT uq_rp_payment_id  UNIQUE (razorpay_payment_id),
    CONSTRAINT fk_pay_job        FOREIGN KEY (job_id)
        REFERENCES print_jobs(job_id) ON DELETE RESTRICT,
    CONSTRAINT chk_pay_amount    CHECK (amount > 0),
    CONSTRAINT chk_attempt       CHECK (attempt_no >= 1)
);


-- ============================================================
--  TABLE 14: notifications
--  For both customers (job_complete, payment) and shopkeepers
--  (new_job alert). target_type routes to correct recipient.
-- ============================================================
CREATE TABLE notifications (
    notification_id INT            NOT NULL AUTO_INCREMENT,
    user_id         INT            NULL,      -- NULL if targeting shop staff
    shop_id         INT            NULL,      -- NULL if targeting customer
    target_type     ENUM('customer','shopkeeper') NOT NULL,
    type            ENUM('job_complete','payment','alert','info','new_job') NOT NULL,
    job_id          INT            NULL,      -- linked job if relevant
    message         TEXT           NOT NULL,
    status          ENUM('unread','read','dismissed') NOT NULL DEFAULT 'unread',
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_notif      PRIMARY KEY (notification_id),
    CONSTRAINT fk_notif_usr  FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_shop FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_job  FOREIGN KEY (job_id)
        REFERENCES print_jobs(job_id) ON DELETE SET NULL
);


-- ============================================================
--  TABLE 15: activity_log
--  Audit trail. user_id denormalized for fast user-level queries.
-- ============================================================
CREATE TABLE activity_log (
    log_id      INT            NOT NULL AUTO_INCREMENT,
    session_id  INT            NOT NULL,
    user_id     INT            NULL,          -- denormalized from session for fast queries
    shop_id     INT            NULL,          -- denormalized for shop-level audit
    event_type  ENUM('upload','print','payment','login','logout','error','qr_scan') NOT NULL,
    description TEXT           NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_activity   PRIMARY KEY (log_id),
    CONSTRAINT fk_act_sess   FOREIGN KEY (session_id)
        REFERENCES sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_act_user   FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_act_shop   FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE SET NULL
);


-- ============================================================
--  TABLE 16: outbox
--  Sync queue for offline → online reconciliation.
--  Written atomically alongside every SQLite write on local server.
--  Sync worker polls this table and drains to Supabase via POST.
--  synced_at NULL = pending. Worker marks it after success.
--  entity_uuid used on online server to prevent duplicate inserts.
-- ============================================================
CREATE TABLE outbox (
    outbox_id   INT            NOT NULL AUTO_INCREMENT,
    entity      VARCHAR(50)    NOT NULL,      -- 'print_job','file','payment','session'
    entity_uuid CHAR(36)       NOT NULL,      -- UUID of the entity being synced
    operation   ENUM('insert','update','delete') NOT NULL DEFAULT 'insert',
    payload     JSON           NOT NULL,      -- full row snapshot at time of write
    synced_at   TIMESTAMP      NULL,          -- NULL = not yet synced to Supabase
    failed_at   TIMESTAMP      NULL,          -- last failed sync attempt
    retry_count TINYINT        NOT NULL DEFAULT 0,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_outbox PRIMARY KEY (outbox_id),
    INDEX idx_outbox_pending (synced_at, created_at)  -- fast polling query
);


-- ============================================================
--  TABLE 17: qr_tokens
--  One-time tokens for offline QR hotspot sessions.
--  Generated by local server, embedded in QR URL.
--  Consumed once when customer opens the upload UI.
--  expires_at: short TTL (e.g. 10 minutes) to prevent reuse.
-- ============================================================
CREATE TABLE qr_tokens (
    token_id   INT            NOT NULL AUTO_INCREMENT,
    shop_id    INT            NOT NULL,
    token      VARCHAR(64)    NOT NULL,
    expires_at TIMESTAMP      NOT NULL,
    used_at    TIMESTAMP      NULL,           -- NULL = not yet consumed
    session_id INT            NULL,           -- set after customer opens UI
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_qr_token    PRIMARY KEY (token_id),
    CONSTRAINT uq_qr_token    UNIQUE (token),
    CONSTRAINT fk_qr_shop     FOREIGN KEY (shop_id)
        REFERENCES shops(shop_id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_session  FOREIGN KEY (session_id)
        REFERENCES sessions(session_id) ON DELETE SET NULL
);


-- ============================================================
--  INDEXES
--  Beyond PKs and UQs already defined above
-- ============================================================

-- Fast job lookup by shop (shopkeeper dashboard)
CREATE INDEX idx_jobs_shop       ON print_jobs(shop_id, status, created_at);

-- Fast job lookup by session (customer status page)
CREATE INDEX idx_jobs_session    ON print_jobs(session_id, created_at);

-- Pending payments for retry / reconciliation
CREATE INDEX idx_pay_status      ON payments(status, job_id);

-- Unread notifications per user
CREATE INDEX idx_notif_user      ON notifications(user_id, status, created_at);

-- Unread notifications per shop
CREATE INDEX idx_notif_shop      ON notifications(shop_id, status, created_at);

-- Files by session (customer upload history)
CREATE INDEX idx_files_session   ON files(session_id, uploaded_at);

-- Printer heartbeat monitoring
CREATE INDEX idx_printer_seen    ON printers(shop_id, status, last_seen);

-- Activity log by user (audit queries)
CREATE INDEX idx_log_user        ON activity_log(user_id, created_at);

-- Outbox pending sync (already has index above, adding composite for safety)
CREATE INDEX idx_outbox_entity   ON outbox(entity, entity_uuid, synced_at);

-- QR token validity check (local server does this on every scan)
CREATE INDEX idx_qr_valid        ON qr_tokens(token, used_at, expires_at);
