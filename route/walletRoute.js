const express = require('express');
const router = express.Router();
const {getUserBalance, getUserTransactions, initiateTopup, handleXixapayWebhook} = require('../controller/walletController')


router.get('/balance/:userId', getUserBalance)
router.get('/transaction-history/:userId', getUserTransactions)

router.post('/topup/initiate/:userId', initiateTopup);
router.post('/webhook/xixapay', handleXixapayWebhook);

module.exports = router

