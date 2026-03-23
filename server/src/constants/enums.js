/**
 * constants/enums.js
 * Mirror of all DB ENUM values. Use these everywhere — never hardcode strings.
 */

const JOB_STATUS = Object.freeze({
  QUEUED:    'queued',
  PRINTING:  'printing',
  DONE:      'done',
  FAILED:    'failed',
  CANCELLED: 'cancelled',
})

const PAYMENT_STATUS = Object.freeze({
  PENDING:  'pending',
  SUCCESS:  'success',
  FAILED:   'failed',
  REFUNDED: 'refunded',
})

const PAYMENT_METHOD = Object.freeze({
  CASH:       'cash',
  UPI:        'upi',
  CARD:       'card',
  WALLET:     'wallet',
  NETBANKING: 'netbanking',
})

const FILE_STATUS = Object.freeze({
  PENDING: 'pending',
  READY:   'ready',
  EXPIRED: 'expired',
  DELETED: 'deleted',
})

const FILE_TYPE = Object.freeze({
  PDF:  'pdf',
  DOCX: 'docx',
  JPG:  'jpg',
  PNG:  'png',
  TXT:  'txt',
})

const COLOR_MODE = Object.freeze({
  BW:        'bw',
  COLOR:     'color',
  GRAYSCALE: 'grayscale',
})

const PAPER_SIZE = Object.freeze({
  A4:     'A4',
  A3:     'A3',
  LETTER: 'Letter',
  LEGAL:  'Legal',
})

const SIDES = Object.freeze({
  SIMPLEX:      'simplex',
  DUPLEX_LONG:  'duplex_long',
  DUPLEX_SHORT: 'duplex_short',
})

const SHOP_STATUS = Object.freeze({
  ACTIVE:    'active',
  INACTIVE:  'inactive',
  SUSPENDED: 'suspended',
})

const PRINTER_STATUS = Object.freeze({
  ONLINE:  'online',
  OFFLINE: 'offline',
  ERROR:   'error',
  BUSY:    'busy',
})

const PRINTER_PROTOCOL = Object.freeze({
  IPP:     'ipp',
  CUPS:    'cups',
  RAW_TCP: 'raw_tcp',
})

const NOTIFICATION_TYPE = Object.freeze({
  JOB_COMPLETE: 'job_complete',
  PAYMENT:      'payment',
  ALERT:        'alert',
  INFO:         'info',
  NEW_JOB:      'new_job',
})

const NOTIFICATION_TARGET = Object.freeze({
  CUSTOMER:    'customer',
  SHOPKEEPER:  'shopkeeper',
})

const EVENT_TYPE = Object.freeze({
  UPLOAD:   'upload',
  PRINT:    'print',
  PAYMENT:  'payment',
  LOGIN:    'login',
  LOGOUT:   'logout',
  ERROR:    'error',
  QR_SCAN:  'qr_scan',
})

const JOB_ORIGIN = Object.freeze({
  ONLINE:  'online',
  OFFLINE: 'offline',
})

const STORAGE_TYPE = Object.freeze({
  LOCAL:      'local',
  CLOUDINARY: 'cloudinary',
  S3:         's3',
  GCS:        'gcs',
  AZURE:      'azure',
})

const OUTBOX_OPERATION = Object.freeze({
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
})

const SERVER_MODE = Object.freeze({
  ONLINE: 'online',
  LOCAL:  'local',
})

module.exports = {
  JOB_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  FILE_STATUS,
  FILE_TYPE,
  COLOR_MODE,
  PAPER_SIZE,
  SIDES,
  SHOP_STATUS,
  PRINTER_STATUS,
  PRINTER_PROTOCOL,
  NOTIFICATION_TYPE,
  NOTIFICATION_TARGET,
  EVENT_TYPE,
  JOB_ORIGIN,
  STORAGE_TYPE,
  OUTBOX_OPERATION,
  SERVER_MODE,
}
