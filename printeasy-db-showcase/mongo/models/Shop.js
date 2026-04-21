'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AddressSchema = new Schema({
  street:  { type: String, default: null },
  area:    { type: String, default: null },
  city:    { type: String, required: true },
  pincode: { type: String, required: true },
  localIp: { type: String, default: null }
}, { _id: false });

const NetworkConfigSchema = new Schema({
  ssid:      { type: String, required: true },
  authType:  { type: String, enum: ['WPA2','WPA3','Open','WEP'], default: 'WPA2' },
  isPrimary: { type: Boolean, default: false }
}, { _id: true });

const ShopSchema = new Schema({
  uuid:           { type: String, required: true, unique: true, index: true },
  shopName:       { type: String, required: true, trim: true },
  email:          { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  contact:        { type: String, required: true },
  status:         { type: String, enum: ['active','inactive','suspended'], default: 'active' },
  address:        { type: AddressSchema, default: () => ({}) },
  networkConfigs: { type: [NetworkConfigSchema], default: [] },
  createdAt:      { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ShopSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Shop', ShopSchema);
