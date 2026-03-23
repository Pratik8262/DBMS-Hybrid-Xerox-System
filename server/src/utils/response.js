/**
 * utils/response.js
 * Standardised API response shape.
 * Every controller uses these — never res.json() directly.
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const body = { success: true, data, message }
  if (meta) body.meta = meta
  return res.status(statusCode).json(body)
}

const sendCreated = (res, data, message = 'Created') => {
  return sendSuccess(res, data, message, 201)
}

const sendError = (res, message, statusCode = 400, code = 'BAD_REQUEST', details = null) => {
  const body = { success: false, error: { code, message } }
  if (details) body.error.details = details
  return res.status(statusCode).json(body)
}

const sendNotFound = (res, entity = 'Resource') => {
  return sendError(res, `${entity} not found`, 404, 'NOT_FOUND')
}

const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, message, 401, 'UNAUTHORIZED')
}

const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, message, 403, 'FORBIDDEN')
}

const sendServerError = (res, message = 'Internal server error') => {
  return sendError(res, message, 500, 'SERVER_ERROR')
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
}
