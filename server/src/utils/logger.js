/**
 * utils/logger.js
 * Winston logger. Never use console.log in this codebase.
 *
 * Levels used:
 *   error  — unhandled exceptions, payment failures, sync hard failures
 *   warn   — retryable failures, unexpected but non-fatal states
 *   info   — every route hit, every payment event, every job state change
 *   debug  — DB queries, outbox polling, heartbeats (silenced in production)
 */

const { createLogger, format, transports } = require('winston')
const path = require('path')

const { combine, timestamp, printf, colorize, errors } = format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `${timestamp} [${level}] ${message}\n${stack}`
      : `${timestamp} [${level}] ${message}`
  })
)

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
)

const isDev = process.env.NODE_ENV !== 'production'

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
    ...(isDev ? [] : [
      new transports.File({
        filename: path.join(__dirname, '../../../logs/error.log'),
        level: 'error',
      }),
      new transports.File({
        filename: path.join(__dirname, '../../../logs/combined.log'),
      }),
    ]),
  ],
})

module.exports = logger
