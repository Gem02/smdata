const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controller/webhookController');

router.post('/monnify', handleWebhook);

module.exports = router;
