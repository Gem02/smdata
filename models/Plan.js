const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    network: {
        type: String,
        required: true,
        enum: ['MTN', 'AIRTEL', '9MOBILE', 'GLO'],
        uppercase: true
    },
    planId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    planName: {
        type: String,
        required: true,
        trim: true
    },
    validity: {
        type: String,
        required: true,
        trim: true
    },
    costPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    sellingPrice: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
});

module.exports = mongoose.model('Plan', planSchema);