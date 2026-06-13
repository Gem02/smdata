// this file is in the controller/bvnController
require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const {balanceCheck} = require('../utilities/compareBalance');
const {saveTransaction, saveDataHistory} = require('../utilities/saveTransaction');


const generateTransactionRef = () => 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);


const verifyBvn = async (req, res) => {
  console.log("request data", req.body);
  const mainUrl = 'https://fylder-atg0.onrender.com/api/v1/dev/verify/bvn';
  const { bvn, amount, userId, verifyWith, slipLayout } = req.body;
  console.log("request data", req.body);

  try {
    const cleanBVN = validator.escape(bvn || '');
    if (!cleanBVN || cleanBVN.length !== 11) {
      return res.status(400).json({ message: 'Error: Please provide a valid 11-digit NIN number.' });
    }

    const userAcc = await balanceCheck(userId, amount);

   
    
    const response = await axios.post(
          mainUrl,
          { bvn: cleanBVN, api_key: process.env.FYLDER_API_KEY },
          {
            headers: {'Content-Type': 'application/json'},
          }
        );

    const result = response.data;

    if (!result?.success) {
      return res.status(400).json({ message: ' BVN verification failed.' });
    }

    const oldBalance = userAcc.balance;
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    await saveDataHistory({
      data: result,
      dataFor: 'BVN-Slip',
      verifyWith,
      slipLayout,
      userId,
    });

    await saveTransaction({
          user: userId,
          amount,
          transactionReference: generateTransactionRef(),
          TransactionType: 'BVN-Verification',
          type: 'debit',
          description: 'BVN verification slip payment',
          oldBalance,
          newBalance,
        });

    return res.status(200).json({
      message: ' BVN verified successfully.',
       result,
      verifyWith,
      slipLayout,
      balance: userAcc.balance
    });

  } catch (error) {
    console.log("the error is", error)
    return res.status(500).json({ 
        message: error.message || 'Server error during BVN verification.'
     });
  }
};


module.exports = {verifyBvn};
