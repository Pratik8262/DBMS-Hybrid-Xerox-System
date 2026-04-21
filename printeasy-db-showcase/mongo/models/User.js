'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  uuid:      { type: String, required: true, unique: true, index: true },
  name:      { type: String, required: true, trim: true },
  phone:     { type: String, required: true, unique: true, trim: true },
  email:     { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  deviceId:  { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);
