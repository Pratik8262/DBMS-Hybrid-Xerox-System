/**
 * sync.controller.js
 * 
 * Controller for the cloud-side data ingestion endpoint.
 */

const SyncService = require('../services/sync.service')
const { sendSuccess, sendError } = require('../utils/response')

const ingest = async (req, res, next) => {
  try {
    const { entity, entity_uuid, operation, payload } = req.body
    
    // Validate request body
    if (!entity || !entity_uuid || !operation || !payload) {
      return sendError(res, 400, 'BAD_REQUEST', 'Missing required sync fields')
    }

    // Call service to perform idempotent ingestion
    const result = await SyncService.ingest({ entity, entity_uuid, operation, payload })
    
    sendSuccess(res, result, 'Data ingested successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = { ingest }
