const ApiToken = require("../models/ApiToken");
const ApiUsage = require("../models/ApiUsage");
const rateLimit = require("express-rate-limit");
const validator = require('validator');

// Utility to get client IP properly
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress
  );
};

// API Authentication Middleware
const authenticateAPI = async (req, res, next) => {
  try {
    const apiKey = req.body.api_key;

    if (!apiKey  || !validator.escape(apiKey)) {
      return res.status(401).json({
        success: false,
        message: "API KEY IS REQUIRED.",
      });
    }

    const token = await ApiToken.findOne({ apiKey, isActive: true }).populate("user");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    token.usage.lastUsed = new Date();
    await token.save();

    req.apiToken = token;
    req.apiUser = token.user;
    req.apiKey = apiKey
    next();
  } catch (error) {
    console.error("API Auth Error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};


// API Rate Limiting Middleware (1 min window)
const createAPIRateLimit = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 80,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please check your API limits.",
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Usage tracking middleware
const trackUsage = (service) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalJson = res.json;

    res.json = function (data) {
      const responseTime = Date.now() - startTime;

      setImmediate(async () => {
        try {
          // Clone and sanitize request body
          const redactedBody = { ...req.body };
          if (redactedBody.pin) redactedBody.pin = "***";

          await ApiUsage.create({
            apiToken: req.apiToken._id,
            user: req.apiUser._id,
            service,
            requestData: {
              endpoint: req.originalUrl,
              method: req.method,
              requestBody: redactedBody,
              userAgent: req.get("User-Agent"),
              ipAddress: getClientIP(req),
            },
            response: {
              statusCode: res.statusCode,
              success: res.statusCode < 400,
              responseTime,
              errorMessage: res.statusCode >= 400 ? data.message : null,
            },
            billing: req.billing || {},
          });

          req.apiToken.usage.totalRequests += 1;
          if (res.statusCode < 400) {
            req.apiToken.usage.successfulRequests += 1;
          } else {
            req.apiToken.usage.failedRequests += 1;
          }

          await req.apiToken.save();
        } catch (error) {
          console.error("Usage tracking error:", error.message);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  authenticateAPI,
  createAPIRateLimit,
  trackUsage,
};
