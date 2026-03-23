const express = require('express')
const router = express.Router()
const fileController = require('../controllers/file.controller')
const { optionalAuthenticate } = require('../middleware/auth.middleware')
const { upload } = require('../middleware/upload.middleware')

router.post('/upload', optionalAuthenticate, upload.single('document'), fileController.uploadFile)
router.get('/:id', fileController.getFile)
router.delete('/:id', fileController.deleteFile)

module.exports = router
