const TOPUP_FEE_RATE = 0.015;
const TOPUP_FEE_CAP = 50;

const calculateTopupFee = (amount) => {
  const value = Number(amount);
  if (isNaN(value) || value <= 0) {
    return 0;
  }

  const fee = value * TOPUP_FEE_RATE;
  return Number(Math.min(fee, TOPUP_FEE_CAP).toFixed(2));
};

module.exports = {
  TOPUP_FEE_RATE,
  TOPUP_FEE_CAP,
  calculateTopupFee,
};
