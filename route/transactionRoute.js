// this file is in the route/transactionRoute
const express = require('express');
const router = express.Router();
const {getAllPrices} = require('../controller/pricesController')
const { getTransactionHistory, getDataHistory } = require('../controller/transactionsController');

router.get('/history/:userId', getTransactionHistory);
router.get('/dataHistory/:userId', getDataHistory);
router.get('/prices', getAllPrices);

module.exports = router;
