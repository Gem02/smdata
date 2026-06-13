// this file is in the route/authRoutes
const express = require('express');
const { registerUser, login, logout, sendForgotPasswordCode, verifyCode, newPassword, loginAdmin } = require('../controller/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgotPassword', sendForgotPasswordCode);
router.post('/verifyCode', verifyCode);
router.post('/setPassword', newPassword);
router.post('/admin/login', loginAdmin);

module.exports = router;
