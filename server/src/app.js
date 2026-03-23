/**
 * app.js
 * Express application setup.
 * No listen() here — that lives in server.js / local.js.
 */

const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')
const logger     = require('./utils/logger')
const { errorMiddleware } = require('./middleware/error.middleware')

// Routes
const authRoutes         = require('./routes/auth.routes')
const userRoutes         = require('./routes/user.routes')
const shopRoutes         = require('./routes/shop.routes')
const fileRoutes         = require('./routes/file.routes')
const printJobRoutes     = require('./routes/printJob.routes')
const paymentRoutes      = require('./routes/payment.routes')
const pricingRoutes      = require('./routes/pricing.routes')
const notificationRoutes = require('./routes/notification.routes')
const printerRoutes      = require('./routes/printer.routes')
const qrRoutes           = require('./routes/qr.routes')
const webhookRoutes      = require('./routes/webhook.routes')
const sessionRoutes      = require('./routes/session.routes')
const networkRoutes      = require('./routes/network.routes')
const syncRoutes         = require('./routes/sync.routes')
const analyticsRoutes    = require('./routes/analytics.routes')

const app = express()

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in development or if CLIENT_URL is not set
    if (!origin || !process.env.CLIENT_URL || process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }
    callback(null, origin === process.env.CLIENT_URL)
  },
  credentials: true,
}))

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 2000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
// Webhook route needs raw body for HMAC verification — mount BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const path = require('path')

// ── Offline QR Token Intercept & Local UI ──────────────────────────────────────
app.get('/', async (req, res, next) => {
  const token = req.query.token
  if (token) {
    try {
      const { generateUuid } = require('./utils/uuid')
      const QrQueries = require('./db/queries/qr.queries')
      const SessionQueries = require('./db/queries/session.queries')

      const validToken = await QrQueries.consumeToken(token)
      if (validToken) {
        const NetworkQueries = require('./db/queries/network.queries')
        const primaryNetwork = await NetworkQueries.findPrimaryByShop(validToken.shop_id)

        const isLocal = process.env.SERVER_MODE === 'local' ? 1 : true
        const session = await SessionQueries.create({
          uuid: generateUuid(),
          user_id: null,
          shop_id: validToken.shop_id,
          network_id: primaryNetwork ? primaryNetwork.network_id : null,
          is_local: isLocal,
          qr_token: token
        })
        
        // Expose cookie to frontend JS so it can attach x-session-id to API calls
        res.cookie('sessionId', session.session_id, { path: '/', maxAge: 86400000 })
        return res.redirect('/')
      } else {
        return res.status(403).send('Invalid or expired QR token.')
      }
    } catch (e) {
      logger.error('QR intercept error:', e)
      return res.status(500).send('Internal Server Error')
    }
  }
  next()
})

// Serve the standalone offline frontend
app.use(express.static(path.join(__dirname, '../../apps/local-ui')))

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      mode:   process.env.SERVER_MODE,
      uptime: process.uptime(),
    },
  })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/shops',         shopRoutes)
app.use('/api/files',         fileRoutes)
app.use('/api/jobs',          printJobRoutes)
app.use('/api/payments',      paymentRoutes)
app.use('/api/pricing',       pricingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/printers',      printerRoutes)
app.use('/api/qr',            qrRoutes)
app.use('/api/webhooks',      webhookRoutes)
app.use('/api/sessions',      sessionRoutes)
app.use('/api/networks',      networkRoutes)
app.use('/api/sync',          syncRoutes)
app.use('/api/analytics',     analyticsRoutes)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorMiddleware)

module.exports = app
