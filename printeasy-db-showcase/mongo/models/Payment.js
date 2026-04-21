'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema({
  uuid:               { type: String, required: true, unique: true, index: true },
  jobId:              { type: Schema.Types.ObjectId, ref: 'PrintJob', required: true },
  method:             { type: String, enum: ['cash','upi','card','wallet','netbanking'], required: true },
  amount:             { type: Number, required: true, min: 0.01 },
  status:             { type: String, enum: ['pending','success','failed','refunded'], default: 'pending', index: true },
  razorpayOrderId:    { type: String, default: null },
  razorpayPaymentId:  { type: String, unique: true, sparse: true, default: null },
  gatewayTxnId:       { type: String, unique: true, sparse: true, default: null },
  attemptNo:          { type: Number, min: 1, default: 1 },
  paidAt:             { type: Date, default: null },
  createdAt:          { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true }
});

PaymentSchema.index({ jobId: 1, status: 1 });
PaymentSchema.index({ paidAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
