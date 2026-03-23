/**
 * middleware/auth.middleware.js
 * JWT verification. Attaches decoded user to req.user.
 */

const jwt    = require('jsonwebtoken')
const { AppError, ERRORS } = require('../constants/errors')
const UserQueries = require('../db/queries/user.queries')
const ShopQueries = require('../db/queries/shop.queries')

const authenticate = async (req, res, next) => {
  try {
    const syncSecret = req.headers['x-sync-secret']
    if (syncSecret && syncSecret === process.env.ONLINE_SYNC_SECRET) {
      return next()
    }

    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(ERRORS.AUTH_TOKEN_MISSING)
    }
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await UserQueries.findById(decoded.userId)
    if (!user) throw new AppError(ERRORS.AUTH_TOKEN_INVALID)
    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError(ERRORS.AUTH_TOKEN_INVALID))
    }
    next(err)
  }
}

/**
 * Optional authentication — if token exists, verify it.
 * If not, just proceed without req.user.
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return next()
    }
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await UserQueries.findById(decoded.userId)
    if (user) req.user = user
    next()
  } catch (err) {
    // If token is malformed/expired but was provided, we still proceed but without user
    next()
  }
}
/**
 * Shopkeeper-only guard. Attach after authenticate.
 * Verifies if the authenticated user's email matches the shop's email.
 */
/**
 * Shopkeeper-only guard. Attach after authenticate.
 */
const requireShopkeeper = async (req, res, next) => {
  try {
    const { shopId } = req.params
    if (!shopId) return next(new AppError(ERRORS.AUTH_FORBIDDEN))

    // Direct import of shop queries to avoid index conflicts
    const shopQueries = require('../db/queries/shop.queries')
    const shop = await shopQueries.findById(shopId)
    
    if (!shop) {
      return next(new AppError(ERRORS.AUTH_FORBIDDEN))
    }

    // Relaxed check: match either email or phone if available
    const isOwner = (req.user?.email && shop.email && req.user.email.toLowerCase() === shop.email.toLowerCase()) ||
                    (req.user?.phone && shop.contact && req.user.phone === shop.contact)

    if (!isOwner) {
      const msg = `Access Denied: Your email (${req.user?.email || 'N/A'}) does not match the shop owner email (${shop.email || 'N/A'}).`
      console.log(`[AUTH] ${msg}`)
      return next(new AppError({ ...ERRORS.AUTH_FORBIDDEN, message: process.env.NODE_ENV === 'development' ? msg : ERRORS.AUTH_FORBIDDEN.message }))
    }

    next()
  } catch (err) {
    console.error(`[AUTH] Error identifying shopkeeper: ${err.message}`)
    next(err)
  }
}

module.exports = { authenticate, optionalAuthenticate, requireShopkeeper }
