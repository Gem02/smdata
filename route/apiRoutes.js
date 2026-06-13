const express = require("express");
const router = express.Router();

//  Middlewares
const {authenticateAPI,checkPermission,createAPIRateLimit,trackUsage} = require("../middleware/apiAuth");

//  Pricing utilities (can be used inside controllers)
const {calculateBilling,checkAPIBalance,deductAPIBalance,} = require("../utilities/apiPricing");

//  Controllers
const { verifyNinAPI } = require("../controller/api/ninApiController");
const { verifyBvnAPI } = require("../controller/api/bvnApiController");
const { checkStatusIPEAPI } = require("../controller/api/ipeApiController");
const { submitIPEAPI } = require('../controller/api/ipeSubmissionController')
const { buyAirtimeAPI } = require("../controller/api/airtimeApiController");
const { buyDataAPI } = require("../controller/api/dataApiController");
const { demographicAPI } = require("../controller/api/demoApiController");
const { personalizationAPI } = require("../controller/api/personalizationApiController");

//  Global API middleware
router.use(authenticateAPI);
router.use(createAPIRateLimit());

/**
 * Helper to register routes
 */
const applyRoute = (path, service, handler) => {
  router.post(path,  trackUsage(service), handler);
};

//  Verification APIs
applyRoute("/verify/nin", "nin_verification", verifyNinAPI);
applyRoute("/verify/bvn", "bvn_verification", verifyBvnAPI);
applyRoute("/verify/submit-ipe", "ipe_verification", submitIPEAPI);
applyRoute("/verify/check-ipe", "ipe_verification", checkStatusIPEAPI);
applyRoute("/verify/demographic", "demographic", demographicAPI);
applyRoute("/verify/personalization", "personalization", personalizationAPI);

//  VTU APIs
applyRoute("/vtu/airtime", "airtime", buyAirtimeAPI);
applyRoute("/vtu/data", "data", buyDataAPI);

module.exports = router;
