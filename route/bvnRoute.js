// this file is in the route/bvnRoute

const express = require('express');
const router = express.Router();
const { submitBvnData } = require('../controller/bvnRegController');
const { submitBvnLicense, getAllBvnLicence } = require('../controller/bvnLicenseController')

router.post('/register', submitBvnData);
router.post('/licence', submitBvnLicense);
router.get('/licence/:userId', getAllBvnLicence);

module.exports = router;