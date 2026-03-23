const express = require('express')
const router = express.Router()
const networkController = require('../controllers/network.controller')

router.post('/', networkController.createNetwork)
router.get('/shop/:shopId', networkController.getShopNetworks)
router.patch('/:id', networkController.updateNetwork)
router.delete('/:id', networkController.deleteNetwork)

module.exports = router
