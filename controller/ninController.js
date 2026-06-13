require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const { saveTransaction, saveDataHistory } = require('../utilities/saveTransaction');

const generateTransactionRef = () =>
  'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const verifyNin = async (req, res) => {
  const ninUrl = 'https://fylder-atg0.onrender.com/api/v1/dev/verify/nin_nin';
  const ninPhoneUrl = 'https://fylder-atg0.onrender.com/api/v1/dev/verify/nin_phone';

  const phoneUrl = {
    regular: 'https://dataverify.com.ng/developers/nin_slips/nin_regular_phone',
    standard: 'https://dataverify.com.ng/developers/nin_slips/nin_standard_phone',
    premium: 'https://dataverify.com.ng/developers/nin_slips/nin_premium_phone',
  };

  const { nin, amount, userId, verifyWith, slipLayout, phone } = req.body;
  console.log("request data", req.body);

  try {
    // Decide which set of URLs to use
    let mainUrl;
    if (verifyWith === "nin") {
      mainUrl = ninUrl;
      if (!nin || nin.length !== 11 || !validator.isNumeric(nin)) {
        return res.status(400).json({ message: 'Error: Please provide a valid 11-digit NIN.' });
      }
    } else if (verifyWith === "phone") {
      mainUrl = ninPhoneUrl;
      if (!phone || phone.length < 10 || !validator.isNumeric(phone)) { // phone numbers may be 10-13 digits
        return res.status(400).json({ message: 'Error: Please provide a valid phone number.' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid verifyWith option. Must be "nin" or "phone".' });
    }

    // Check balance before proceeding
    const userAcc = await balanceCheck(userId, amount);
    console.log("BALANCE DATA", userAcc);

    // Pick URL based on slip type
    const layoutKey = (slipLayout || "regular").toLowerCase();

    // Payload is always api_key + nin (nin can be actual nin or phone)
    const payload = {
      api_key: process.env.FYLDER_API_KEY,
      nin: verifyWith === "nin" ? nin : phone,
      slipLayout: layoutKey
    };

    const response = await axios.post(mainUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const result = response.data;
    console.log("the result is:", result);

    if (!result || !result.success ) {
      return res.status(400).json({ message: 'Verification failed.' });
    }

    // Deduct balance and save
    const oldBalance = userAcc.balance;
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    userAcc.transactions.push({
      type: "debit",
      amount: amount,
      description: "NIN verification",
      status: "completed",
    });
    await userAcc.save();

    await saveDataHistory({
      data: result.result,
      dataFor: 'NIN-Slip',
      verifyWith,
      slipLayout,
      userId,
    });

    await saveTransaction({
      user: userId,
      amount,
      transactionReference: generateTransactionRef(),
      TransactionType: 'NIN-Verification',
      type: 'debit',
      description: 'NIN verification slip payment',
      oldBalance,
      newBalance,
    });

    return res.status(200).json({
      message: 'Verification successful.',
      data: result,
      verifyWith,
      slipLayout,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || 'Server error during verification.'
    });
  }
};

module.exports = { verifyNin };
