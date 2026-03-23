const { sendSuccess } = require('../utils/response')

const dummy = (req, res) => {
  sendSuccess(res, {}, 'Stub for printer')
}

module.exports = { dummy }
