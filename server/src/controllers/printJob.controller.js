const jwt = require('jsonwebtoken')
const PrintJobQueries = require('../db/queries/printJob.queries')
const PricingQueries = require('../db/queries/pricing.queries')
const PrintSettingQueries = require('../db/queries/printSettings.queries')
const FileQueries = require('../db/queries/file.queries')
const StorageQueries = require('../db/queries/storage.queries')
const SessionQueries = require('../db/queries/session.queries')
const { ActivityLogQueries } = require('../db/queries/activityLog.queries')
const { NotificationService } = require('../services/notification.service')
const { sendSuccess, sendCreated, sendNotFound, sendError } = require('../utils/response')
const { generateUuid } = require('../utils/uuid')
const { EVENT_TYPE, NOTIFICATION_TYPE } = require('../constants/enums')

const createJob = async (req, res, next) => {
  try {
    const jobData = req.body
    const result = await processSingleJob(jobData, req.headers.authorization)
    sendCreated(res, result, 'Job created')
  } catch (error) { next(error) }
}

const createBatchJobs = async (req, res, next) => {
  try {
    const { jobs } = req.body
    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({ success: false, message: 'jobs array is required' })
    }

    // Generate a random 32-bit integer since payment_group_id is an INTEGER in the DB
    const groupId = Math.floor(Math.random() * 2147483647)
    const results = []
    let totalCost = 0

    for (const jobData of jobs) {
      const result = await processSingleJob({ ...jobData, payment_group_id: groupId }, req.headers.authorization)
      results.push(result)
      totalCost += result.cost
    }

    sendCreated(res, { jobs: results, total_cost: totalCost, payment_group_id: groupId }, 'Batch jobs created')
  } catch (error) { next(error) }
}

// Helper to avoid duplication
const processSingleJob = async (data, authHeader) => {
  const {
    file_id, printer_id, session_id, shop_id, origin, priority,
    payment_group_id = null,
    filesCount = 1,
    user_id: bodyUserId = null,
    color_mode = 'bw',
    paper_size = 'A4',
    orientation = 'portrait',
    scaling = 'fit',
    sides = 'simplex',
    copies = 1,
  } = data

  let user_id = bodyUserId
  if (!user_id && authHeader) {
    try {
      if (authHeader.startsWith('Bearer ')) {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
        user_id = decoded.userId || null
      }
    } catch (e) { /* soft fail */ }
  }

  let resolvedSettingsId = null
  try {
    const settingsRow = await PrintSettingQueries.findOrCreate({
      color_mode, orientation, scaling, sides, paper_size, copies,
      user_id: user_id || null,
    })
    resolvedSettingsId = settingsRow?.settings_id ?? null
  } catch (e) {
    console.warn('[printJob] Could not resolve settings_id, will store NULL:', e.message)
  }

  let calculatedCost = 0
  let matchedPricingId = null
  try {
    const match = await PricingQueries.findMatchingRule(shop_id, color_mode, paper_size, 'none')
    if (match) {
      matchedPricingId = match.pricing_id
      calculatedCost = parseFloat(match.price_per_page) * filesCount * copies
      calculatedCost = calculatedCost + (calculatedCost * 0.18)
    } else {
      const fallbackPrice = color_mode === 'color' ? 10 : 2
      calculatedCost = fallbackPrice * filesCount * copies
      calculatedCost = calculatedCost + (calculatedCost * 0.18)
    }
  } catch (e) {
    console.error('Pricing calc error', e)
    calculatedCost = 10.50
  }

  const jobFields = {
    uuid: generateUuid(),
    file_id,
    printer_id,
    settings_id: resolvedSettingsId,
    session_id,
    shop_id,
    origin: origin || 'online',
    priority: priority || 5,
  }

  const newJob = await PrintJobQueries.create(jobFields)
  await PrintJobQueries.updateCost(newJob.job_id, calculatedCost)

  if (matchedPricingId) {
    try {
      await PricingQueries.attachToJob(newJob.job_id, matchedPricingId, calculatedCost)
    } catch (e) {
      console.warn('[printJob] Could not record print_job_pricing entry:', e.message)
    }
  }

  if (session_id && file_id) {
    try {
      const fileRow = await FileQueries.updateSession(file_id, session_id)
      if (fileRow?.storage_id && shop_id) {
        await StorageQueries.updateShopId(fileRow.storage_id, shop_id)
      }
    } catch (e) {
      console.warn('[printJob] Could not patch IDs onto file/storage:', e.message)
    }
  }

  const finalJob = { ...newJob, cost: calculatedCost, payment_group_id }

  // Notify shopkeeper + log activity (fire-and-forget)
  if (shop_id) {
    NotificationService.notifyShopkeeper(
      shop_id, finalJob.job_id, NOTIFICATION_TYPE.NEW_JOB,
      `New print job #${finalJob.job_id} received.`
    ).catch(() => {})
  }
  ActivityLogQueries.write({
    sessionId: session_id ?? null,
    userId: user_id ?? null,
    shopId: shop_id ?? null,
    eventType: EVENT_TYPE.PRINT,
    description: `Print job #${finalJob.job_id} created (cost ₹${calculatedCost.toFixed(2)})`,
  }).catch(() => {})

  return finalJob
}

const getJob = async (req, res, next) => {
  try {
    const job = await PrintJobQueries.findById(req.params.id)
    if (!job) return sendNotFound(res, 'Job not found')
    sendSuccess(res, job)
  } catch (error) { next(error) }
}

const getSessionJobs = async (req, res, next) => {
  try {
    const jobs = await PrintJobQueries.findBySession(req.params.sessionId)
    sendSuccess(res, jobs)
  } catch (error) { next(error) }
}

const getUserJobs = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.user_id : null;
    if (!userId) return sendError(res, 401, 'Unauthorized', 'User ID not found');
    const jobs = await PrintJobQueries.findByUser(userId)
    sendSuccess(res, jobs)
  } catch (error) { next(error) }
}

const getShopJobs = async (req, res, next) => {
  try {
    const jobs = await PrintJobQueries.findByShop(req.params.shopId, req.query)
    sendSuccess(res, jobs)
  } catch (error) { next(error) }
}

const cancelJob = async (req, res, next) => {
  try {
    const job = await PrintJobQueries.cancel(req.params.id)
    sendSuccess(res, job, 'Job cancelled successfully')
  } catch (error) { next(error) }
}

const updateStatus = async (req, res, next) => {
  try {
    const job = await PrintJobQueries.updateStatus(req.params.id, req.body.status)
    sendSuccess(res, job, 'Job status updated')
    // Notify customer when job is done (fire-and-forget)
    if (req.body.status === 'done' && job) {
      // print_jobs has no user_id — look it up from the session
      const resolveUserId = async () => {
        if (job.session_id) {
          const session = await SessionQueries.findById(job.session_id)
          return session?.user_id ?? null
        }
        return null
      }
      resolveUserId().then(userId => {
        NotificationService.notifyCustomer(
          userId, job.job_id, NOTIFICATION_TYPE.JOB_COMPLETE,
          `Your print job #${job.job_id} is ready for pickup!`
        ).catch(() => {})
        ActivityLogQueries.write({
          sessionId: job.session_id ?? null,
          userId,
          shopId: job.shop_id ?? null,
          eventType: EVENT_TYPE.PRINT,
          description: `Print job #${job.job_id} marked as done`,
        }).catch(() => {})
      }).catch(() => {})
    }
  } catch (error) { next(error) }
}

module.exports = { createJob, createBatchJobs, getJob, getSessionJobs, getUserJobs, getShopJobs, cancelJob, updateStatus }
