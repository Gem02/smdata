const mongoose = require('mongoose');

const forgotPasswordCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } 
});

const forgotPasswordCode = mongoose.model('forgotPasswordCode', forgotPasswordCodeSchema);
module.exports = forgotPasswordCode;


