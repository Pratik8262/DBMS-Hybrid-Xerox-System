const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const { validate } = require('../middleware/validate.middleware')
const { loginSchema, registerSchema } = require('../validators/auth.validator')
const { authLimiter } = require('../middleware/rateLimit.middleware')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/register', authLimiter, validate(registerSchema), authController.register)
router.post('/login',    authLimiter, validate(loginSchema),    authController.login)
router.get('/me',        authenticate, authController.getMe)

module.exports = router

