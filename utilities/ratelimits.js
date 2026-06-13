// this file is in the utilities/ratelimits

const rateLimit = require('express-rate-limit');


const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many request coming from this IP, please try again after 15 minutes.',
    headers: true
});

const registrationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 5, 
    message: 'Too many registration attempts from this IP, please try again after 15 minutes.',
    headers: true,
});

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 10, 
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    headers: true
});

const verifyEmailLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    message: 'Too many attempts coming from this IP, please try again after 15 minutes.',
    headers: true
});

module.exports = { globalLimiter, registrationLimiter, loginLimiter, verifyEmailLimiter };