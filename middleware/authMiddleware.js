const jwt = require("jsonwebtoken")
const User = require("../models/User")


const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token =
      authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : req.headers.token || req.query.token

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        error: {
          code: "NO_TOKEN_PROVIDED",
          description:
            "Authentication token is required. Please include a valid JWT token in the Authorization header.",
        },
      })
    }

    try {
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token. User not found.",
          error: {
            code: "USER_NOT_FOUND",
            description: "The token is valid but the associated user account no longer exists.",
          },
        })
      }

      
      if (user.status && user.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "Account suspended",
          error: {
            code: "ACCOUNT_SUSPENDED",
            description: "Your account has been suspended. Please contact support for assistance.",
            contact_support: "support@ayverify.com.ng",
          },
        })
      }

      // Add user to request object
      req.user = user
      next()
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
          error: {
            code: "TOKEN_EXPIRED",
            description: "Your authentication token has expired. Please log in again.",
            expired_at: jwtError.expiredAt,
          },
        })
      }

      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          error: {
            code: "INVALID_TOKEN",
            description: "The provided token is malformed or invalid.",
          },
        })
      }

      throw jwtError
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: {
        code: "AUTH_ERROR",
        description: "An error occurred while verifying your authentication token.",
      },
    })
  }
}

// Verify admin role middleware
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: {
          code: "AUTHENTICATION_REQUIRED",
          description: "Please authenticate first before accessing admin resources.",
        },
      })
    }

    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
        error: {
          code: "INSUFFICIENT_PRIVILEGES",
          description: "This resource requires administrator privileges.",
        },
      })
    }

    next()
  } catch (error) {
    console.error("Admin verification error:", error)
    return res.status(500).json({
      success: false,
      message: "Authorization error",
      error: {
        code: "AUTHORIZATION_ERROR",
        description: "An error occurred while verifying your admin privileges.",
      },
    })
  }
}


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token =
      authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : req.headers.token || req.query.token

    if (!token) {
      req.user = null
      return next()
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")

      req.user = user || null
    } catch (jwtError) {
      req.user = null
    }

    next()
  } catch (error) {
    console.error("Optional auth error:", error)
    req.user = null
    next()
  }
}

const generateToken = (userId, expiresIn = "7d") => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn })
}

const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
        error: {
          code: "NO_REFRESH_TOKEN",
          description: "Refresh token is required to generate new access token.",
        },
      })
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
          error: {
            code: "INVALID_REFRESH_TOKEN",
            description: "The refresh token is invalid or the user no longer exists.",
          },
        })
      }

      req.user = user
      next()
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        error: {
          code: "REFRESH_TOKEN_INVALID",
          description: "The refresh token is invalid or has expired.",
        },
      })
    }
  } catch (error) {
    console.error("Refresh token verification error:", error)
    return res.status(500).json({
      success: false,
      message: "Token verification error",
      error: {
        code: "TOKEN_VERIFICATION_ERROR",
        description: "An error occurred while verifying the refresh token.",
      },
    })
  }
}

const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map()

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()

    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    const userAttempts = attempts.get(key)

    if (now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (userAttempts.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: "Too many authentication attempts",
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          description: `Too many authentication attempts. Please try again after ${Math.ceil((userAttempts.resetTime - now) / 60000)} minutes.`,
          retry_after: Math.ceil((userAttempts.resetTime - now) / 1000),
        },
      })
    }

    userAttempts.count++
    next()
  }
}


const checkResourceOwnership = (resourceModel, resourceIdParam = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam]
      const userId = req.user.id

      const resource = await resourceModel.findById(resourceId)

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
          error: {
            code: "RESOURCE_NOT_FOUND",
            description: "The requested resource does not exist.",
          },
        })
      }

      // Check if user owns the resource or is admin
      if (resource.user?.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            description: "You don't have permission to access this resource.",
          },
        })
      }

      req.resource = resource
      next()
    } catch (error) {
      console.error("Resource ownership check error:", error)
      return res.status(500).json({
        success: false,
        message: "Authorization error",
        error: {
          code: "AUTHORIZATION_ERROR",
          description: "An error occurred while checking resource permissions.",
        },
      })
    }
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
  optionalAuth,
  generateToken,
  verifyRefreshToken,
  authRateLimit,
  checkResourceOwnership,
}
