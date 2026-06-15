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

// ===== DASHBOARD STATISTICS ENDPOINTS =====

/**
 * Get Dashboard Statistics
 * Returns: Total Users, Active Users, Total Funds, New Users (Today)
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Users Count
    const totalUsers = await UserModel.countDocuments();

    // Active Users (logged in today)
    const activeUsers = await UserModel.countDocuments({
      lastLogin: { $gte: today }
    });

    // New Users Registered Today
    const newUsersToday = await UserModel.countDocuments({
      createdAt: { $gte: today }
    });

    // Total Funds in System (sum of all wallet balances)
    const wallets = await Wallet.find();
    const totalFunds = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalFunds,
        newUsersToday,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching dashboard stats',
      error: error.message 
    });
  }
};

/**
 * Get Daily Statistics
 * Returns: Users registered, transactions, funds for each day in the last 7 days
 */
const getDailyStats = async (req, res) => {
  try {
    const dailyStats = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const usersCount = await UserModel.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });

      const transactionsCount = await TransactionModel.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });

      const transactions = await TransactionModel.find({
        createdAt: { $gte: date, $lt: nextDate }
      });

      const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        usersRegistered: usersCount,
        transactionsCount,
        totalTransactionAmount: totalAmount
      });
    }

    res.status(200).json({
      success: true,
      data: dailyStats.reverse()
    });
  } catch (error) {
    console.error('Daily stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching daily stats',
      error: error.message 
    });
  }
};

/**
 * Get Weekly Statistics
 * Returns: Users registered, transactions, funds for each week in the last 4 weeks
 */
const getWeeklyStats = async (req, res) => {
  try {
    const weeklyStats = [];
    
    for (let i = 0; i < 4; i++) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (i * 7));
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const usersCount = await UserModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const transactionsCount = await TransactionModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const transactions = await TransactionModel.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const weekStart = startDate.toISOString().split('T')[0];
      const weekEnd = endDate.toISOString().split('T')[0];

      weeklyStats.push({
        week: `${weekStart} to ${weekEnd}`,
        usersRegistered: usersCount,
        transactionsCount,
        totalTransactionAmount: totalAmount
      });
    }

    res.status(200).json({
      success: true,
      data: weeklyStats.reverse()
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching weekly stats',
      error: error.message 
    });
  }
};

// ===== ORDER HISTORY ENDPOINTS =====

/**
 * Get Order History (VTU/Data purchases)
 * Filters transactions by TransactionType 'order'
 * Returns: Transaction ID, Network, Type, Amount, Phone, Agent Phone, Status, Previous/New Balance, Date
 */
const getOrderHistory = async (req, res) => {
  try {
    const { limit = 50, skip = 0, network, status } = req.query;

    const query = { 
      TransactionType: 'order'
    };

    if (network) {
      query.network = network.toUpperCase();
    }

    if (status) {
      query.status = status;
    }

    const orders = await TransactionModel.find(query)
      .populate('user', 'fullName phone email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await TransactionModel.countDocuments(query);

    const formattedOrders = orders.map(order => ({
      transactionId: order.transactionReference,
      userId: order.user?._id,
      userName: order.user?.fullName || '',
      userEmail: order.user?.email,
      userPhone: order.phone || order.user?.phone,
      network: order.network || 'N/A',
      type: 'data', // Can be 'data' or 'airtime'
      amount: order.amount,
      agentPhone: order.agentPhone || 'N/A',
      status: order.status,
      previousBalance: order.oldBalance,
      newBalance: order.newBalance,
      date: order.createdAt,
      description: order.description
    }));

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      total,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Order history error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching order history',
      error: error.message 
    });
  }
};

/**
 * Get Single Order Details
 */
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await TransactionModel.findOne({ 
      transactionReference: orderId,
      TransactionType: 'order'
    }).populate('user', 'fullName phone email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const formattedOrder = {
      transactionId: order.transactionReference,
      userId: order.user?._id,
      userName: order.user?.fullName || '',
      userEmail: order.user?.email,
      userPhone: order.phone || order.user?.phone,
      network: order.network || 'N/A',
      type: 'data',
      amount: order.amount,
      agentPhone: order.agentPhone || 'N/A',
      status: order.status,
      previousBalance: order.oldBalance,
      newBalance: order.newBalance,
      date: order.createdAt,
      description: order.description
    };

    res.status(200).json({
      success: true,
      data: formattedOrder
    });
  } catch (error) {
    console.error('Order details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching order details',
      error: error.message 
    });
  }
};

// ===== PAYMENT HISTORY ENDPOINTS =====

/**
 * Get Payment History (Wallet top-ups/credits)
 * Filters transactions by TransactionType 'payment'
 * Returns: Amount, Transaction ID, Agent Phone, Status, Previous/New Balance, Date
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { limit = 50, skip = 0, status, type } = req.query;

    const query = { 
      TransactionType: 'payment'
    };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type; // 'credit' or 'debit'
    }

    const payments = await TransactionModel.find(query)
      .populate('user', 'fullName phone email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await TransactionModel.countDocuments(query);

    const formattedPayments = payments.map(payment => ({
      transactionId: payment.transactionReference,
      userId: payment.user?._id,
      userName: payment.user?.fullName || '',
      userEmail: payment.user?.email,
      agentPhone: payment.phone || payment.user?.phone,
      amount: payment.amount,
      transactionType: payment.type, // 'credit' or 'debit'
      status: payment.status,
      previousBalance: payment.oldBalance,
      newBalance: payment.newBalance,
      date: payment.createdAt,
      description: payment.description
    }));

    res.status(200).json({
      success: true,
      count: formattedPayments.length,
      total,
      data: formattedPayments
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching payment history',
      error: error.message 
    });
  }
};

/**
 * Get Single Payment Details
 */
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await TransactionModel.findOne({ 
      transactionReference: paymentId,
      TransactionType: 'payment'
    }).populate('user', 'fullName phone email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const formattedPayment = {
      transactionId: payment.transactionReference,
      userId: payment.user?._id,
      userName: payment.user?.fullName || ''  ,
      userEmail: payment.user?.email,
      agentPhone: payment.phone || payment.user?.phone,
      amount: payment.amount,
      transactionType: payment.type,
      status: payment.status,
      previousBalance: payment.oldBalance,
      newBalance: payment.newBalance,
      date: payment.createdAt,
      description: payment.description
    };

    res.status(200).json({
      success: true,
      data: formattedPayment
    });
  } catch (error) {
    console.error('Payment details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching payment details',
      error: error.message 
    });
  }
};

/**
 * Get User Statistics
 * Returns details about a specific user including total spent, transactions, etc.
 */
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const wallet = await Wallet.findOne({ user: userId });

    const allTransactions = await TransactionModel.find({ user: userId });
    const orderTransactions = await TransactionModel.find({ 
      user: userId, 
      TransactionType: 'order' 
    });
    const paymentTransactions = await TransactionModel.find({ 
      user: userId, 
      TransactionType: 'payment' 
    });

    const totalSpent = orderTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalCredit = paymentTransactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        currentBalance: wallet?.balance || 0,
        role: user.role,
        isVerified: user.isVerified,
        isLocked: user.isLocked,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        transactionStats: {
          totalTransactions: allTransactions.length,
          totalOrders: orderTransactions.length,
          totalPayments: paymentTransactions.length,
          totalSpent,
          totalCredit
        }
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user stats',
      error: error.message 
    });
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
  getDashboardStats,
  getDailyStats,
  getWeeklyStats,
  getOrderHistory,
  getOrderDetails,
  getPaymentHistory,
  getPaymentDetails,
  getUserStats
};
