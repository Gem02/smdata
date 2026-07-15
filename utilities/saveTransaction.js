const Transaction = require('../models/transactions');
const DataHistory = require('../models/dataHistoryModel');
const AdminProfit = require('../models/AdminProfit');

const saveTransaction = async ({
  user,
  amount,
  transactionReference,
  TransactionType,
  type,
  status = 'success',
  description,
  oldBalance = 0,
  newBalance = 0,
  adminProfit
}) => {
  try {
    const newTransaction = new Transaction({
      user,
      amount,
      transactionReference,
      TransactionType,
      type,
      status,
      description,
      oldBalance,
      newBalance,
    });

    await newTransaction.save();

    if (status === 'success' && ['Wallet-Topup-Fee', 'Data-Purchase', 'Airtime-Purchase'].includes(TransactionType)) {
      const profitRecord = adminProfit || {
        amount: Number(amount || 0),
        sourceType: TransactionType,
        description: description || TransactionType,
        relatedUser: user || null
      };

      await AdminProfit.create({
        transactionReference,
        sourceType: profitRecord.sourceType || TransactionType,
        amount: Number(profitRecord.amount || 0),
        description: profitRecord.description || description || TransactionType,
        relatedUser: profitRecord.relatedUser ?? user || null,
        createdAt: new Date(),
      });
    }

    console.log('✅ Transaction saved successfully.');
  } catch (error) {
    console.error('❌ Error saving transaction:', error.message);
    throw new Error('Transaction logging failed.');
  }
};

const saveDataHistory = async ({
  data,
  dataFor,
  verifyWith,
  slipLayout,
  userId,
}) => {
  try {
    const record = new DataHistory({
      data,
      dataFor,
      verifyWith,
      slipLayout,
      userId,
    });

    await record.save();
    console.log('✅ DATA verification saved successfully.');
  } catch (error) {
    console.error('❌ Error saving DATA verification:', error.message);
    throw new Error('DATA logging failed.');
  }
};

const saveSubmissionDataHistory = async ({trackingId, dataFor, userId,}) => {
  try {
    const record = new DataHistory({
      trackingId,
      dataFor,
      userId,
    });

    await record.save();
    console.log('✅ DATA verification saved successfully.');
  } catch (error) {
    console.error('❌ Error saving DATA verification:', error.message);
    throw new Error('DATA logging failed.');
  }
};

module.exports = {
  saveTransaction,
  saveDataHistory,
  saveSubmissionDataHistory
};
