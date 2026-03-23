# PrintEasy — Outbox Sync Pattern (Local → Online)

## Overview

When the shop's internet goes down, the **local server** (SQLite on a mini PC) continues to accept customers, upload files, create jobs, and record payments. When the internet returns, a background worker called the **outbox worker** drains all pending local records to the **online Supabase server**.

This pattern guarantees **no data loss** even in fully offline operation.

---

## The Outbox Table

```sql
CREATE TABLE outbox (
    outbox_id   INT PRIMARY KEY AUTO_INCREMENT,
    entity      VARCHAR(50)   NOT NULL,   -- 'print_job', 'file', 'payment', 'session'
    entity_uuid CHAR(36)      NOT NULL,   -- UUID of the entity for dedup on online server
    operation   ENUM('insert','update','delete') NOT NULL DEFAULT 'insert',
    payload     JSON          NOT NULL,   -- full row snapshot at time of write
    synced_at   TIMESTAMP     NULL,       -- NULL = not yet synced
    failed_at   TIMESTAMP     NULL,       -- last failed attempt
    retry_count TINYINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

`synced_at IS NULL` = pending sync. The worker selects these rows and drains them.

---

## Atomic Write Rule (Rule #4)

Every write on the local server is wrapped in a **single SQLite transaction**:

```js
// outbox.queries.js — atomicWrite example
const tx = db.transaction(() => {
  // 1. Insert the real business entity
  const result = db.prepare('INSERT INTO print_jobs (...) VALUES (...)').run(jobData)

  // 2. ALWAYS insert outbox entry in SAME transaction
  db.prepare(`
    INSERT INTO outbox (entity, entity_uuid, operation, payload)
    VALUES (?, ?, ?, ?)
  `).run('print_job', jobData.uuid, 'insert', JSON.stringify(jobData))

  return result.lastInsertRowid
})

tx()  // If outbox write fails → job write also rolls back. Both succeed or both fail.
```

This ensures the outbox is **never out of sync** with the local DB.

---

## Outbox Worker (Cron Job)

File: `server/src/workers/outbox.worker.js`  
Schedule: Every **30 seconds** via `node-cron`

### Step-by-step cycle:

```
1. Check internet connectivity (ping ONLINE_SERVER_URL/health)
2. If offline → skip this cycle, log warning
3. SELECT all rows WHERE synced_at IS NULL ORDER BY created_at LIMIT 50
4. For each row:
   a. POST to https://yourapp.com/api/sync/ingest
      Headers: { x-sync-secret: ONLINE_SYNC_SECRET }
      Body:    { entity, entity_uuid, operation, payload }
   b. On 200 OK   → UPDATE outbox SET synced_at = NOW()
   c. On failure  → UPDATE outbox SET failed_at = NOW(), retry_count = retry_count + 1
5. Retry backoff: failed rows are skipped for (retry_count × 60 seconds)
6. Cleanup: DELETE rows WHERE synced_at IS NOT NULL AND synced_at < NOW() - INTERVAL 7 DAY
   (runs every hour, not every 30s)
```

---

## Online Server Ingest Endpoint

File: `server/src/controllers/sync.controller.js`  
Route: `POST /api/sync/ingest`

```
1. Verify x-sync-secret header matches ONLINE_SYNC_SECRET env var
2. Parse: { entity, entity_uuid, operation, payload }
3. Check if entity_uuid already exists in the target table
   → SELECT 1 FROM <table> WHERE uuid = :entity_uuid
4. If exists → SKIP (idempotent — safe to retry)
5. If not exists → INSERT the row from payload
6. Return 200 OK
```

### Why UUIDs?

SQLite and PostgreSQL have **independent auto-increment counters**. A job created locally with `job_id = 5` might conflict with an existing `job_id = 5` on Supabase. UUIDs are generated on the local server and are globally unique — this is what the online server uses to deduplicate.

---

## Data Flow Diagram

```
[Customer scans QR]
       │
       ▼
[Local Server — SQLite]
  ┌────────────────────────────┐
  │  BEGIN TRANSACTION         │
  │  INSERT print_job          │──── uuid generated here
  │  INSERT outbox (payload)   │
  │  COMMIT                    │
  └────────────────────────────┘
              │
              (internet returns)
              │
       ▼
[Outbox Worker — every 30s]
  SELECT unsynced rows
       │
       ▼
  POST /api/sync/ingest
       │
       ▼
[Online Server — Supabase]
  WHERE uuid = entity_uuid → skip if exists
  else → INSERT
       │
       ▼
  UPDATE outbox.synced_at = NOW()
```

---

## Retry Logic

| Condition | Behavior |
|---|---|
| Network timeout | `retry_count++`, retry after `retry_count × 60s` |
| 4xx from online server | Log warning, `retry_count++` |
| 5xx from online server | `retry_count++`, exponential backoff |
| `retry_count >= 10` | Alert logged, row remains pending for manual review |

---

## Configuration

```env
# Local server .env.local
ONLINE_SERVER_URL=https://yourapp.com/api
ONLINE_SYNC_SECRET=super_secret_shared_key
SHOP_ID=1
SHOP_UUID=xxxx-xxxx-xxxx-xxxx
```

```env
# Online server .env
ONLINE_SYNC_SECRET=super_secret_shared_key   # must match
```
