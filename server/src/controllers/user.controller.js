const UserQueries = require('../db/queries/user.queries')
const { sendSuccess, sendNotFound } = require('../utils/response')

const getUser = async (req, res, next) => {
  try {
    const user = await UserQueries.findById(req.params.id)
    if (!user) return sendNotFound(res, 'User not found')
    sendSuccess(res, user)
  } catch (error) { next(error) }
}

const updateUser = async (req, res, next) => {
  try {
    const user = await UserQueries.update(req.params.id, req.body)
    sendSuccess(res, user, 'User updated successfully')
  } catch (error) { next(error) }
}

const getUserStats = async (req, res, next) => {
  try {
    const stats = await UserQueries.getStats(req.params.id)
    sendSuccess(res, stats)
  } catch (error) { next(error) }
}

module.exports = { getUser, updateUser, getUserStats }
