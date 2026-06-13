// this file is in the route/adminRoute

const express = require('express');
const router = express.Router();
const { getAllUsers, getAllTransactions, updateUser, deleteUser, addAccountBalance, debitAccountBalance, upgradeUser, downgradeUser } = require('../controller/adminController');
  const {  updatePriceByKey, createPrice  } = require('../controller/pricesController');

const { verifyAdmin, verifySuperAdmin } = require('../middleware/adminMiddleware');

router.get('/users/:adminUserId', verifyAdmin, getAllUsers);
router.get('/transactions/:adminUserId', verifyAdmin, getAllTransactions);
router.patch('/updateUser/:adminUserId',verifyAdmin, updateUser);
router.delete('/deleteUser/:adminUserId',verifyAdmin, deleteUser );
router.put('/prices/update/:adminUserId',verifyAdmin, updatePriceByKey);
router.post('/prices/create/:adminUserId',verifyAdmin, createPrice);
router.post('/addBalance/:adminUserId',verifyAdmin, addAccountBalance);
router.post('/debitBalance/:adminUserId',verifyAdmin, debitAccountBalance);
router.post('/upgradeuser/:adminUserId', verifySuperAdmin,  upgradeUser);
router.post('/downgradeuser/:adminUserId', verifySuperAdmin, downgradeUser );

module.exports = router;
