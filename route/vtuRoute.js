// this file is in the route/vtuRoute
const express = require('express');
const router = express.Router();
const { buyAirtime } = require('../controller/airtimeController');
const {buyData} = require('../controller/dataController');

router.post('/airtime', buyAirtime);
router.post('/data',  buyData);

module.exports = router;
