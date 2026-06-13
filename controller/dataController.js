// this file is in the controller/dataController
require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const {saveTransaction} = require('../utilities/saveTransaction');

const NETWORK_CODES = {
  '1': 'MTN',
  '2': 'GLO',
  '3': '9MOBILE',
  '4': 'AIRTEL'
};

const generateTransactionRef = () => 'DATA-' + Date.now() + '-' + Math.floor(Math.random() * 1000);


const buyData = async (req, res) => {
  const { network, phone, dataPlan, userId, amount } = req.body;
  console.log("Request data:", req.body);

  try {
    const cleanPhone = validator.escape(phone || '');
    if (!cleanPhone || !validator.isMobilePhone(cleanPhone, 'en-NG')) {
      return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    if (!NETWORK_CODES[network]) {
      return res.status(400).json({ message: 'Invalid network' });
    }

    const userAcc = await balanceCheck(userId, amount);
    console.log("User balance before:", userAcc.balance);

   // const requestId = `DATA_${crypto.randomBytes(6).toString('hex')}`;
    const payload = {
      network: parseInt(network),
      mobile_number: cleanPhone,
      plan: parseInt(dataPlan),
      Ported_number: true
    };

    const response = await axios.post(
      `https://www.husmodata.com/api/data/`,
      payload,
      {
        headers: {
          Authorization: `Token 1b1064c5d139ecedbaca1f5686dc4f17a0952c73`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;
    console.log('Result:', result);

    // Only proceed if the purchase was successful
    if (!result?.Status || result.Status !== 'successful') {
      return res.status(400).json({
        message: 'Data purchase failed. No debit was made.',
      });
    }

    // ✅ Now safely debit user and save
    const oldBalance = userAcc.balance;
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    try {
      await saveTransaction({
        user: userId,
        accountNumber: userAcc.accountNumber,
        amount,
        transactionReference: generateTransactionRef(),
        TransactionType: 'Data-Purchase',
        type: 'debit',
        description: result.message || `Data purchase for ${NETWORK_CODES[network]} - ${result.dataplan}`,
        phone: cleanPhone,
        oldBalance,
        newBalance
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
