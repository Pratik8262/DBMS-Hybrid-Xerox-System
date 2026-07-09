# 🖨️ PrintEasy

> A full-stack print shop management platform with **online** and **offline (QR hotspot)** support.

Customers upload documents, configure print settings, and pay via Razorpay. Shops get a real-time dashboard to manage jobs, printers, and pricing. When internet goes down, the shop runs a **local server on a mini PC** — customers connect via Wi-Fi QR code and print instantly. All data syncs back to the cloud automatically when internet returns.

---

## 📁 Project Structure

```
printeasy/
├── apps/
│   ├── web/          # React 18 + Vite + TailwindCSS (Customer & Shopkeeper UI)
│   └── local-ui/     # Plain HTML/JS offline UI (no build step needed)
├── server/           # Node.js + Express API (online & local mode)
├── database/
│   ├── schema.sql          # PostgreSQL DDL (Supabase)
│   ├── schema.sqlite.sql   # SQLite DDL (local server)
│   └── seeds/              # Seed scripts for dev/testing
└── docs/
    ├── API.md        # Complete API endpoint reference
    ├── SYNC.md       # Outbox sync pattern explained
    └── QR_FLOW.md    # Offline QR hotspot flow diagram
```

---

## 🗄️ Database (17 Tables)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Customer accounts |
| 2 | `shops` | Print shop registrations |
| 3 | `shop_address` | Shop location + local IP |
| 4 | `network_config` | Hotspot Wi-Fi settings |
| 5 | `printers` | Physical printers (IPP/CUPS) |
| 6 | `pricing` | Per-shop pricing rules |
| 7 | `storage` | File storage references (Cloudinary) |
| 8 | `sessions` | Customer sessions (online + offline QR) |
| 9 | `files` | Uploaded documents |
| 10 | `print_settings` | Print configuration (color, copies, etc.) |
| 11 | `print_jobs` | Core job entity |
| 12 | `print_job_pricing` | M:N junction (job ↔ pricing) |
| 13 | `payments` | Razorpay payments |
| 14 | `notifications` | Customer + shopkeeper push notifications |
| 15 | `activity_log` | Full audit trail |
| 16 | `outbox` | Offline→Online sync queue |
| 17 | `qr_tokens` | One-time tokens for QR sessions |

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, React Router, Zustand |
| Offline UI | Plain HTML + Vanilla JS |
| Backend | Node.js, Express, JWT, Winston, Socket.io |
| Online DB | Supabase (PostgreSQL) |
| Local DB | SQLite (`better-sqlite3`) |
| Payments | Razorpay |
| File Storage | Cloudinary |

---

## 🚀 Getting Started

### Online Server

```bash
cd server
cp .env.example .env         # fill in Supabase, Razorpay, Cloudinary keys
npm install
node server.js
```

### Local Server (Offline/Hotspot Mode)

```bash
cd server
cp .env.local.example .env.local    # fill in SQLite path, shop ID, online server URL
npm install
node local.js
```

### Frontend (Web App)

```bash
cd apps/web
npm install
npm run dev
```

---

## 📦 Seed the Database

```bash
# Seed a demo shop
node database/seeds/shops.seed.js

# Seed default pricing rules
node database/seeds/pricing.seed.js

# Seed default printer
node database/seeds/printers.seed.js
```

---

## 🔌 API Overview

See [`docs/API.md`](./docs/API.md) for the complete reference.

Key endpoints:

| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Customer registration |
| `POST /api/files/upload` | Upload documents |
| `POST /api/jobs` | Create print job (cost calculated server-side) |
| `POST /api/payments/create-order` | Initiate Razorpay payment |
| `POST /api/qr/generate` | Generate offline QR token (local server) |
| `POST /api/sync/ingest` | Receive outbox payloads (online server) |

---

## 🔄 Offline Flow

See [`docs/QR_FLOW.md`](./docs/QR_FLOW.md) for the full diagram.

1. Shop generates QR code → `POST /api/qr/generate`
2. Customer scans QR → connects to hotspot
3. Browser opens `http://<local-ip>/?token=<one-time-token>`
4. File uploaded locally → job printed via IPP
5. Outbox syncs to Supabase when internet returns

---

## 📄 Environment Variables

### Online (`.env`)
```
SERVER_MODE=online
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Local (`.env.local`)
```
SERVER_MODE=local
SQLITE_PATH=./data/printeasy.db
ONLINE_SERVER_URL=https://yourapp.com/api
ONLINE_SYNC_SECRET=
SHOP_ID=1
QR_TOKEN_TTL_MINUTES=10
```

---

## 💳 Razorpay Test Credentials

| Method | Value |
|---|---|
| Card (success) | `4111 1111 1111 1111`, any CVV, any future expiry |
| Card (failure) | `4000 0000 0000 0002` |
| UPI (success)  | `success@razorpay` |
| UPI (failure)  | `failure@razorpay` |

---

## 📚 Documentation

- [`docs/API.md`](./docs/API.md) — All 15 API route groups documented
- [`docs/SYNC.md`](./docs/SYNC.md) — Outbox sync pattern and retry logic
- [`docs/QR_FLOW.md`](./docs/QR_FLOW.md) — Offline QR hotspot flow walkthrough
