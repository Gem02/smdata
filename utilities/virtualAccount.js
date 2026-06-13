require('dotenv').config();
const { getMonnifyToken } = require('../config/monnifyToken');
const axios = require("axios");

async function createUserVirtualAccount(user) {
  try {
    const token = await getMonnifyToken();
    const baseUrl = process.env.MONNIFY_BASE_URL;

    const response = await axios.post(
      `${baseUrl}/api/v1/bank-transfer/reserved-accounts`,
      {
        accountReference: `user_${user._id}`, 
        accountName: `${user.firstName} ${user.lastName}`,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
        nin: user.nin || undefined 
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      }
    );

    return response.data.responseBody;

  } catch (error) {
    throw new Error("Failed to create virtual account");
  }
}

module.exports = { createUserVirtualAccount };
