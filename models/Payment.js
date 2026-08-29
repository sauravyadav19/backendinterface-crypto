const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  depositAddress: { type: String, required: true },
  expectedAmount: { type: Number, required: true },
  requestedAmount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PAID', 'EXPIRED'], default: 'PENDING' },
  expiresAt: { type: Date, required: true },
  incomingTxId: { type: String },
  fromAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', paymentSchema);