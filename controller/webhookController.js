// webhookController.js
const crypto = require("crypto");
const Wallet = require("../models/Wallet.js");
const Transaction = require("../models/transactions");
const User = require("../models/User.js");

 const handlePaystackWebhook = async (req, res) => {
  console.log('Received at:', new Date().toISOString());
  
  try {
    // 1. Verify the webhook secret exists
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('ERROR: PAYSTACK_SECRET_KEY is not configured');
      return res.status(500).json({ status: false, message: "Server configuration error" });
    }

    // 2. Verify the webhook signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");
    
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      console.error('ERROR: Missing Paystack signature header');
      return res.status(400).json({ status: false, message: "Missing signature header" });
    }

    if (hash !== signature) {
      console.error('ERROR: Invalid signature', {
        computedHash: hash,
        receivedSignature: signature
      });
      return res.status(400).json({ status: false, message: "Invalid signature" });
    }

    console.log('✓ Signature verification passed');

    // 3. Process the webhook event
    const event = JSON.parse(req.body.toString("utf8"));
    console.log('Event Type:', event.event);
    console.log('Event Data:', JSON.stringify(event.data, null, 2));

    // Always respond immediately to acknowledge receipt
    res.status(200).json({ received: true });

    // 4. Handle specific event types
    if (event.event === "charge.success") {
      await processSuccessfulCharge(event.data);
    } else if (event.event === "subscription.create") {
      console.log('Subscription created event received');
    } else {
      console.log(`Unhandled event type: ${event.event}`);
    }

  } catch (error) {
    console.error('ERROR processing webhook:', error);
    // Note: We already sent a 200 response, so we can't change it now
    // This is why we send the 200 immediately after signature verification
  }
};

async function processSuccessfulCharge(data) {
  try {
    console.log('\nProcessing successful charge...');

    // Extract transaction details
    const email = data.customer?.email;
    const amount = data.amount / 100; // Convert from kobo to naira
    const reference = data.reference;
    const transactionId = data.id;

    if (!email) {
      console.error('ERROR: No customer email in charge data');
      return;
    }

    console.log(`Processing transaction ${reference} for ${email}, amount: ₦${amount}`);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`ERROR: User not found for email: ${email}`);
      return;
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ user: user._id });

    // Apply top-up fee
    const fee = calculateTopupFee(amount);
    const creditedAmount = Number((amount - fee).toFixed(2));

    wallet.balance += creditedAmount;
    wallet.transactions.push({
      type: "credit",
      amount: creditedAmount,
      description: "PayStack topup",
      status: "completed",
      oldBalance: wallet.balance - creditedAmount,
      newBalance: wallet.balance,
    });

    wallet.transactions.push({
      type: "debit",
      amount: fee,
      description: "Topup fee (1.5% + ₦50 capped at ₦5,000)",
      status: "completed",
      oldBalance: wallet.balance,
      newBalance: wallet.balance - fee,
    });

    wallet.balance -= fee;
    await wallet.save();
    console.log(`Updated wallet balance for user ${user._id}: ₦${wallet.balance} after fee ₦${fee}`);

    // Create transaction record for the credited amount
    const transaction = await Transaction.create({
      user: user._id,
      type: "credit",
      amount: creditedAmount,
      transactionReference: reference,
      TransactionType: "Wallet-Topup",
      description: "PayStack topup",
      oldBalance: wallet.balance - creditedAmount + fee,
      newBalance: wallet.balance,
    });

    if (fee > 0) {
      await Transaction.create({
        user: user._id,
        type: "debit",
        amount: fee,
        transactionReference: `${reference}-FEE`,
        TransactionType: "Wallet-Topup-Fee",
        description: "Wallet topup fee",
        oldBalance: wallet.balance + fee,
        newBalance: wallet.balance,
      });
    }

    console.log(`Created transaction record: ${transaction._id}`);

  } catch (error) {
    console.error('ERROR in processSuccessfulCharge:', error);
  }
}

module.exports = handlePaystackWebhook