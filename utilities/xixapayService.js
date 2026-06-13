// services/xixapayService.js


class XIXAPayService {
  constructor() {
    this.apiKey = 'c6dfce16bec3e7fe4586bc975d2b396a0bb85d84';
    this.secretKey = '8e80e2e81cc3ae996ef98dba49e23a098da8a506218ca88b3ee5cd4a87e2d4f8cfba866aefdabb8072924804b57756ed0d393363e011c8a3bbc43379';
    this.baseURL = 'https://api.xixapay.com/v1';
  }

  async initiatePayment(paymentData) {
    try {
      const response = await axios.post(`${this.baseURL}/payment/initiate`, paymentData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Secret-Key': this.secretKey,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      try {
        
      } catch (error) {
        
      }
      console.error('XIXAPay Initiate Payment Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment initiation failed');
    }
  }

  async verifyPayment(reference) {
    try {
      const response = await axios.post(`${this.baseURL}/payment/verify`, 
        { reference },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Secret-Key': this.secretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('XIXAPay Verify Payment Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment verification failed');
    }
  }
}

module.exports = new XIXAPayService();