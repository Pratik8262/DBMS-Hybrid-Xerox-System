const jwt = require('jsonwebtoken')
const SessionQueries = require('../db/queries/session.queries')
const { sendSuccess, sendCreated } = require('../utils/response')

const createSession = async (req, res, next) => {
  try {
    const { user_id, shop_id, network_id, is_local, qr_token } = req.body
    
    // Generate UUID if not provided by client
    const uuid = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID()

    // Safely extract user_id from optional JWT header if not provided in body or local req object
    let authUserId = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        authUserId = decoded.userId
      } catch (e) {
        // Soft fail if token is invalid or expired
        console.warn('Optional auth parse failed', e.message)
      }
    }

    const sessionData = {
      uuid,
      user_id: user_id || (req.user ? req.user.user_id : authUserId),
      shop_id,
      network_id: network_id || null,
      is_local: is_local || false,
      qr_token: qr_token || null
    }

    const newSession = await SessionQueries.create(sessionData)
    sendCreated(res, newSession, 'Session established')
  } catch (error) {
    next(error)
  }
}

const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const sessions = await SessionQueries.findActiveByUser(userId)
    sendSuccess(res, sessions)
  } catch (error) {
    next(error)
  }
}

const endSession = async (req, res, next) => {
  try {
    const updated = await SessionQueries.end(req.params.id)
    sendSuccess(res, updated, 'Session ended')
  } catch (error) {
    next(error)
  }
}

module.exports = { createSession, getActiveSessions, endSession }
