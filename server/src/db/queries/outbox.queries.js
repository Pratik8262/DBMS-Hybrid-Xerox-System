/**
 * outbox.queries.js
 * All DB operations for the `outbox` table.
 *
 * The outbox is SQLite-only — it lives on the local server.
 * The sync worker reads from here and drains to Supabase.
 * Online server does NOT have an outbox table.
 */

const db = require('../index')

const OutboxQueries = {

  /**
   * Get all rows not yet synced to Supabase.
   * Ordered by created_at so events replay in original order.
   * Caps at 50 rows per poll cycle to avoid overloading the network.
   */
  findPending: () => {
    return db.prepare(`
      SELECT * FROM outbox
      WHERE synced_at IS NULL
      ORDER BY created_at ASC
      LIMIT 50
    `).all()
  },

  /**
   * Get rows that failed previously and are eligible for retry.
   * Retries are attempted after a backoff: retry_count * 60 seconds.
   */
  findFailedForRetry: () => {
    return db.prepare(`
      SELECT * FROM outbox
      WHERE synced_at IS NULL
        AND failed_at IS NOT NULL
        AND retry_count < 5
        AND failed_at <= datetime('now', '-' || (retry_count * 60) || ' seconds')
      ORDER BY created_at ASC
      LIMIT 20
    `).all()
  },

  /**
   * Write a new outbox entry.
   * ALWAYS call this inside the same transaction as the entity write.
   *
   * @param {Object} entry - { entity, entity_uuid, operation, payload }
   */
  write: (entry) => {
    const stmt = db.prepare(`
      INSERT INTO outbox (entity, entity_uuid, operation, payload)
      VALUES (@entity, @entity_uuid, @operation, @payload)
    `)
    return stmt.run({
      operation: 'insert',
      ...entry,
      payload: typeof entry.payload === 'string'
        ? entry.payload
        : JSON.stringify(entry.payload),
    })
  },

  /**
   * Mark a row as successfully synced.
   */
  markSynced: (outboxId) => {
    return db.prepare(`
      UPDATE outbox SET synced_at = datetime('now') WHERE outbox_id = ?
    `).run(outboxId)
  },

  /**
   * Mark a row as failed and increment retry counter.
   */
  markFailed: (outboxId) => {
    return db.prepare(`
      UPDATE outbox
      SET failed_at = datetime('now'), retry_count = retry_count + 1
      WHERE outbox_id = ?
    `).run(outboxId)
  },

  /**
   * Hard-delete synced rows older than 7 days.
   * Called by outbox worker after each drain cycle.
   */
  cleanupSynced: () => {
    return db.prepare(`
      DELETE FROM outbox
      WHERE synced_at IS NOT NULL
        AND synced_at <= datetime('now', '-7 days')
    `).run()
  },

  /**
   * Get a count of pending rows — used for health/status endpoint.
   */
  countPending: () => {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM outbox WHERE synced_at IS NULL
    `).get()
    return row.count
  },

}

module.exports = OutboxQueries
