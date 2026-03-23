const express = require('express')
const router = express.Router()
const controller = require('../controllers/session.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/', controller.createSession)

// End a session — no auth required so the customer checkout flow can close it
router.patch('/:id/end', controller.endSession)

// Require auth for reading active sessions
router.use(authenticate)

router.get('/active', controller.getActiveSessions)

module.exports = router
