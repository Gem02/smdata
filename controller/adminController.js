// this file is in the controller/adminController

const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const TransactionModel = require('../models/transactions');
const UserModel = require('../models/User');
const VirtualAccount = require('../models/VirtualAccountModel');
const validator = require('validator');
const {sendStatusUpdateEmail} = require('../utilities/emailTemplate');

const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select('-password');

    const wallets = await Wallet.find();

    const walletMap = {};
    wallets.forEach((wallet) => {
      if (wallet.user) {
        walletMap[wallet.user.toString()] = {
          balance: wallet.balance || 0,
          currency: wallet.currency || "NGN",
          role: wallet.role || "user",
          transactions: wallet.transactions || []
        };
      }
    });

    const usersWithWallets = users.map(user => {
      const walletDetails = walletMap[user._id.toString()] || {};
      return {
        ...user.toObject(),
        balance: walletDetails.balance || 0,
        currency: walletDetails.currency || "NGN",
        walletRole: walletDetails.role || "user",
        transactionCount: walletDetails.transactions ? walletDetails.transactions.length : 0
      };
    });

    res.json(usersWithWallets);
  } catch (err) {
    console.error('Error fetching users with wallets:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const addAccountBalance = async (req, res) => {
  try {
    const { phone, userId, amount } = req.body;

    
    if ( !userId || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const account = await Wallet.findOne({ user: userId });

    if (!account) {
      return res.status(404).json({ message: 'Wallet not found for this user' });
    }

    // if (account.customerPhone && account.customerPhone !== phone) {
    //   return res.status(403).json({ message: 'Phone number mismatch' });
    // }

    account.balance += Number(amount);
    await account.save();

    return res.status(200).json({
      message: 'Balance updated successfully',
      newBalance: account.balance,
    });
  } catch (error) {
    console.error('Error adding account balance:', error);
    return res.status(500).json({ message: 'Server error updating balance' });
  }
};

const debitAccountBalance = async (req, res) => {
  try {
    const { phone, userId, amount } = req.body;

    
    if (!userId || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const account = await Wallet.findOne({ user: userId });

    if (!account) {
      return res.status(404).json({ message: 'Virtual account not found for this user' });
    }

    // if (account.customerPhone && account.customerPhone !== phone) {
    //   return res.status(403).json({ message: 'Phone number mismatch' });
    // }

    account.balance -= Number(amount);
    await account.save();

    return res.status(200).json({
      message: 'Balance debited successfully',
      newBalance: account.balance,
    });
  } catch (error) {
    console.error('Error debiting account balance:', error);
    return res.status(500).json({ message: 'Server error updating balance' });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await TransactionModel.find().sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId, fullName, email, phone } = req.body;

    const allowedUpdates = {};
    if (fullName) allowedUpdates.fullName = fullName;
    if (email) allowedUpdates.email = email;
    if (phone) allowedUpdates.phoneNumber = phone;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const upgradeUser = async (req, res) => {
  const { userId } = req.body;

  // ✅ Validate input
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Valid userId is required.' });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'User is already an admin.' });
    }

    user.role = 'admin';
    await user.save();

    const { password, ...userData } = user.toObject();

    return res.status(200).json({
      message: 'User upgraded to admin successfully.',
      user: userData,
    });

  } catch (error) {
    console.error('Upgrade User Error:', error);
    return res.status(500).json({ message: 'Server error while upgrading user.' });
  }
};

const downgradeUser = async (req, res) => {
  const { userId } = req.body;

  // ✅ Validate input
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Valid userId is required.' });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'user') {
      return res.status(400).json({ message: 'User is already at the lowest role.' });
    }

    user.role = 'user';
    await user.save();

    const { password, ...userData } = user.toObject();

    return res.status(200).json({
      message: 'User downgraded to user successfully.',
      user: userData,
    });

  } catch (error) {
    console.error('Downgrade User Error:', error);
    return res.status(500).json({ message: 'Server error while downgrading user.' });
  }
};

const deleteUser = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await UserModel.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
  getAllUsers,
  getAllTransactions,
  updateUser,
  deleteUser,
  addAccountBalance,
  debitAccountBalance,
  upgradeUser,
  downgradeUser,
};
