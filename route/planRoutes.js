const express = require('express');
const router = express.Router();
const  { getAllPlans, getPlanById, getPlansByNetwork, createPlan, updatePlan, deletePlan, togglePlanStatus } = require('../controller/planController');
const { verifyAdmin } = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getAllPlans);
router.get('/network/:network', getPlansByNetwork);
router.get('/:id', getPlanById);

// Protected/Admin routes (add authentication middleware as needed)
router.post('/all/:adminUserId', verifyAdmin, createPlan);
router.put('/:id/:adminUserId', verifyAdmin, updatePlan);
router.delete('/:id/:adminUserId', verifyAdmin, deletePlan);
router.patch('/:id/toggle-status/:adminUserId', verifyAdmin, togglePlanStatus);

module.exports = router;

