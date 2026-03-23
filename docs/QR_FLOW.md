# PrintEasy — Offline QR Hotspot Flow

## Overview

The offline QR flow allows customers to print files at a shop **without internet**. The shop runs a local server on a mini PC connected to a Wi-Fi hotspot. Customers scan a QR code, connect to the hotspot, and access a lightweight browser-based upload UI served by the local server.

---

## Prerequisites

- Shop mini PC running `node local.js` on port 3001
- Shop's Wi-Fi hotspot broadcasting on local network
- `shop_address.local_ip` set in the database (auto-detected on server startup)

---

## Step-by-Step Flow

```
SHOPKEEPER                    LOCAL SERVER                   CUSTOMER
     │                             │                             │
     │── POST /api/qr/generate ───>│                             │
     │                             │ Creates qr_tokens row:      │
     │                             │   token = secure random     │
     │                             │   expires_at = NOW + 10min  │
     │                             │   used_at = NULL            │
     │<── { url, token } ──────────│                             │
     │                             │                             │
     │ [Displays QR code on screen]│                             │
     │  QR encodes:                │                             │
     │  http://<local_ip>:3001/    │                             │
     │  ?token=<one-time-token>    │                             │
     │                             │                             │
     │                             │     [Customer scans QR]     │
     │                             │                             │
     │                             │<── GET /?token=<token> ─────│
     │                             │                             │
     │                             │ 1. Validate token:          │
     │                             │    WHERE token = ?          │
     │                             │    AND used_at IS NULL      │
     │                             │    AND expires_at > NOW()   │
     │                             │                             │
     │                             │ 2. Mark token consumed:     │
     │                             │    UPDATE qr_tokens         │
     │                             │    SET used_at = NOW()      │
     │                             │                             │
     │                             │ 3. Create session:          │
     │                             │    INSERT sessions          │
     │                             │    (is_local = 1,           │
     │                             │     qr_token = token)       │
     │                             │                             │
     │                             │ 4. Set cookie:              │
     │                             │    Set-Cookie: sessionId=X  │
     │                             │                             │
     │                             │──► Redirect to /upload.html │
     │                             │                             │
     │                             │     [Customer uploads file] │
     │                             │<── POST /api/files/upload ──│
     │                             │     (multipart, sessionId   │
     │                             │      in cookie)             │
     │                             │                             │
     │                             │ 5. Store locally (SQLite)   │
     │                             │    + outbox write           │
     │                             │    (ATOMIC TRANSACTION)     │
     │                             │                             │
     │                             │ 6. Send to printer via IPP  │
     │                             │                             │
     │                             │──► { job_id, status }  ─────│
     │                             │                             │
     │                             │  [Customer tracks at        │
     │                             │   /status.html?job_id=X]    │
```

---

## Token Security

| Property | Value |
|---|---|
| Token format | 64-character cryptographically random hex string |
| TTL | 10 minutes (configurable via `QR_TOKEN_TTL_MINUTES`) |
| Single-use | `used_at` set on first access — reuse returns 403 |
| Scope | Tied to `shop_id` — can only create sessions at that shop |

---

## Session Lifecycle

```
QR scan → session created (is_local = TRUE, user_id = NULL initially)
       → file uploaded → linekd to session via session_id
       → job created → linked to session
       → (optional) user identifies via phone/OTP → user_id linked
       → session.ended_at set when customer leaves UI
```

Sessions created offline have `user_id = NULL` until the customer optionally identifies themselves. This allows anonymous print jobs in offline mode.

---

## Sync After Internet Restores

Once internet connectivity is detected:

```
Outbox Worker detects pending rows
     │
     ├── POST /api/sync/ingest  { entity: 'session', payload: {...} }
     ├── POST /api/sync/ingest  { entity: 'file',    payload: {...} }
     ├── POST /api/sync/ingest  { entity: 'print_job', payload: {...} }
     └── POST /api/sync/ingest  { entity: 'payment',  payload: {...} }

Online server checks: WHERE uuid = entity_uuid
  → Skips if already exists (idempotent)
  → Inserts if new

outbox.synced_at = NOW() ✓
```

---

## Error Cases

| Scenario | Behavior |
|---|---|
| Token expired (> 10 mins) | 403 — customer must get a fresh QR |
| Token already used | 403 — prevents session hijacking |
| Local server unreachable | Customer can't open QR URL — check hotspot |
| File too large (> 50MB) | 413 rejected by upload middleware |
| Printer offline | Job created as `queued`, shopkeeper retries manually |
| Internet never returns | Outbox rows stay pending indefinitely, no data lost |

---

## Database Tables Involved

| Table | Role |
|---|---|
| `qr_tokens` | One-time token with TTL |
| `sessions` | One session per QR scan (`is_local = TRUE`) |
| `network_config` | Hotspot SSID + credentials for QR code |
| `shop_address` | `local_ip` embedded in QR URL |
| `files` | Uploaded documents (stored locally) |
| `print_jobs` | Jobs created from offline uploads |
| `outbox` | Sync queue written atomically with every local write |
