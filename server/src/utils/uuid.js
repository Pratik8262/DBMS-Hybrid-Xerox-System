/**
 * utils/uuid.js
 * UUID v4 generation. Single source of truth for all UUID usage.
 * Wraps the native crypto module — no external dependency needed in Node 19+.
 */

const { randomUUID } = require('crypto')

const generateUuid = () => randomUUID()

module.exports = { generateUuid }
