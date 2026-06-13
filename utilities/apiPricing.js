const Pricing = require("../models/PricingModel");
const Wallet = require("../models/Wallet");
const { saveTransaction } = require("./saveTransaction");

const getServicePricing = async (serviceName) => {
  try {
    const pricing = await Pricing.findOne({ key: serviceName });

    if (!pricing || !pricing.prices || typeof pricing.prices.api !== "number") {
      throw new Error(`Pricing not found or incomplete for service: ${serviceName}`);
    }
    console.log(
      'the price is', pricing
    )
    return pricing;
  } catch (error) {
    console.error("Error in getServicePricing:", error.message);
    throw new Error("Error fetching pricing: " + error.message);
  }
};

const calculateBilling = async (serviceName, req) => {
  try {
    const pricing = await getServicePricing(serviceName);

    const sellingPrice = pricing.prices.api;

    if (typeof sellingPrice !== "number" || sellingPrice <= 0) {
      throw new Error(`Invalid API pricing for service: ${serviceName}`);
    }

    req.billing = {
      sellingPrice,
      currency: "NGN",
    };

    return req.billing;
  } catch (error) {
    console.error("Error in calculateBilling:", error.message);
    throw new Error("Billing error: " + error.message);
  }
};

const checkAPIBalance = async (userId, amount) => {
  try {
    const account = await Wallet.findOne({ user: userId });

    if (!account) {
      throw new Error("Virtual account not found");
    }

    if (account.balance < amount) {
      throw new Error("Insufficient balance");
    }

    return account;
  } catch (error) {
    console.error("Error in checkAPIBalance:", error.message);
    throw new Error("Balance check error: " + error.message);
  }
};

const deductAPIBalance = async (userId, amount, description) => {
  try {
    const account = await Wallet.findOne({ user: userId });

    if (!account) {
      throw new Error("Virtual account not found");
    }

    if (account.balance < amount) {
      throw new Error("Insufficient balance at deduction stage");
    }

    const oldBalance = account.balance;
    account.balance -= amount;
    const newBalance = account.balance;
    await account.save();

    await saveTransaction({
      user: userId,
      amount,
      transactionReference: `API-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      TransactionType: "API-Usage",
      type: "debit",
      description,
      oldBalance,
      newBalance,
    });

    return account.balance;
  } catch (error) {
    console.error("Error in deductAPIBalance:", error.message);
    throw new Error("Deduction error: " + error.message);
  }
};

module.exports = {
  getServicePricing,
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
};
