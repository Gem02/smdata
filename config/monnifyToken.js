require('dotenv').config();
const axios = require("axios");

async function getMonnifyToken() {
  try {
    const { MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_BASE_URL } = process.env;

    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY || !MONNIFY_BASE_URL) {
      throw new Error("Monnify credentials are missing in environment variables.");
    }

    const authString = `${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`;
    const encodedAuth = Buffer.from(authString).toString("base64");

    const response = await axios.post(
      `${MONNIFY_BASE_URL}/api/v1/auth/login`,
      {},
      {
        headers: {
          Authorization: `Basic ${encodedAuth}`,
          "Content-Type": "application/json"
        }
      }
    );

    const { requestSuccessful, responseBody } = response.data;

    if (!requestSuccessful || !responseBody?.accessToken) {
      throw new Error("Failed to retrieve access token from Monnify.");
    }

    console.log("✅ Token retrieved:", responseBody.accessToken);
    return responseBody.accessToken;

  } catch (error) {
    console.error("❌ Error fetching Monnify token:", error.response?.data || error.message);
    throw new Error("Could not authenticate with Monnify.");
  }
}

module.exports = { getMonnifyToken };
