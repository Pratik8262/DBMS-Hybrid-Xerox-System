/**
 * Central re-export of all query modules.
 * Import from here — never import individual query files directly in controllers.
 *
 * Usage:
 *   const { UserQueries, JobQueries } = require('../db/queries')
 */

const UserQueries         = require('./user.queries')
const SessionQueries      = require('./session.queries')
const ShopQueries         = require('./shop.queries')
const FileQueries         = require('./file.queries')
const PrinterQueries      = require('./printer.queries')
const PrintJobQueries     = require('./printJob.queries')
const PrintSettingQueries = require('./printSettings.queries')
const PaymentQueries      = require('./payment.queries')
const PricingQueries      = require('./pricing.queries')
const NotificationQueries = require('./notification.queries')
const ActivityLogQueries  = require('./activityLog.queries')
const OutboxQueries       = require('./outbox.queries')
const QrTokenQueries      = require('./qrToken.queries')
const AnalyticsQueries    = require('./analytics.queries')

module.exports = {
  UserQueries,
  SessionQueries,
  ShopQueries,
  FileQueries,
  PrinterQueries,
  PrintJobQueries,
  PrintSettingQueries,
  PaymentQueries,
  PricingQueries,
  NotificationQueries,
  ActivityLogQueries,
  OutboxQueries,
  QrTokenQueries,
  AnalyticsQueries,
}
