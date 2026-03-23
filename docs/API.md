# PrintEasy API Documentation

> Base URL (online): `https://yourapp.com/api`  
> Base URL (local):  `http://<local-ip>:3001/api`

All responses follow this shape:
```json
{ "success": true, "data": {}, "message": "...", "meta": {} }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

---

## Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new customer. Body: `{ name, phone, email? }` |
| POST | `/auth/login` | ❌ | Login. Body: `{ phone?, email? }`. Returns `{ token, user }` |
| GET  | `/auth/me` | ✅ JWT | Get current user profile |

---

## Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/users/:id` | ✅ | Get user by ID |
| PATCH  | `/users/:id` | ✅ | Update user profile |
| GET    | `/users/:id/stats` | ✅ | Get total uploads + total spent |

---

## Shops — `/api/shops`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/shops` | ❌ | List all active shops |
| GET    | `/shops/:id` | ❌ | Get shop details + address |
| GET    | `/shops/mine` | ✅ | Get the shop owned by current user |
| POST   | `/shops` | ✅ | Register a new shop |
| PATCH  | `/shops/:id` | ✅ | Update shop details |
| PATCH  | `/shops/:id/status` | ✅ | Toggle shop status (active/inactive) |

---

## Files — `/api/files`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST   | `/files/upload` | ✅ | Upload file(s). `multipart/form-data`. Max 50MB. |
| GET    | `/files/:id` | ✅ | Get file metadata |
| DELETE | `/files/:id` | ✅ | Mark file as deleted + schedule Cloudinary deletion |

---

## Print Jobs — `/api/jobs`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST   | `/jobs` | ✅ | Create a single print job. Cost calculated server-side. |
| POST   | `/jobs/batch` | ✅ | Create multiple jobs with shared payment group. |
| GET    | `/jobs/:id` | ✅ | Get job by ID |
| GET    | `/jobs/session/:sessionId` | ✅ | List jobs for a session (customer status page) |
| GET    | `/jobs/user/me` | ✅ | List jobs for current user |
| GET    | `/jobs/shop/:shopId` | ✅ | List all shop jobs (shopkeeper dashboard feed) |
| PATCH  | `/jobs/:id/status` | ✅ | Update job status (shopkeeper: queued→printing→done) |
| PATCH  | `/jobs/:id/cancel` | ✅ | Cancel a job |

---

## Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST   | `/payments/create-order` | ✅ | Create Razorpay order + pending payment row. Body: `{ job_id, amount, method }` |
| POST   | `/payments/verify` | ✅ | Verify HMAC signature, mark success, queue job. Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` |
| GET    | `/payments/:jobId` | ✅ | Get payment status for a job |

---

## Pricing — `/api/pricing`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/pricing/shop/:shopId` | ❌ | Get all pricing rules for a shop |
| POST   | `/pricing` | ✅ | Add new pricing rule. Body: `{ shop_id, color_type, paper_size, price_per_page }` |
| PATCH  | `/pricing/:id` | ✅ | Update a pricing rule |

---

## Notifications — `/api/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/notifications` | ✅ | Get all notifications for current user |
| PATCH  | `/notifications/:id/read` | ✅ | Mark single notification as read |
| PATCH  | `/notifications/read-all` | ✅ | Mark all notifications as read |

---

## Printers — `/api/printers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/printers/:shopId` | ✅ | List printers for a shop |
| POST   | `/printers` | ✅ | Register a printer. Body: `{ shop_id, name, ip_address, protocol }` |
| PATCH  | `/printers/:id/status` | ✅ | Update printer status |

---

## QR Tokens — `/api/qr`

| Method | Endpoint | Server | Description |
|--------|----------|--------|-------------|
| POST   | `/qr/generate` | Local only | Generate one-time QR token (TTL: 10 min). Returns `{ url, token }` |
| POST   | `/qr/validate` | Local only | Validate token, returns session data |
| GET    | `/qr/info` | Both | Get server network info (local IP, port) |

---

## Sync — `/api/sync`

| Method | Endpoint | Server | Description |
|--------|----------|--------|-------------|
| POST   | `/sync/ingest` | Online only | Receive outbox payloads from local server. Requires `x-sync-secret` header. Idempotent via UUID check. |
| GET    | `/sync/status` | Local only | Get outbox drain status (pending count, last sync) |

---

## Webhooks — `/api/webhooks`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/webhooks/razorpay` | Razorpay `payment.captured` webhook. Raw body required. HMAC verified. Idempotent. |

---

## Networks — `/api/networks`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/networks/shop/:shopId` | ✅ | Get Wi-Fi network config for shop |
| POST   | `/networks` | ✅ | Add network config |
| PATCH  | `/networks/:id` | ✅ | Update network config |

---

## Sessions — `/api/sessions`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/sessions/:id` | ✅ | Get session by ID |
| POST   | `/sessions` | ❌ | Create session (used by QR flow) |
| PATCH  | `/sessions/:id/end` | ✅ | End a session |

---

## Analytics — `/api/analytics`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/analytics/shop/:shopId` | ✅ | Full shop analytics: revenue, leaderboard, daily trend, payment methods |

---

## Socket Events

Clients connect via `socket.io-client`. Rooms:
- **Shopkeeper** joins `shop:{shopId}` on dashboard load
- **Customer** joins `job:{jobId}` after submitting a job

| Event | Direction | Payload |
|-------|-----------|---------|
| `job:new` | Server → Shopkeeper room | `{ job }` |
| `job:status` | Server → Job room | `{ job_id, status }` |
| `notification:new` | Server → User | `{ notification }` |
