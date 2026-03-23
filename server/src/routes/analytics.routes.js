/**
 * analytics.routes.js
 */
const express = require('express')
const router = express.Router()
const analyticsController = require('../controllers/analytics.controller')
const { authenticate, requireShopkeeper } = require('../middleware/auth.middleware')

// Protected routes
router.use(authenticate)

router.get('/shop/:shopId', requireShopkeeper, analyticsController.getShopAnalytics)

module.exports = router
