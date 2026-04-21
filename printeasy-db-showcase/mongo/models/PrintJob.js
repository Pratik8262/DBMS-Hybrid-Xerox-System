'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PrintSettingsSubSchema = new Schema({
  colorMode:   { type: String, enum: ['bw','color','grayscale'], default: 'bw' },
  orientation: { type: String, enum: ['portrait','landscape'],   default: 'portrait' },
  scaling:     { type: String, enum: ['fit','fill','actual','custom'], default: 'fit' },
  sides:       { type: String, enum: ['simplex','duplex_long','duplex_short'], default: 'simplex' },
  paperSize:   { type: String, enum: ['A4','A3','Letter','Legal'], default: 'A4' },
  copies:      { type: Number, min: 1, max: 999, default: 1 }
}, { _id: false });

const PrintJobSchema = new Schema({
  uuid:          { type: String, required: true, unique: true, index: true },
  fileId:        { type: Schema.Types.ObjectId, ref: 'File',    required: true },
  sessionId:     { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  shopId:        { type: Schema.Types.ObjectId, ref: 'Shop',    required: true },
  printerId:     { type: String, default: null },
  settings:      { type: PrintSettingsSubSchema, default: () => ({}) },
  origin:        { type: String, enum: ['online','offline'], default: 'online' },
  status:        { type: String, enum: ['queued','printing','done','failed','cancelled'], default: 'queued', index: true },
  queuePosition: { type: Number, default: null },
  priority:      { type: Number, min: 1, max: 10, default: 5 },
  cost:          { type: Number, min: 0, default: null },
  retryCount:    { type: Number, default: 0 },
  errorCode:     { type: String, default: null },
  printedAt:     { type: Date, default: null },
  createdAt:     { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  timestamps: { updatedAt: 'updatedAt' }
});

PrintJobSchema.index({ shopId: 1, status: 1, createdAt: -1 });
PrintJobSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('PrintJob', PrintJobSchema);
