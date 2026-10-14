const express = require("express");
const router = express.Router();
const {
  login,
  googleLogin,
  forgotPassword,
  verifyOtp,
  resetPasswordWithOtp,
  getMe
} = require("../controllers/authController");
const { validateLogin } = require("../middleware/validationMiddleware");
const { authenticate } = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", validateLogin, login);

// POST /api/auth/google
router.post("/google", googleLogin);

// POST /api/auth/forgot-password (Generate and send OTP)
router.post("/forgot-password", forgotPassword);

// POST /api/auth/verify-otp (Verify 6-digit OTP)
router.post("/verify-otp", verifyOtp);

// POST /api/auth/reset-password (Reset password using OTP)
router.post("/reset-password", resetPasswordWithOtp);

// GET /api/auth/me
router.get("/me", authenticate, getMe);

module.exports = router;
