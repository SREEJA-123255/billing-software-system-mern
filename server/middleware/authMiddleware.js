const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Authentication middleware to verify JWT
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. No token provided."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "super_secret_billing_jwt_token_key_2026_xyz"
    );

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or account removed."
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Access denied. Please contact admin."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again."
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token."
    });
  }
};

// Reusable role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${req.user.role}' is not authorized.`
      });
    }

    next();
  };
};

const { authorizeModule } = require("../config/permissions");

module.exports = {
  authenticate,
  authorizeRoles,
  authorizeModule
};
