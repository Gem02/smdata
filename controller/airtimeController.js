require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const { saveTransaction } = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'AIRTIME-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const buyAirtime = async (req, res) => {
  const { network, amount, phone, userId } = req.body;
  console.log("Airtime Request:", req.body);

  try {
    // Input validation
    const cleanPhone = validator.escape(phone || '');
    if (!cleanPhone || !validator.isMobilePhone(cleanPhone, 'en-NG')) {
      return res.status(400).json({ message: 'Please provide a valid Nigerian phone number.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // Validate network based on PeyFlex documentation
    const validNetworks = ['mtn', 'glo', '9mobile', 'airtel'];
    if (!network || !validNetworks.includes(network.toLowerCase())) {
      return res.status(400).json({ 
        message: 'Invalid network. Must be: mtn, glo, 9mobile, or airtel'
      });
    }

    // Check user balance
    const userAcc = await balanceCheck(userId, amount);
    console.log("User balance before deduction:", userAcc.balance);

    // Get PeyFlex credentials from environment
    const peyflexToken = process.env.PEYFLEX_TOKEN; // Your PeyFlex API token
    const peyflexBaseUrl = process.env.PEYFLEX_BASE_URL || 'https://client.peyflex.com.ng';

    // Prepare payload EXACTLY as shown in PeyFlex documentation
    const payload = {
      network: network.toLowerCase(), // Use exactly as in docs
      amount: Number(amount),
      mobile_number: cleanPhone
    };

    console.log('Sending to PeyFlex:', { 
      url: `${peyflexBaseUrl}/api/airtime/topup/`,
      payload: payload
    });

    // Make API call to PeyFlex - EXACTLY as in their documentation
    const response = await axios.post(
      `${peyflexBaseUrl}/api/airtime/topup/`,
      payload,
      {
        headers: {
          'Authorization': `Token ${peyflexToken}`, // As shown in docs
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const result = response.data;

    console.log('PeyFlex Response:', result);

    // Check response - adjust based on actual PeyFlex response format
    // Typically returns status or success field
    if (result.status !== 'success' && result.success !== true) {
      console.log('PeyFlex transaction failed:', result);
      return res.status(400).json({ 
        message: result.message || 'Airtime purchase failed from PeyFlex',
        data: result 
      });
    }

    // Capture old balance before deduction
    const oldBalance = userAcc.balance;

    // Deduct from user's balance
    userAcc.balance -= amount;
    const newBalance = userAcc.balance;
    await userAcc.save();

    // Save transaction
    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference: generateTransactionRef(),
      TransactionType: 'Airtime-Purchase',
      type: 'debit',
      description: `Airtime purchase via PeyFlex: ${network.toUpperCase()} - ${cleanPhone}`,
      phone: cleanPhone,
      oldBalance,
      newBalance,
      providerResponse: result,
      provider: 'PeyFlex'
    });

    return res.status(200).json({
      success: true,
      message: 'Airtime purchased successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('PeyFlex Airtime Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });

    // Handle PeyFlex specific errors
    let errorMessage = 'Server error during airtime purchase';
    let statusCode = 500;

    if (error.response) {
      statusCode = error.response.status;
      
      if (statusCode === 401) {
        errorMessage = 'Invalid PeyFlex API token';
      } else if (statusCode === 400) {
        errorMessage = error.response.data?.message || 'Invalid request to PeyFlex';
      } else if (statusCode === 403) {
        errorMessage = 'Insufficient balance on PeyFlex account';
      } else if (statusCode === 429) {
        errorMessage = 'Too many requests to PeyFlex';
      }
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to PeyFlex service';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout with PeyFlex';
    }

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.response?.data || error.message
    });
  }
};

module.exports = { buyAirtime };