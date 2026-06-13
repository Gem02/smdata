
const mongoose = require('mongoose');

const virtualAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountReference: { type: String, required: true, unique: true },
  accountName: String,
  accountNumber: String,
  bankName: String,
  currencyCode: String,
  contractCode: String,
  customerEmail: String,
  customerName: String,
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VirtualAccount', virtualAccountSchema);
