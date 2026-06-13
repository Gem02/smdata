const express = require('express');
const router = express.Router();
const { submitBvnModification, getUserSubmissions, adminUpdates } = require('../controller/bvnModification');
const { verifyAdmin} = require('../middleware/adminMiddleware');


router.post('/', submitBvnModification,);
router.get('/my-submissions/:userId', getUserSubmissions);
router.put('/update/:adminUserId/:modificationId', verifyAdmin, adminUpdates)


module.exports = router;