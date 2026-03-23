const express = require('express')
const router = express.Router()
const controller = require('../controllers/pricing.controller')

router.get('/shop/:shopId', controller.getShopPricing)
router.post('/', controller.addPricing)
router.patch('/:id', controller.updatePricing)

module.exports = router
