const mongoose = require("mongoose");

const PricingSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    unique: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  prices: {
    agent: { type: Number, required: true },
    api: { type: Number, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model("ServicePricing", PricingSchema);
