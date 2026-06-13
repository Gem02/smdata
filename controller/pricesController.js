const ServicePricing = require("../models/PricingModel");

const getAllPrices = async (req, res) => {
  try {
    const prices = await ServicePricing.find();
    res.status(200).json(prices);
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updatePriceByKey = async (req, res) => {
  try {
    const {key, agent, api } = req.body;

    // Validate input
    if (agent === undefined || api === undefined) {
      return res.status(400).json({ message: "Agent and API prices are required" });
    }

    const updated = await ServicePricing.findOneAndUpdate(
      { key },
      { $set: { "prices.agent": agent, "prices.api": api } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({ message: "Price updated", data: updated });
  } catch (error) {
    console.error("Error updating price:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createPrice = async (req, res) => {
  try {
    const { service, key, prices } = req.body;

    if (!service || !key || !prices || prices.agent === undefined || prices.api === undefined) {
      return res.status(400).json({ message: "Service, key, agent and API prices are required" });
    }

    // Check for duplicate key
    const exists = await ServicePricing.findOne({ key });
    if (exists) {
      return res.status(409).json({ message: "A Price already exist for this service" });
    }

    const newPrice = new ServicePricing({ service, key, prices });
    await newPrice.save();

    res.status(200).json({ message: "Price created successfully", newPrice });
  } catch (error) {
    console.error("Error creating price:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllPrices,
  updatePriceByKey,
  createPrice
};
