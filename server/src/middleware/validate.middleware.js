/**
 * middleware/validate.middleware.js
 * Zod schema validation. Pass a Zod schema, it validates req.body.
 * On failure, throws AppError with VALIDATION_ERROR and field details.
 */

const { AppError, ERRORS } = require('../constants/errors')

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  })

  if (!result.success) {
    const errorsList = result.error.issues || result.error.errors || []
    const details = errorsList.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return next(new AppError(ERRORS.VALIDATION_ERROR, JSON.stringify(details)))
  }
  
  if (result.data.body) req.body = result.data.body
  if (result.data.query) req.query = result.data.query
  if (result.data.params) req.params = result.data.params
  
  next()
}

module.exports = { validate }
