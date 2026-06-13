require('dotenv').config();
const axios = require('axios');

const checkNIN = async (nin) => {
  const base_url = process.env.PREMBLY_BASE_URL;

  try {

    const response = await axios.post(
      `${base_url}/identitypass/verification/vnin`,
      { number: nin },
      {
        headers: {
          'x-api-key': process.env.PREMBLY_API_KEY,
          'app-id': process.env.PREMBLY_APP_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;
    if (!result?.status || result.verification?.status !== 'VERIFIED') {
      throw new Error('❌ NIN verification failed');
    }

    return result.data;

  } catch (error) {
    const errData = error.response?.data || error.message;
    throw new Error(`❌ NIN verification error: ${JSON.stringify(errData)}`);
  }
};

module.exports = { checkNIN };
