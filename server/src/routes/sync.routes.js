/**
 * sync.routes.js
 * 
 * Routes for the cloud-side data ingestion.
 */

const express = require('express')
const router = express.Router()
const syncController = require('../controllers/sync.controller')
const { sendError } = require('../utils/response')

/**
 * Middleware to verify the x-sync-secret header.
 */
const verifySyncSecret = (req, res, next) => {
  const secret = req.headers['x-sync-secret']
  if (!secret || secret !== process.env.ONLINE_SYNC_SECRET) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or missing sync secret')
  }
  next()
}

// Ingest payload from local server
router.post('/ingest', verifySyncSecret, syncController.ingest)

module.exports = router
