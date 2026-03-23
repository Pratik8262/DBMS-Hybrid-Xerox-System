/**
 * outbox.worker.js
 *
 * Runs on LOCAL SERVER ONLY.
 * Polls the outbox table every 30 seconds.
 * For each pending row, POSTs the payload to the online server.
 * Marks rows synced or failed accordingly.
 * Cleans up old synced rows once per hour.
 */

const cron   = require('node-cron')
const axios  = require('axios')
const logger = require('../utils/logger')
const { OutboxQueries } = require('../db/queries')

const ONLINE_SERVER_URL   = process.env.ONLINE_SERVER_URL
const ONLINE_SYNC_SECRET  = process.env.ONLINE_SYNC_SECRET

/**
 * Check internet connectivity by hitting a reliable endpoint.
 */
const isOnline = async () => {
  try {
    await axios.get('https://1.1.1.1', { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

/**
 * Sync a single outbox row to the online server.
 */
const syncRow = async (row) => {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload

  await axios.post(
    `${ONLINE_SERVER_URL}/sync/ingest`,
    {
      entity:      row.entity,
      entity_uuid: row.entity_uuid,
      operation:   row.operation,
      payload,
    },
    {
      headers: {
        'x-sync-secret': ONLINE_SYNC_SECRET,
        'Content-Type':  'application/json',
      },
      timeout: 10000,
    }
  )
}

/**
 * Main drain function — called by cron.
 */
const drainOutbox = async () => {
  const online = await isOnline()
  if (!online) {
    logger.debug('[outbox-worker] Offline — skipping sync cycle')
    return
  }

  const pending = OutboxQueries.findPending()
  const retryable = OutboxQueries.findFailedForRetry()
  const rows = [...pending, ...retryable]

  if (rows.length === 0) {
    logger.debug('[outbox-worker] Nothing to sync')
    return
  }

  logger.info(`[outbox-worker] Syncing ${rows.length} rows`)

  for (const row of rows) {
    try {
      await syncRow(row)
      OutboxQueries.markSynced(row.outbox_id)
      logger.info(`[outbox-worker] Synced outbox_id=${row.outbox_id} entity=${row.entity} uuid=${row.entity_uuid}`)
    } catch (err) {
      OutboxQueries.markFailed(row.outbox_id)
      logger.warn(`[outbox-worker] Failed outbox_id=${row.outbox_id}: ${err.message}`)
    }
  }
}

/**
 * Register cron jobs.
 * Call this once at server startup (local mode only).
 */
const startOutboxWorker = () => {
  if (process.env.SERVER_MODE !== 'local') {
    logger.warn('[outbox-worker] Not in local mode — worker not started')
    return
  }

  // Drain every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await drainOutbox()
    } catch (err) {
      logger.error(`[outbox-worker] Unhandled error: ${err.message}`)
    }
  })

  // Cleanup synced rows once per hour
  cron.schedule('0 * * * *', () => {
    try {
      OutboxQueries.cleanupSynced()
      logger.info('[outbox-worker] Cleaned up old synced rows')
    } catch (err) {
      logger.error(`[outbox-worker] Cleanup error: ${err.message}`)
    }
  })

  logger.info('[outbox-worker] Started — polling every 30s')
}

module.exports = { startOutboxWorker, drainOutbox }
