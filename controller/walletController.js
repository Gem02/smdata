// controller/walletController.js
require('dotenv').config();
const Wallet = require("../models/Wallet");
const crypto = require("crypto");
const Users = require("../models/User");
const axios = require('axios');
const validator = require('validator');
const { saveTransaction } = require('../utilities/saveTransaction');
const { awardReferralCommission } = require('../utilities/referralCommission');
const { calculateTopupFee } = require('../utilities/topupFee');

const initiateTopup = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const email = user.email;
    const name = user.fullName;
    const phoneNumber = user.phone;
    const bankCode = ["20867"];
    const businessId = process.env.XIXAPAY_BUSINESS_ID;
    const accountType = "static";
    const id_type = "nin";
    const id_number = validator.escape(req.body?.number || "");

    const payload = {
      email,
      name,
      phoneNumber,
      bankCode,
      businessId,
      accountType,
      id_type,
      id_number,
    };

    const paymentResponse = await axios.post(
      "https://api.xixapay.com/api/v1/createVirtualAccount",
      payload,
      {
        headers: {
          "Authorization": `Bearer ${process.env.XIXAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
          "api-key": process.env.XIXAPAY_API_KEY,
        },
      }
    );

    const result = paymentResponse.data;
    console.log("🟢 XIXAPay response:", result);

    // Extract bank info safely
    const accountInfo = Array.isArray(result.bankAccounts)
      ? result.bankAccounts[0]
      : result.bankAccounts;

    const customerId = result.customer?.customer_id;
    const bankName = accountInfo?.bankName;
    const accountName = accountInfo?.accountName;
    const accountNumber = accountInfo?.accountNumber;

    // Update wallet record
    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: userId }, // ✅ Correct field
      { customer_id: customerId, bankName, accountName, accountNumber },
      { new: true }
    );

    if (!updatedWallet) {
      console.warn(`⚠️ No wallet found for user ${userId}`);
    } else {
      console.log("✅ Wallet updated successfully:", updatedWallet);
    }

    return res.status(200).json({
      success: true,
      message: "Virtual account created successfully",
      data: { customerId, bankName, accountName, accountNumber },
    });
  } catch (error) {
    console.error("❌ Initiate top-up error:", error.response?.data || error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Failed to initiate payment",
    });
  }
};


const handleXixapayWebhook = async (req, res) => {
  try {
    const secretKey = process.env.XIXAPAY_SECRET_KEY;

    // 🧾 Log all headers to confirm which one Xixapay actually sends
    console.log("🔍 Incoming headers:", req.headers);

    // Some providers use variations like 'x-xixapay-signature' or 'xixapay-signature'
    const signatureHeader =
      req.headers["xixapay"] ||
      req.headers["x-xixapay-signature"] ||
      req.headers["x-xixapay"];

    console.log("🧩 Extracted signature header:", signatureHeader);

    // 🧠 Confirm body type (Buffer or object)
    console.log("📦 req.body type:", typeof req.body);

    // ✅ Convert to correct raw payload string
    const payload =
      req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);

    console.log("📨 Raw payload received from Xixapay:", payload);

    // 🔐 Calculate HMAC signature
    const calculatedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex");

    console.log("🧮 Calculated signature:", calculatedSignature);
    console.log("🧾 Received signature:", signatureHeader);

    // ✅ Verify the signature
    if (calculatedSignature !== signatureHeader) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    console.log("✅ Webhook signature is valid!");
    const data = req.body instanceof Buffer ? JSON.parse(req.body.toString()) : req.body;

    console.log("🧠 Webhook data content:", data);

     if (data.notification_status === "payment_successful" && data.transaction_status === "success") {
      const { amount_paid, transaction_id, customer } = data;
      const customerId = customer?.customer_id;

      if (!customerId) {
        console.log("⚠️ No customer_id found in payload.");
        return res.status(400).json({ message: "Missing customer_id" });
      }

      // 🔍 7️⃣ Find wallet by customer_id
      const wallet = await Wallet.findOne({ customer_id: customerId });

      if (!wallet) {
        console.log("⚠️ Wallet not found for customer:", customerId);
        return res.status(404).json({ message: "Wallet not found" });
      }

      // 🧾 8️⃣ Prevent double-credit by checking if this transaction_id exists
      const alreadyExists = wallet.transactions.some(
        (tx) => tx.reference === transaction_id
      );
      if (alreadyExists) {
        console.log("⚠️ Duplicate webhook ignored:", transaction_id);
        return res.status(200).json({ message: "Duplicate ignored" });
      }

      // 9️⃣ Capture old balance before update
      const oldBalance = wallet.balance;
      const fee = calculateTopupFee(amount_paid);
      const creditedAmount = Number((amount_paid - fee).toFixed(2));

      // 🔢 10️⃣ Credit wallet balance with net amount
      wallet.balance += creditedAmount;
      const afterCreditBalance = wallet.balance;

      // 🔢 11️⃣ Record the credit
      wallet.transactions.push({
        type: "credit",
        amount: creditedAmount,
        description: data.description || "XIXAPay top-up",
        reference: transaction_id,
        paymentGateway: "XIXAPay",
        status: "completed",
        oldBalance,
        newBalance: afterCreditBalance,
      });

      // 🔢 12️⃣ Deduct the top-up fee if applicable
      if (fee > 0) {
        wallet.transactions.push({
          type: "debit",
          amount: fee,
          description: "Top-up fee (1.5% capped at ₦50)",
          reference: `${transaction_id}-FEE`,
          paymentGateway: "Topup Fee",
          status: "completed",
          oldBalance: afterCreditBalance,
          newBalance: afterCreditBalance - fee,
        });
        wallet.balance -= fee;
      }

      const newBalance = wallet.balance;
      await wallet.save();
      console.log(`💰 Wallet updated for ${customerId}. Old balance: ${oldBalance}, New balance: ${newBalance}, fee: ${fee}`);
    
       await saveTransaction({
            user: wallet.user,
            amount: creditedAmount,
            transactionReference: transaction_id,
            TransactionType: 'Wallet-Topup',
            type: 'credit',
            description: 'Wallet TopUp',
            oldBalance,
            newBalance,
          });

      if (fee > 0) {
        await saveTransaction({
          user: wallet.user,
          amount: fee,
          transactionReference: `${transaction_id}-FEE`,
          TransactionType: 'Wallet-Topup-Fee',
          type: 'debit',
          description: 'Top-up fee',
          oldBalance: newBalance + fee,
          newBalance,
        });
      }

      await awardReferralCommission({
        referredUserId: wallet.user,
        transactionAmount: amount_paid,
        transactionReference: transaction_id,
        transactionType: 'Wallet-Topup',
        description: 'Wallet TopUp',
      });
    
    } else {
      console.log("ℹ️ Non-successful transaction ignored.");
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("💥 Webhook processing error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

 const getUserBalance = async (req, res) => {
  try {
    const userId = req.params.userId;

    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found for this user" });
    }

    return res.status(200).json({
      success: true,
      wallet
    });
  } catch (error) {
    console.error("Error fetching user balance:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

 const getUserTransactions = async (req, res) => {
  try {
    const userId = req.params.userId;

    const wallet = await Wallet.findOne({ user: userId }, { transactions: 1 });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found for this user" });
    }

    // Sort transactions latest first
    const transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt);

    return res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



module.exports = {getUserBalance, getUserTransactions, initiateTopup, handleXixapayWebhook }