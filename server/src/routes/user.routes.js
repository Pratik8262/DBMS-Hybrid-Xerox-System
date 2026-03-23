const express = require('express')
const router = express.Router()
const userController = require('../controllers/user.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { updateUserSchema } = require('../validators/user.validator')

router.use(authenticate)
router.get('/:id', userController.getUser)
router.get('/stats/:id', userController.getUserStats)
router.patch('/:id', validate(updateUserSchema), userController.updateUser)

module.exports = router
