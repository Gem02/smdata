const mongoose = require('mongoose');

const adminProfitSchema = new mongoose.Schema({
  transactionReference: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sourceType: {
    type: String,
    enum: ['Wallet-Topup-Fee', 'Data-Purchase', 'Airtime-Purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminProfit', adminProfitSchema);
