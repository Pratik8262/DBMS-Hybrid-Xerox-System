'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const StorageSubSchema = new Schema({
  storageType: { type: String, enum: ['local','cloudinary','s3','gcs','azure'], default: 'local' },
  path:        { type: String, required: true },
  checksum:    { type: String, default: null },
  expiryAt:    { type: Date, default: null }
}, { _id: false });

const FileSchema = new Schema({
  uuid:       { type: String, required: true, unique: true, index: true },
  sessionId:  { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['pdf','docx','jpg','png','txt'], required: true },
  size:       { type: Number, required: true, min: 1 },
  pages:      { type: Number, default: null },
  storage:    { type: StorageSubSchema, required: true },
  uploadedAt: { type: Date, default: Date.now },
  status:     { type: String, enum: ['pending','ready','expired','deleted'], default: 'pending' }
}, {
  versionKey: false,
  toJSON: { virtuals: true }
});

FileSchema.index({ sessionId: 1, uploadedAt: -1 });
FileSchema.index({ status: 1 });

module.exports = mongoose.model('File', FileSchema);
