const express = require('express')
const router = express.Router()
const controller = require('../controllers/notification.controller')

router.use(controller.dummy)

module.exports = router
