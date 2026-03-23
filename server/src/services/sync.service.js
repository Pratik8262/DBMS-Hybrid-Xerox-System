/**
 * sync.service.js
 * 
 * Handles incoming data payloads from local servers.
 * Implements idempotent ingestion logic to ensure data consistency.
 */

const UserQueries = require('../db/queries/user.queries')
const SessionQueries = require('../db/queries/session.queries')
const FileQueries = require('../db/queries/file.queries')
const PrintJobQueries = require('../db/queries/printJob.queries')
const PaymentQueries = require('../db/queries/payment.queries')
const ShopQueries = require('../db/queries/shop.queries')
const logger = require('../utils/logger')

const SyncService = {
  /**
   * Ingest a payload from the local server.
   * 
   * @param {Object} data - { entity, entity_uuid, operation, payload }
   */
  ingest: async (data) => {
    const { entity, entity_uuid, operation, payload } = data
    logger.info(`[sync-service] Ingesting ${operation} for ${entity}:${entity_uuid}`)

    switch (entity) {
      case 'user':
        return await handleUser(entity_uuid, operation, payload)
      case 'session':
        return await handleSession(entity_uuid, operation, payload)
      case 'file':
        return await handleFile(entity_uuid, operation, payload)
      case 'print_job':
        return await handlePrintJob(entity_uuid, operation, payload)
      case 'payment':
        return await handlePayment(entity_uuid, operation, payload)
      case 'shop':
        return await handleShop(entity_uuid, operation, payload)
      default:
        logger.warn(`[sync-service] Unknown entity: ${entity}`)
        return { success: false, message: 'Unknown entity' }
    }
  }
}

/**
 * Idempotent User Handlers
 */
async function handleUser(uuid, op, payload) {
  const existing = await UserQueries.findByUuid(uuid)
  if (op === 'insert') {
    if (existing) return existing
    return await UserQueries.create(payload)
  }
  if (op === 'update') {
    if (!existing) return await UserQueries.create({ ...payload, uuid })
    return await UserQueries.update(existing.user_id, payload)
  }
}

async function handleSession(uuid, op, payload) {
  const existing = await SessionQueries.findByUuid(uuid)
  if (op === 'insert') {
    if (existing) return existing
    return await SessionQueries.create(payload)
  }
}

async function handleFile(uuid, op, payload) {
  const existing = await FileQueries.findByUuid(uuid)
  if (op === 'insert') {
    if (existing) return existing
    return await FileQueries.create(payload)
  }
}

async function handlePrintJob(uuid, op, payload) {
  const existing = await PrintJobQueries.findByUuid(uuid)
  if (op === 'insert') {
    if (existing) return existing
    return await PrintJobQueries.create(payload)
  }
  if (op === 'update') {
    if (!existing) return await PrintJobQueries.create({ ...payload, uuid })
    // Extract status and other fields from payload
    const { status, cost, ...extra } = payload
    if (status) await PrintJobQueries.updateStatus(existing.job_id, status, extra)
    if (cost) await PrintJobQueries.updateCost(existing.job_id, cost)
    return await PrintJobQueries.findById(existing.job_id)
  }
}

async function handlePayment(uuid, op, payload) {
  const existing = await PaymentQueries.findByUuid(uuid)
  if (op === 'insert') {
    if (existing) return existing
    return await PaymentQueries.create(payload)
  }
}

async function handleShop(uuid, op, payload) {
  const existing = await ShopQueries.findByUuid(uuid)
  if (!existing) {
    logger.warn(`[sync-service] Shop not found for sync: ${uuid}`)
    return { success: false, message: 'Shop not found' }
  }

  if (op === 'update') {
    const { local_ip, ...rest } = payload
    if (local_ip) {
      await ShopQueries.updateLocalIp(existing.shop_id, local_ip)
    }
    if (Object.keys(rest).length > 0) {
      // Handle other shop address/profile updates if needed
      await ShopQueries.update(existing.shop_id, {}, rest)
    }
    return await ShopQueries.findById(existing.shop_id)
  }
}

module.exports = SyncService
