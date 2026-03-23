const jwt = require('jsonwebtoken')
const UserQueries = require('../db/queries/user.queries')
const { ActivityLogQueries } = require('../db/queries/activityLog.queries')
const { generateUuid } = require('../utils/uuid')
const { AppError, ERRORS } = require('../constants/errors')
const { EVENT_TYPE } = require('../constants/enums')

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

const login = async ({ phone, email, device_id }) => {
  let user = null
  if (phone) user = await UserQueries.findByPhone(phone)
  else if (email) user = await UserQueries.findByEmail(email)
  
  if (!user) {
    throw new AppError(ERRORS.USER_NOT_FOUND)
  }
  
  if (device_id) {
    await UserQueries.updateDeviceId(user.user_id, device_id)
  }

  // Log login event (fire-and-forget — don't block auth on log failure)
  ActivityLogQueries.write({
    sessionId: null, userId: user.user_id, shopId: null,
    eventType: EVENT_TYPE.LOGIN,
    description: `User logged in via ${phone ? 'phone' : 'email'}`,
  }).catch(() => {})

  return { user, token: generateToken(user.user_id) }
}

const register = async ({ name, phone, email, device_id }) => {
  const userData = {
    uuid: generateUuid(),
    name,
    phone: phone || null,
    email: email || null,
    device_id: device_id || null
  }
  const user = await UserQueries.create(userData)

  // Log registration event
  ActivityLogQueries.write({
    sessionId: null, userId: user.user_id, shopId: null,
    eventType: EVENT_TYPE.LOGIN,
    description: 'New user registered',
  }).catch(() => {})

  return { user, token: generateToken(user.user_id) }
}

module.exports = { login, register }
