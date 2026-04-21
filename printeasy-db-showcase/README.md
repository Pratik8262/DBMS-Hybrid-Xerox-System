# PrintEasy DB Showcase

A comprehensive demonstration project built for DBMS Formative Assessment (FA2) comparing **SQLite (Relational)** and **MongoDB (NoSQL Document)** approaches side-by-side using the same application domain: `PrintEasy`, a print shop platform.

## 🚀 Setup & Execution

### 1. Prerequisites
- Node.js (v16+)
- MongoDB Atlas account (or local MongoDB server)

### 2. Installation
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### 3. Configuration
Edit the `.env` file to add your MongoDB connection string. Unmodified, the app will still start and the SQLite portion will work locally.
```env
PORT=3000
MONGODB_URI=mongodb+srv://<USER>:<PASS>@cluster.mongodb.net/printeasy
SQLITE_DB_PATH=./printeasy.db
```

### 4. Run the Application
```bash
# Start the server
npm start

# For development with auto-restart
npm run dev
```

Visit **http://localhost:3000** in your browser to view the side-by-side showcase dashboard!

---

## 🏛️ Schema Overview (PrintEasy Domain)

The domain revolves around managing users mapping to print shops, sessions managed via QR tokens, file uploads, printing hardware, queued jobs, and payments.

### The 17 SQL Tables
1. `users`
2. `shops`
3. `shop_address` (1:1 extension)
4. `network_config` (shop configurations)
5. `printers`
6. `pricing`
7. `storage`
8. `sessions` (binds user and shop)
9. `files`
10. `print_settings`
11. `print_jobs`
12. `print_job_pricing` (Junction)
13. `payments`
14. `notifications`
15. `activity_log`
16. `outbox` (offline sync)
17. `qr_tokens`

### 🍃 MongoDB Documents (Denormalized)
The 17 tables are condensed into 6 main collections in MongoDB, aggressively embedding data:
1. `User`
2. `Shop` (embeds Address, NetworkConfigs)
3. `Session`
4. `File` (embeds Storage info)
5. `PrintJob` (embeds PrintSettings)
6. `Payment`

---

## 📡 API Endpoints 

The application exposes mirrored REST APIs for both databases under `/api/sql/` and `/api/mongo/`. Note: Replace `{db}` with `sql` or `mongo`.

### Data Modification (Examples)

**1. Create User**
```bash
curl -X POST http://localhost:3000/api/{db}/users \
-H "Content-Type: application/json" \
-d '{"name":"Alice","phone":"1234567890","email":"alice@example.com"}'
```

**2. Create Shop**
```bash
curl -X POST http://localhost:3000/api/{db}/shops \
-H "Content-Type: application/json" \
-d '{"shopName":"Xerox Point","contact":"9876543210","address":{"city":"Mumbai","pincode":"400001"}}'
```

**3. Start Session**
```bash
curl -X POST http://localhost:3000/api/{db}/sessions \
-H "Content-Type: application/json" \
-d '{"userId":"...","shopId":"...","isLocal":true}'
```

**4. Upload File**
```bash
curl -X POST http://localhost:3000/api/{db}/files \
-H "Content-Type: application/json" \
-d '{"sessionId":"...","name":"doc.pdf","type":"pdf","size":1024,"pages":5}'
```

**5. Submit Print Job**
```bash
curl -X POST http://localhost:3000/api/{db}/print-jobs \
-H "Content-Type: application/json" \
-d '{"fileId":"...","sessionId":"...","shopId":"..."}'
```

**6. Process Payment**
```bash
curl -X POST http://localhost:3000/api/{db}/payments \
-H "Content-Type: application/json" \
-d '{"jobId":"...","method":"upi","amount":50, "status": "success"}'
```

---

## 🔍 Database Query Comparisons

### 1. Revenue Report
- **SQL:** Uses complex multi-JOIN `(shops → print_jobs → payments)` with `SUM()`, `AVG()`, `GROUP BY shop_id`.
- **Mongo:** Uses Aggregation Pipeline: `$match` successful payments → `$lookup` printjobs → `$unwind` → `$lookup` shops → `$group` by shopId averaging and summing amounts.

### 2. Active Sessions
- **SQL:** Filters sessions `WHERE ended_at IS NULL`, Left JOINs users, shops, files, and print_jobs. Uses `COUNT(file_id)` per session grouping.
- **Mongo:** Aggregation Pipeline: `$match` `{ endedAt: null }` → nested `$lookups` for users, shops, files → `$project` counts using `$size`.

### 3. Print Queue Status
- **SQL:** Filters print_jobs by `status IN ('queued', 'printing')`. Joins files, shops, printers, print_settings to project exactly what the print-server daemon needs. Orders by `priority DESC`, `queue_position ASC`.
- **Mongo:** Aggregation Pipeline `$match` statuses → `$lookup` files, sessions, shops → flattens via `$unwind` → `$sort`. Embedded print settings make the payload instantly ready without extra joins.

### 4. Pricing Lookup / Analytics
- **SQL:** Exact multi-column match in the `pricing` table indexing `(shop_id, color_type, paper_size, finishing_type)`.
- **Mongo:** `$lookup` payments for jobs → `$group` by shop to calculate `avg_cost` and failure ratios using conditional logic (`$cond`).

### 5. User Print History
- **SQL:** `SELECT` from sessions joined to print_jobs, files, and shops filtered by `user_id`. Highly normalized means 4 JOINs per history request.
- **Mongo:** Fetches Session IDs array for user -> Aggregation `$match` -> merges job and file data using `$lookup`.

---

## ⚖️ Tradeoff Comparison

| Feature/Concern | SQLite (Relational) | MongoDB (Document) |
| :--- | :--- | :--- |
| **Schema enforcement** | Strict. Constraints guarantee consistency. Cannot upload file without valid `session_id`. | Flexible. App handles validation. Great for varying `print_settings` formats. |
| **Queries/Analytics** | Excellent. Powerful JOINs make financial reporting native and mathematically robust. | Good via Pipelines, but cumbersome. Requires `$lookup` processing in memory. |
| **Nested Data** | Difficult. Print settings mapped to settings tables or junction tables (`print_job_pricing`). | Excellent. Files have `storage` subdocs; Jobs have `settings` subdocs. Instant reads. |
| **Write Performance** | Sequential (WAL mode helps, but single writer lock). Transactional integrity out of box. | High concurrent throughput. Denormalization reduces write operations across collections. |
| **Best suited for** | Local offline processing (Outbox queue, QR caching), Strict financial tracking. | Global highly scalable ingestion (telemetry, files), rapid scaling of nodes. |

---

## 📸 Dashboard Preview

*(Add screenshots of your UI running here for the FA PDF/presentation)*

> **Architect Note:** For the PrintEasy production topology, SQLite acts as the localized Edge Database running on the print shop's router gateway, while MongoDB powers the cloud centralized hub for metrics and global state!
