const fileService = require('../services/file.service')
const { sendSuccess, sendCreated, sendError, sendNotFound } = require('../utils/response')

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file provided')
    // req.body could have sessionId, etc
    const result = await fileService.handleUpload(req.file, req.body, req.user)
    sendCreated(res, result, 'File uploaded successfully')
  } catch (error) { next(error) }
}

const getFile = async (req, res, next) => {
  try {
    const file = await fileService.getFile(req.params.id)
    if (!file) return sendNotFound(res, 'File not found')
    sendSuccess(res, file)
  } catch (error) { next(error) }
}

const deleteFile = async (req, res, next) => {
  try {
    await fileService.deleteFile(req.params.id)
    sendSuccess(res, null, 'File deleted logically')
  } catch (error) { next(error) }
}

module.exports = { uploadFile, getFile, deleteFile }
