const fs = require('fs')
const path = require('path')
const cloudinaryService = require('./cloudinary.service')
const FileQueries = require('../db/queries/file.queries')
const StorageQueries = require('../db/queries/storage.queries')
const ActivityLogQueries = require('../db/queries/activityLog.queries').ActivityLogQueries
const { generateUuid } = require('../utils/uuid')
const { EVENT_TYPE } = require('../constants/enums')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')

const handleUpload = async (fileObj, metadata, user) => {
  // ── 1. Upload to Cloudinary (or fall back to local disk storage if offline) ──
  let uploadResult
  try {
    uploadResult = await cloudinaryService.upload(
      fileObj.buffer,
      fileObj.mimetype,
      fileObj.originalname
    )
  } catch (err) {
    console.warn('[file.service] Cloudinary upload failed, saving to local disk. Error:', err.message)
    
    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    }

    const fileUuid = generateUuid()
    const extension = path.extname(fileObj.originalname) || `.${fileObj.normalizedType || 'dat'}`
    const localFilename = `${fileUuid}${extension}`
    const localPath = path.join(UPLOADS_DIR, localFilename)
    
    // Write buffer to disk
    fs.writeFileSync(localPath, fileObj.buffer)

    uploadResult = {
      bytes: fileObj.size,
      public_id: `local/${fileUuid}`,
      secure_url: `/uploads/${localFilename}`, // Relative URL for local serving
      pages: 1
    }
  }

  const size = uploadResult.bytes || fileObj.size
  const type = fileObj.normalizedType || 'pdf'
  const isLocal = uploadResult.secure_url.startsWith('/uploads/') || uploadResult.secure_url === 'blob:mock-file'

  // ── 2. Create a storage record for this upload ────────────────────────────
  let storageId = null
  try {
    const expiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const storageRow = await StorageQueries.create({
      shop_id: metadata?.shop_id ? parseInt(metadata.shop_id) : null,
      storage_type: isLocal ? 'local' : 'cloudinary',
      path: uploadResult.secure_url || uploadResult.public_id,
      checksum: uploadResult.public_id || null,
      expiry_at: expiryAt,
    })
    storageId = storageRow?.storage_id ?? null
  } catch (e) {
    console.warn('[file.service] Could not create storage record:', e.message)
  }

  // ── 3. Create the file record, linking storage ────────────────────────────
  // session_id is NULL here because the session is created LATER at checkout.
  // It will be patched onto the file in the print job / session creation step.
  const fileData = {
    uuid: generateUuid(),
    storage_id: storageId,
    session_id: metadata?.session_id ? parseInt(metadata.session_id) : null,
    name: fileObj.originalname,
    type,
    size,
    pages: uploadResult.pages || 1,
    status: 'ready',
  }

  const savedFile = await FileQueries.create(fileData).catch((e) => {
    console.warn('[file.service] DB create failed, falling back to memory object:', e.message)
    return fileData
  })

  // Attach the secure URL for frontend usage immediately
  savedFile.url = uploadResult.secure_url

  // Log upload event (fire-and-forget)
  const userId = user?.user_id ?? null
  const shopId = metadata?.shop_id ? parseInt(metadata.shop_id) : null
  ActivityLogQueries.write({
    sessionId: metadata?.session_id ? parseInt(metadata.session_id) : null,
    userId,
    shopId,
    eventType: EVENT_TYPE.UPLOAD,
    description: `Uploaded file: ${fileObj.originalname} (${(size / 1024).toFixed(1)} KB)`,
  }).catch(() => {})

  return savedFile
}

const getFile = async (fileId) => {
  return FileQueries.findById(fileId)
}

const deleteFile = async (fileId) => {
  return FileQueries.updateStatus(fileId, 'deleted')
}

module.exports = { handleUpload, getFile, deleteFile }
