const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, unique: true, required: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "NGN" },
  role: { type: String, enum: ["resale", "user"], default: "user" },
  accountName: { type: String },
  accountNumber: { type: String },
  bankName: { type: String },
  customer_id: { type: String },
transactions: [
  {
    type: { type: String, enum: ["credit", "debit"] },
    amount: Number,
    description: String,
    oldBalance: { type: Number, default: 0 },
    newBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed"
    },
    reference: String, 
    paymentGateway: String
  }
]
}, { timestamps: true });


module.exports = mongoose.model("Wallet", walletSchema);
