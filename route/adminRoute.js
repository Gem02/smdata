// this file is in the route/adminRoute

const express = require('express');
const router = express.Router();
const { 
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
} = require('../controller/adminController');
const {  updatePriceByKey, createPrice  } = require('../controller/pricesController');

const { verifyAdmin, verifySuperAdmin } = require('../middleware/adminMiddleware');

// ===== DASHBOARD ENDPOINTS =====
router.get('/dashboard/stats/:adminUserId', verifyAdmin, getDashboardStats);
router.get('/dashboard/daily/:adminUserId', verifyAdmin, getDailyStats);
router.get('/dashboard/weekly/:adminUserId', verifyAdmin, getWeeklyStats);

// ===== USER MANAGEMENT ENDPOINTS =====
router.get('/users/:adminUserId', verifyAdmin, getAllUsers);
router.get('/users/:userId/stats/:adminUserId', verifyAdmin, getUserStats);
router.patch('/updateUser/:adminUserId', verifyAdmin, updateUser);
router.delete('/deleteUser/:adminUserId', verifyAdmin, deleteUser);
router.post('/addBalance/:adminUserId', verifyAdmin, addAccountBalance);
router.post('/debitBalance/:adminUserId', verifyAdmin, debitAccountBalance);
router.post('/upgradeuser/:adminUserId', verifySuperAdmin, upgradeUser);
router.post('/downgradeuser/:adminUserId', verifySuperAdmin, downgradeUser);

// ===== TRANSACTION ENDPOINTS =====
router.get('/transactions/:adminUserId', verifyAdmin, getAllTransactions);

// ===== ORDER HISTORY ENDPOINTS =====
router.get('/orders/:adminUserId', verifyAdmin, getOrderHistory);
router.get('/orders/:orderId/:adminUserId', verifyAdmin, getOrderDetails);

// ===== PAYMENT HISTORY ENDPOINTS =====
router.get('/payments/:adminUserId', verifyAdmin, getPaymentHistory);
router.get('/payments/:paymentId/:adminUserId', verifyAdmin, getPaymentDetails);

// ===== PRICING ENDPOINTS =====
router.put('/prices/update/:adminUserId', verifyAdmin, updatePriceByKey);
router.post('/prices/create/:adminUserId', verifyAdmin, createPrice);

module.exports = router;
