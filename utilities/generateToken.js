const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateAccessToken = (id, email, role) => {
    return jwt.sign({id, email, role}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15m'});
}

const generateRefreshToken = (id, email, role) => {
    return jwt.sign({id, email, role}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '30d'});
}

module.exports = { generateAccessToken, generateRefreshToken };