const { sendSuccess } = require('../utils/response')

const dummy = (req, res) => {
  sendSuccess(res, {}, 'Stub for notification')
}

module.exports = { dummy }
