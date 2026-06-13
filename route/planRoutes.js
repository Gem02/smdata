const express = require('express');
const router = express.Router();
const  { getAllPlans, getPlanById, getPlansByNetwork, createPlan, updatePlan, deletePlan, togglePlanStatus } = require('../controller/planController');

// Public routes
router.get('/', getAllPlans);
router.get('/network/:network', getPlansByNetwork);
router.get('/:id', getPlanById);

// Protected/Admin routes (add authentication middleware as needed)
router.post('/', createPlan); // Add auth middleware
router.put('/:id', updatePlan); // Add auth middleware
router.delete('/:id', deletePlan); // Add auth middleware
router.patch('/:id/toggle-status', togglePlanStatus); // Add auth middleware

module.exports = router;

