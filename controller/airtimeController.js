// this file is in the controller/airtimeController

require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const {saveTransaction} = require('../utilities/saveTransaction');
const { awardReferralCommission } = require('../utilities/referralCommission');

const NETWORK_CODES = {
  '1': 'MTN',
  '2': 'GLO',
  '3': '9MOBILE',
  '4': 'AIRTEL'
};

const generateTransactionRef = () => 'AIRTIME-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const AIRTIME_DISCOUNT_RATE = 0.02;

const calculateAirtimeDiscount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { originalAmount: 0, discountAmount: 0, discountedAmount: 0 };
  }

  const discountAmount = Number((numericAmount * AIRTIME_DISCOUNT_RATE).toFixed(2));
  const discountedAmount = Number((numericAmount - discountAmount).toFixed(2));

  return {
    originalAmount: numericAmount,
    discountAmount,
    discountedAmount,
  };
};

const buyAirtime = async (req, res) => {
  const { network, phone, amount, userId } = req.body;
  console.log("Airtime Request:", req.body);

  try {
    const cleanPhone = validator.escape(phone || '');
    if (!cleanPhone || !validator.isMobilePhone(cleanPhone, 'en-NG')) {
      return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    const mainNetwork = Number(network);
    if (!NETWORK_CODES[mainNetwork]) {
      return res.status(400).json({ message: 'Invalid network' });
    }

    const { originalAmount, discountAmount, discountedAmount } = calculateAirtimeDiscount(amount);
    const chargeAmount = discountedAmount;
    const airtimeProfitAmount = Number((originalAmount * 0.01).toFixed(2));

    const userAcc = await balanceCheck(userId, chargeAmount);
    console.log("User balance before deduction:", userAcc.balance);

    const payload = {
      network: mainNetwork,
      amount: originalAmount,
      mobile_number: cleanPhone,
      Ported_number: true,
      airtime_type: 'VTU'
    };

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `https://alrahuzdata.com/api/topup/`,


      headers: {
        Authorization: `Token ${process.env.ALRAHUZ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(payload)
    };

    const response = await axios(config);
    const result = response.data;

    if (!result?.Status || result.Status !== 'successful') {
      console.log('airtime purchased failed with', result)
      return res.status(400).json({ message: 'Airtime purchase failed. Funds refunded.' });
    }

    const oldBalance = userAcc.balance;
    userAcc.balance -= chargeAmount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    const transactionReference = generateTransactionRef();

    await saveTransaction({
      user: userId,
      amount: chargeAmount,
      transactionReference,
      TransactionType: 'Airtime-Purchase',
      type: 'debit',
      description: result.message || `Airtime purchase: ${NETWORK_CODES[mainNetwork]} VTU - ${cleanPhone}`,
      phone: cleanPhone,
      oldBalance,
      newBalance,
      adminProfit: {
        amount: airtimeProfitAmount,
        sourceType: 'Airtime-Purchase',
        description: `Airtime interest for ${NETWORK_CODES[mainNetwork]}`,
        relatedUser: userId,
      },
    });

    await awardReferralCommission({
      referredUserId: userId,
      transactionAmount: chargeAmount,
      transactionReference,
      transactionType: 'Airtime-Purchase',
      description: result.message || `Airtime purchase: ${NETWORK_CODES[mainNetwork]} VTU - ${cleanPhone}`,
    });
    console.log('everything saved here is the data:', result)
    return res.status(200).json({
      message: 'Airtime purchased successfully',
      data: result,
      discountApplied: discountAmount,
      discountedAmount: chargeAmount,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('Airtime Error:', error.response?.data || error.message);

    return res.status(500).json({
      message: error.message || 'Server error during airtime purchase',
      error: error.response?.data || {}
    });
  }
};

module.exports = { buyAirtime, calculateAirtimeDiscount };
