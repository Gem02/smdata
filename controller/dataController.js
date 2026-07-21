// this file is in the controller/dataController
require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const {saveTransaction} = require('../utilities/saveTransaction');
const { awardReferralCommission } = require('../utilities/referralCommission');
const Plan = require('../models/Plan');

const NETWORK_CODES = {
  '1': 'MTN',
  '2': 'GLO',
  '3': '9MOBILE',
  '4': 'AIRTEL'
};

const generateTransactionRef = () => 'DATA-' + Date.now() + '-' + Math.floor(Math.random() * 1000);


const buyData = async (req, res) => {
  const { network, phone, PlanId, userId } = req.body;
  console.log("Request data:", req.body);

  try {
    const cleanPhone = validator.escape(phone || '');
    if (!cleanPhone || !validator.isMobilePhone(cleanPhone, 'en-NG')) {
      return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    if (!PlanId) {
      return res.status(400).json({ message: 'Please provide a valid PlanId.' });
    }

    const plan = await Plan.findOne({ planId: PlanId, isActive: true });
    if (!plan) {
      return res.status(404).json({ message: 'Data plan not found.' });
    }

    const amount = plan.sellingPrice ? plan.sellingPrice : plan.price;

    if (!NETWORK_CODES[network]) {
      return res.status(400).json({ message: 'Invalid network' });
    }

    const userAcc = await balanceCheck(userId, amount);
    console.log("User balance before:", userAcc.balance);

   // const requestId = `DATA_${crypto.randomBytes(6).toString('hex')}`;
    const payload = {
      network: parseInt(network),
      mobile_number: cleanPhone,
      plan: parseInt(PlanId),
      Ported_number: true
    };

    const response = await axios.post(
      `https://alrahuzdata.com/api/data/`,
      payload,
      {
        headers: {
          Authorization: `Token ${process.env.ALRAHUZ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;
    console.log('Result:', result);

    // Only proceed if the purchase was successful
    if (!result?.Status || result.Status !== 'successful') {
      console.log('Data purchase failed with', result)
      return res.status(400).json({
        message: 'Data purchase failed. No debit was made.',
      });
    }

    // ✅ Now safely debit user and save
    const oldBalance = userAcc.balance;
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    const transactionReference = generateTransactionRef();
    const profitAmount = Math.max(0, Number((plan.sellingPrice ?? plan.price ?? 0) - (plan.costPrice ?? 0)).toFixed(2));

    try {
      await saveTransaction({
        user: userId,
        amount,
        transactionReference,
        TransactionType: 'Data-Purchase',
        type: 'debit',
        description: result.message || `Data purchase for ${NETWORK_CODES[network]} - ${cleanPhone}`,
        phone: cleanPhone,
        oldBalance,
        newBalance,
        adminProfit: {
          amount: profitAmount,
          sourceType: 'Data-Purchase',
          description: `Data profit from ${plan.planName || plan.planId}`,
          relatedUser: userId,
        },
      });

      await awardReferralCommission({
        referredUserId: userId,
        transactionAmount: amount,
        transactionReference,
        transactionType: 'Data-Purchase',
        description: result.message || `Data purchase for ${NETWORK_CODES[network]} - ${cleanPhone}`,
      });
    } catch (error) {
      return res.status(400).json({ message: 'Error saving transaction.' });
    }

    return res.status(200).json({
      message: 'Data purchased successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('Data purchase error:', error.response?.data || error.message);
    return res.status(400).json({
      message: error.response?.data || error.message || 'Error processing data purchase',
    });
  }
};


module.exports = { buyData };
