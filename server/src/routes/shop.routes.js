const express = require('express')
const router = express.Router()
const shopController = require('../controllers/shop.controller')
const { authenticate, requireShopkeeper } = require('../middleware/auth.middleware')

// Public routes
router.get('/', shopController.getShops)

// Protected /mine must come BEFORE the /:id wildcard to avoid being caught as id='mine'
router.get('/mine', authenticate, shopController.getMyShop)

router.get('/:id', shopController.getShopById)

// Protected routes
router.use(authenticate)
router.post('/', shopController.createShop)
router.patch('/:id', shopController.updateShop)
router.patch('/:id/status', shopController.updateShopStatus)

module.exports = router
