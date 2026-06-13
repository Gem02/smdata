const express = require('express');
const router = express.Router();
const {createAccount, getUserVirtualAccount } = require('../controller/monnifyAccountController');


router.post('/create/:userId', createAccount);

router.get('/:userId', getUserVirtualAccount);


module.exports = router;
