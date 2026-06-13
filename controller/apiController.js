const ApiToken = require("../models/ApiToken")
const Pricing = require("../models/PricingModel")
const ApiUsage = require("../models/ApiUsage")
const User = require("../models/User")

// Generate new API token
const generateApiToken = async (req, res) => {
  try {
    const {userId } = req.body;

    const apiToken = new ApiToken({
      user: userId
    })

    apiToken.generateKeys()
    await apiToken.save()

    console.log("API token created successfully", apiToken);
    return res.status(200).json({
      message: "API token created successfully",
      token: {
        id: apiToken._id,
        tokenName: apiToken.tokenName,
        apiKey: apiToken.apiKey,
        secretKey: apiToken.secretKey,
        permissions: apiToken.permissions,
        rateLimit: apiToken.rateLimit,
        createdAt: apiToken.createdAt,
      },
    })
  } catch (error) {
    console.error("Generate API token error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get user's API tokens (without secret keys)
const getUserApiTokens = async (req, res) => {
  try {
    const userId = req.user.id

    const tokens = await ApiToken.find({ user: userId }).select("-secretKey").sort({ createdAt: -1 })

    res.json({
      tokens: tokens.map((token) => ({
        id: token._id,
        tokenName: token.tokenName,
        apiKey: token.apiKey,
        permissions: token.permissions,
        isActive: token.isActive,
        rateLimit: token.rateLimit,
        usage: token.usage,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
      })),
    })
  } catch (error) {
    console.error("Get API tokens error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update API token
const updateApiToken = async (req, res) => {
  try {
    const { tokenId } = req.params
    const { tokenName, permissions, rateLimit, ipWhitelist, isActive } = req.body
    const userId = req.user.id

    const token = await ApiToken.findOne({ _id: tokenId, user: userId })
    if (!token) {
      return res.status(404).json({ message: "API token not found" })
    }

    // Update fields
    if (tokenName) token.tokenName = tokenName
    if (permissions) token.permissions = permissions
    if (rateLimit) token.rateLimit = { ...token.rateLimit, ...rateLimit }
    if (ipWhitelist !== undefined) token.ipWhitelist = ipWhitelist
   
    if (isActive !== undefined) token.isActive = isActive

    await token.save()

    res.json({
      message: "API token updated successfully",
      token: {
        id: token._id,
        tokenName: token.tokenName,
        apiKey: token.apiKey,
        permissions: token.permissions,
        isActive: token.isActive,
        rateLimit: token.rateLimit,
        usage: token.usage,
      },
    })
  } catch (error) {
    console.error("Update API token error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete API token
const deleteApiToken = async (req, res) => {
  try {
    const { tokenId } = req.params
    const userId = req.user.id

    const token = await ApiToken.findOneAndDelete({ _id: tokenId, user: userId })
    if (!token) {
      return res.status(404).json({ message: "API token not found" })
    }

    res.json({ message: "API token deleted successfully" })
  } catch (error) {
    console.error("Delete API token error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get API usage analytics
const getApiUsage = async (req, res) => {
  try {
    const userId = req.user.id
    const { tokenId, startDate, endDate, service } = req.query

    const query = { user: userId }

    if (tokenId) query.apiToken = tokenId
    if (service) query.service = service
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = new Date(startDate)
      if (endDate) query.timestamp.$lte = new Date(endDate)
    }

    const usage = await ApiUsage.find(query)
      .populate("apiToken", "tokenName apiKey")
      .sort({ timestamp: -1 })
      .limit(1000)

    // Calculate summary stats
    const stats = {
      totalRequests: usage.length,
      successfulRequests: usage.filter((u) => u.response.success).length,
      failedRequests: usage.filter((u) => !u.response.success).length,
      totalCost: usage.reduce((sum, u) => sum + (u.billing.sellingPrice || 0), 0),
      averageResponseTime: usage.reduce((sum, u) => sum + (u.response.responseTime || 0), 0) / usage.length || 0,
    }

    res.json({
      usage,
      stats,
    })
  } catch (error) {
    console.error("Get API usage error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get available services and pricing
const getApiPricing = async (req, res) => {
  try {
    const pricing = await Pricing.find({ isActive: true }).select(
      "serviceName displayName description pricing metadata",
    )

    res.json({
      services: pricing.map((p) => ({
        service: p.serviceName,
        name: p.displayName,
        description: p.description,
        price: p.pricing.sellingPrice,
        currency: p.pricing.currency,
        category: p.metadata.category,
      })),
    })
  } catch (error) {
    console.error("Get API pricing error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

module.exports = {
  generateApiToken,
  getUserApiTokens,
  updateApiToken,
  deleteApiToken,
  getApiUsage,
  getApiPricing,
}
