const Wallet = require('../models/Wallet');
const bcryptjs = require('bcryptjs');

const balanceCheck = async (userId, amount) => {
  
  if (isNaN(Number(amount)) || amount <= 0) {
    throw new Error('Amount is too low')
  }

  const userAcc = await Wallet.findOne({ user: userId });

  if (!userAcc) {
    throw new Error('Wallet not found.');
  }


  if (userAcc.balance < amount) {
    throw new Error('Insufficient wallet balance.');
  }

  // ✅ Only return userAcc, do not deduct here
  return userAcc;
};

module.exports = { balanceCheck };
