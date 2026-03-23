const authService = require('../services/auth.service')
const { sendSuccess, sendCreated, sendError } = require('../utils/response')

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body)
    sendSuccess(res, data, 'Login successful')
  } catch (error) {
    next(error)
  }
}

const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body)
    sendCreated(res, data, 'Registration successful')
  } catch (error) {
    next(error)
  }
}

const getMe = async (req, res, next) => {
  try {
    sendSuccess(res, { user: req.user }, 'Profile fetched')
  } catch (error) {
    next(error)
  }
}

module.exports = { login, register, getMe }
