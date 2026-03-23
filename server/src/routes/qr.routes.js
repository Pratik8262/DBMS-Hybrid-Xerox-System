const express = require('express')
const router = express.Router()
const controller = require('../controllers/qr.controller')

const { authenticate } = require('../middleware/auth.middleware')

router.get('/info', controller.getNetworkInfo)
router.post('/generate', authenticate, controller.generate)
router.post('/consume', controller.consume)

module.exports = router
