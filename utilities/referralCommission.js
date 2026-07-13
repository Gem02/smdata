const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/transactions');

const REFERRAL_WINDOW_DAYS = Number(process.env.REFERRAL_WINDOW_DAYS || 50);
const REFERRAL_COMMISSION_RATE = Number(process.env.REFERRAL_COMMISSION_RATE || 0.05);

const isReferralEligible = (referredUser, now = new Date()) => {
  if (!referredUser || !referredUser.createdAt) {
    return false;
  }

  const createdAt = new Date(referredUser.createdAt);
  const currentTime = new Date(now);
  const diffInDays = (currentTime - createdAt) / (1000 * 60 * 60 * 24);

  return diffInDays <= REFERRAL_WINDOW_DAYS;
};

const calculateReferralCommission = (amount) => {
  const commission = Number(amount) * REFERRAL_COMMISSION_RATE;
  return Number(commission.toFixed(2));
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

    const commissionAmount = calculateReferralCommission(transactionAmount);
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
  REFERRAL_COMMISSION_RATE,
  isReferralEligible,
  calculateReferralCommission,
  awardReferralCommission,
};
