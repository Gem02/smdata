const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/transactions');

const REFERRAL_WINDOW_DAYS = Number(process.env.REFERRAL_WINDOW_DAYS || 50);

// Fixed commission amounts per transaction type (in NGN)
const FIXED_COMMISSIONS = {
  'Wallet-Topup': Number(process.env.REFERRAL_WALLET_TOPUP || 5),
  'Data-Purchase': Number(process.env.REFERRAL_DATA || 1),
  'Airtime-Purchase': Number(process.env.REFERRAL_AIRTIME || 1),
};

const isReferralEligible = (referredUser, now = new Date()) => {
  if (!referredUser || !referredUser.createdAt) {
    return false;
  }

  const createdAt = new Date(referredUser.createdAt);
  const currentTime = new Date(now);
  const diffInDays = (currentTime - createdAt) / (1000 * 60 * 60 * 24);

  return diffInDays <= REFERRAL_WINDOW_DAYS;
};

const calculateReferralCommission = (amount, transactionType) => {
  // Use fixed commission based on transaction type. Amount is ignored for fixed scheme
  const fixed = FIXED_COMMISSIONS[transactionType] || 0;
  return Number(Number(fixed).toFixed(2));
};

const awardReferralCommission = async ({
  referredUserId,
  transactionAmount,
  transactionReference,
  transactionType,
  description,
}) => {
  try {
    const referredUser = await User.findById(referredUserId);
    if (!referredUser || !referredUser.referredBy || !isReferralEligible(referredUser)) {
      return { credited: false, reason: 'not-eligible' };
    }

    const commissionAmount = calculateReferralCommission(transactionAmount, transactionType);
    if (commissionAmount <= 0) {
      return { credited: false, reason: 'zero-amount' };
    }

    const commissionReference = `REF-${transactionReference}`;
    const existingCommission = await Transaction.findOne({ transactionReference: commissionReference });
    if (existingCommission) {
      return { credited: false, reason: 'already-awarded' };
    }

    const referrerWallet = await Wallet.findOne({ user: referredUser.referredBy });
    if (!referrerWallet) {
      return { credited: false, reason: 'wallet-not-found' };
    }

    const oldBalance = referrerWallet.balance;
    referrerWallet.balance += commissionAmount;
    const newBalance = referrerWallet.balance;

    referrerWallet.transactions.push({
      type: 'credit',
      amount: commissionAmount,
      description: `${description || 'Referral commission'} (${transactionType || 'transaction'})`,
      reference: commissionReference,
      paymentGateway: 'Referral',
      status: 'completed',
      oldBalance,
      newBalance,
    });

    await referrerWallet.save();

    await Transaction.create({
      user: referredUser.referredBy,
      amount: commissionAmount,
      transactionReference: commissionReference,
      TransactionType: 'Referral-Commission',
      type: 'credit',
      status: 'success',
      description: `${description || 'Referral commission'} for ${transactionType || 'transaction'}`,
      oldBalance,
      newBalance,
    });

    return { credited: true, amount: commissionAmount };
  } catch (error) {
    console.error('Referral commission error:', error);
    return { credited: false, reason: 'error', error: error.message };
  }
};

module.exports = {
  REFERRAL_WINDOW_DAYS,
  FIXED_COMMISSIONS,
  isReferralEligible,
  calculateReferralCommission,
  awardReferralCommission,
};
