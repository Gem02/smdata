const Plan = require('../models/Plan');


const getAllPlans = async (req, res) => {
    try {
        const plans = await Plan.find()
        
        const total = await Plan.countDocuments();
        
        res.status(200).json({
            success: true,
            count: plans.length,
            plans
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const getPlanById = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


const getPlansByNetwork = async (req, res) => {
    try {
        const network = req.params.network.toUpperCase();
        
        if (!['MTN', 'AIRTEL', '9MOBILE', 'GLO'].includes(network)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid network provider'
            });
        }
        
        const plans = await Plan.find({ network, isActive: true })
            .sort({ sellingPrice: 1 });
        
        res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


const createPlan = async (req, res) => {
    try {
        const { network, planId, planName, validity, costPrice, sellingPrice } = req.body;
        const finalSellingPrice = sellingPrice ?? 0;
        const finalCostPrice = costPrice ?? 0;
        
        // Check if planId already exists
        const existingPlan = await Plan.findOne({ planId });
        if (existingPlan) {
            return res.status(400).json({
                success: false,
                message: 'Plan ID already exists'
            });
        }
        
        // Validate network
        if (!['MTN', 'AIRTEL', '9MOBILE', 'GLO'].includes(network?.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid network provider'
            });
        }
        
        const plan = await Plan.create({
            network: network.toUpperCase(),
            planId,
            planName,
            validity,
            costPrice: finalCostPrice,
            sellingPrice: finalSellingPrice
        });
        
        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            data: plan
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating plan',
            error: error.message
        });
    }
};

const updatePlan = async (req, res) => {
    try {
        const { network, planId, planName, validity, costPrice, sellingPrice, price, isActive } = req.body;
        
        // Prepare update object with only provided fields
        const updateData = {};
        
        if (network) updateData.network = network.toUpperCase();
        if (planId) updateData.planId = planId;
        if (planName) updateData.planName = planName;
        if (validity) updateData.validity = validity;
        if (costPrice !== undefined) updateData.costPrice = costPrice;
        if (sellingPrice !== undefined) {
            updateData.sellingPrice = sellingPrice;
        } else if (price !== undefined) {
            updateData.sellingPrice = price;
        }
        if (isActive !== undefined) updateData.isActive = isActive;
        
        // Always update the timestamp
        updateData.updatedAt = Date.now();
        
        const plan = await Plan.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Plan updated successfully',
            data: plan
        });
    } catch (error) {
        console.log(error)
        res.status(400).json({
            success: false,
            message: 'Error updating plan',
            error: error.message
        });
    }
};


const deletePlan = async (req, res) => {
    try {
        const plan = await Plan.findByIdAndDelete(req.params.id);
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Plan deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


const togglePlanStatus = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }
        
        plan.isActive = !plan.isActive;
        await plan.save();
        
        res.status(200).json({
            success: true,
            message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`,
            data: plan
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating plan status',
            error: error.message
        });
    }
};
module.exports = { getAllPlans, getPlanById, getPlansByNetwork, createPlan, updatePlan, deletePlan, togglePlanStatus }