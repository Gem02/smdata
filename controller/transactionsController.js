const Transaction = require('../models/transactions');
const DataHistory = require('../models/dataHistoryModel');

const getTransactionHistory = async (req, res) => {
  const { userId } = req.params; 

  try {
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: 'No transaction history found.' });
    }

    return res.status(200).json({
      message: ' Transaction history retrieved successfully.',
      count: transactions.length,
      transactions,
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server error while retrieving transactions.' });
  }
};

const getDataHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const findData = await  DataHistory.find({ userId }).sort({ createdAt: -1 });

    if (!findData || findData.length ===  0) {
      return res.status(404).json({ message: 'No data history found.' });
    }

     return res.status(200).json({
      message: ' Data history retrieved successfully.',
      count: findData.length,
      findData,
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server error while retrieving data.' });
  }
}

module.exports = { getTransactionHistory, getDataHistory };
