require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const { balanceCheck } = require("../utilities/compareBalance");
const DataHistory = require('../models/dataHistoryModel');
const { saveTransaction, saveDataHistory, saveSubmissionDataHistory } = require("../utilities/saveTransaction");

const generateTransactionRef = () =>
  "IPE-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

const submitIPE = async (req, res) => {
  const { trackingId, userId, amount } = req.body;
  const base_url = "https://fylder-atg0.onrender.com/api/v1/dev/verify/submit-ipe"

  try {
    const cleanTrackingId = (trackingId || "").trim();

    // 🔒 Validate tracking ID
    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
      return res.status(400).json({ message: "Invalid Tracking ID." });
    }

    // 💰 Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    // 🔑 Check balance
    const userAcc = await balanceCheck(userId, amount);
    if (!userAcc) {
      return res.status(403).json({ message: "Invalid balance." });
    }

    // 📡 Make the external API call
    const response = await axios.post(
      base_url,
      { tracking_id: cleanTrackingId,
        api_key: process.env.FYLDER_API_KEY,
      callbackUrl: 'https://abbavtu.onrender.com/api/verify/webhook' },
        {
          headers: { 'Content-Type': 'application/json' },
        }
    );

    const result = response.data;

    if (!result?.success) {
      console.error("Submit IPE Error Response:", result);
      return res.status(400).json({ message: "Error submitting IPE tracking ID.", details: result });
    }

    // 💸 Capture old balance before deduction
    const oldBalance = userAcc.balance;
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    const transactionReference = generateTransactionRef();

    await saveSubmissionDataHistory({
      trackingId: cleanTrackingId,
      dataFor: "IPE-Slip",
      userId,
    });


    // 💾 Save transaction record
    await saveTransaction({
      user: userId,
      amount,
      transactionReference,
      TransactionType: "IPE-Submit",
      type: "debit",
      description: `Submitted IPE tracking ID ${cleanTrackingId}`,
      oldBalance,
      newBalance,
    });

    console.log("Transaction saved");

    return res.status(200).json({
      message: "IPE tracking submitted successfully",
      data: result,
      balance: userAcc.balance,
    });

  } catch (error) {
    console.error("IPE Submit Error:", error.response?.data || error.message);
    
    // Fix: Use req.body.trackingId since cleanTrackingId is out of scope
    const trackingIdFromReq = (req.body.trackingId || "").trim();
    
    if (trackingIdFromReq) {
      await DataHistory.findOneAndUpdate(
        { trackingId: trackingIdFromReq }, 
        { status: 'failed' }
      );
    }
    
    return res.status(500).json({
      message: "Server error during IPE submission",
      error: error.response?.data || error.message,
    });
  }
};


const checkIPEStatus = async (req, res) => {
  const { trackingId, userId, amount } = req.body;
  const base_url = process.env.AY_VERIFY_BASE_URL;

  try {
    const cleanTrackingId = (trackingId || "").trim();

    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
      return res.status(400).json({ message: "Invalid Tracking ID." });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const userAcc = await balanceCheck(userId, amount);
    if (!userAcc) {
      return res.status(403).json({ message: "Invalid balance" });
    }


   const response = await axios.post(
      `${base_url}/api/v1/verify/check-ipe`,
      { tracking_id: cleanTrackingId, },
      {
        headers: {
          'x-api-key': process.env.AY_VERIFY_API_KEY,
          'x-api-secret': process.env.AY_VERIFY_API_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data

    if (!result?.success) {
      console.error('the finalRes is ', result);
      return res.status(400).json({ message: "Error checking IPE status.", details: result });
    }

    // 💰 Capture old balance before deduction
    const oldBalance = userAcc.balance;
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    const transactionReference = generateTransactionRef();

    await saveDataHistory({
      data: result,
      dataFor: "IPE-Slip",
      userId,
    });

    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: "IPE-Status",
      type: "debit",
      description: `Checked IPE status for ${cleanTrackingId}`,
      oldBalance,
      newBalance,
    });
    console.log('reansaction saved')

    return res.status(200).json({
      message: "IPE status checked successfully",
      data: result,
      balance: userAcc.balance,
    });

  } catch (error) {
    console.error("IPE Status Error:", error);
    return res.status(500).json({ message: "Server error during IPE status check", error: error.message });
  }
};

const freeStatus = async (req, res) => {
  const { trackingId, userId } = req.body;
  const base_url = "https://fylder-atg0.onrender.com/api/v1/dev/verify/check-ipe"

  try {
    const cleanTrackingId = (trackingId || "").trim();

    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
      return res.status(400).json({ message: "Invalid Tracking ID." });
    }


     const response = await axios.post(
      base_url,
      { tracking_id: cleanTrackingId,
        api_key: process.env.FYLDER_API_KEY, },
        {
          headers: { 'Content-Type': 'application/json' },
        }
    );

    const result = response.data;

    if (!result?.success) {
      return res.status(400).json({ message: "Error checking IPE status.", details: result });
    }
    await saveDataHistory({
      data: result,
      dataFor: "IPE-Slip",
      userId,
    });

    return res.status(200).json({
      message: "IPE status checked successfully",
      data: result,
    });

  } catch (error) {
    console.error("IPE Status Error:", error);
    return res.status(500).json({ message: "Server error during IPE status check", error: error.message });
  }
}

const recievedWebhook = async (req, res) => {
  try {
    const { tracking_id, status } = req.body;

    // Validate required fields
    if (!tracking_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: tracking_id and status are required'
      });
    }

    // Find the pending record by trackingId
    const dataHistory = await DataHistory.findOne({ 
      trackingId: tracking_id,
      status: 'pending'
    });

    if (!dataHistory) {
      console.error({
        success: false,
        message: 'No pending record found with this tracking ID'
      });
      return res.status(404).json({
        success: false, 
        message: 'No pending record found with this tracking ID'
      });
    }

    // Update ONLY the status based on webhook status
    if (status === 'Successful') {
      dataHistory.status = 'completed';
    } else {
      dataHistory.status = 'failed';
    }

    await dataHistory.save();

    // Send success response to the webhook caller
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      trackingId: tracking_id
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Still return 200 to the webhook caller to avoid retries
    res.status(200).json({
      success: false,
      message: 'Error processing webhook, but acknowledged receipt'
    });
  }
}

module.exports = {
  submitIPE,
  checkIPEStatus,
  freeStatus,
  recievedWebhook
};
