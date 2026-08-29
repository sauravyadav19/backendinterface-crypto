const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  destinationAddress: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  txId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Request', requestSchema);