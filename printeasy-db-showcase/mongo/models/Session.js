'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const SessionSchema = new Schema({
  uuid:      { type: String, required: true, unique: true, index: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  shopId:    { type: Schema.Types.ObjectId, ref: 'Shop', default: null },
  isLocal:   { type: Boolean, default: false },
  qrToken:   { type: String, unique: true, sparse: true },
  qrUsedAt:  { type: Date, default: null },
  startedAt: { type: Date, default: Date.now },
  endedAt:   { type: Date, default: null }
}, {
  versionKey: false,
  toJSON: { virtuals: true }
});

SessionSchema.index({ userId: 1, startedAt: -1 });
SessionSchema.index({ shopId: 1, startedAt: -1 });
SessionSchema.index({ endedAt: 1 });

module.exports = mongoose.model('Session', SessionSchema);
