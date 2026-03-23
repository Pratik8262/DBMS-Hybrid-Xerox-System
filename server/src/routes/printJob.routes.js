const express = require('express')
const router = express.Router()
const printJobController = require('../controllers/printJob.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { createJobSchema, updateJobStatusSchema, cancelJobSchema } = require('../validators/printJob.validator')

router.post('/',               validate(createJobSchema), printJobController.createJob)
router.post('/batch',          printJobController.createBatchJobs)
router.get('/user/me',         authenticate, printJobController.getUserJobs)
router.get('/session/:sessionId', printJobController.getSessionJobs)
router.get('/shop/:shopId',    printJobController.getShopJobs)
router.get('/:id',             printJobController.getJob)
router.patch('/:id/cancel',    validate(cancelJobSchema), printJobController.cancelJob)
router.patch('/:id/status',    validate(updateJobStatusSchema), printJobController.updateStatus)

module.exports = router
