const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check Authorization header
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // 2. Check Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    // 3. Extract token
    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // 4. Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 5. Store authenticated user information
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error(
      "JWT verification error:",
      error.name,
      error.message
    );

    // Token expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired",
      });
    }

    // Token is invalid
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Unable to authenticate request",
    });
  }
};

module.exports = {
  authenticateToken,
};