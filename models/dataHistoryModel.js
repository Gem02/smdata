const mongoose = require('mongoose');

const DataHistorySchema = new mongoose.Schema({
  data: { type: Object },
  status: {type: String, enum: ['pending', 'completed','failed'], default: 'pending'},
  dataFor: {type: String},
  trackingId: {type: String},
  verifyWith: { type: String },
  slipLayout: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: '5d' } 
});

module.exports = mongoose.model('DataHistory', DataHistorySchema);
