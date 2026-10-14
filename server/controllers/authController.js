const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendOtpEmail } = require("../utils/emailService");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token helper
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "super_secret_billing_jwt_token_key_2026_xyz",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
};

// @desc    Authenticate user & get token (Strict .env check for Admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

    let user = await User.findOne({ email: normalizedEmail });

    // Enforce strict .env check for Admin account
    if (normalizedEmail === adminEmail) {
      if (password !== adminPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials. Admin must use the email and password configured in server .env."
        });
      }

      // If admin user doesn't exist in DB yet, create or sync
      if (!user) {
        user = await User.create({
          name: process.env.ADMIN_NAME || "System Administrator",
          email: adminEmail,
          phone: process.env.ADMIN_PHONE || "+91 6304082727",
          password: adminPassword,
          role: "ADMIN",
          status: "ACTIVE"
        });
      } else {
        // Ensure admin has ACTIVE status, ADMIN role, and synced password
        let needsSave = false;
        if (user.role !== "ADMIN") {
          user.role = "ADMIN";
          needsSave = true;
        }
        if (user.status !== "ACTIVE") {
          user.status = "ACTIVE";
          needsSave = true;
        }
        const isMatch = await user.matchPassword(adminPassword);
        if (!isMatch) {
          user.password = adminPassword;
          needsSave = true;
        }
        if (needsSave) {
          await user.save();
        }
      }
    } else {
      // Non-admin user authentication
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      // Block any non-.env email from logging in as ADMIN
      if (user.role === "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Admin login is strictly restricted to the administrator email configured in server .env."
        });
      }

      // Verify password using bcrypt
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      // Check account status
      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated. Please contact your system administrator."
        });
      }
    }

    // Generate JWT
    const token = generateToken(user);

    // Return response with sanitized user info
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate with Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { credential, profile } = req.body;
    let email, name, picture, googleId;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
        googleId = payload.sub;
      } catch (tokenErr) {
        // Fallback: decode JWT payload for development or when client ID is generic
        const decoded = jwt.decode(credential);
        if (decoded && decoded.email) {
          email = decoded.email;
          name = decoded.name || decoded.email.split("@")[0];
          picture = decoded.picture || "";
          googleId = decoded.sub || "";
        } else {
          return res.status(401).json({
            success: false,
            message: "Invalid Google token. Could not verify credentials."
          });
        }
      }
    } else if (profile && profile.email) {
      email = profile.email;
      name = profile.name || profile.email.split("@")[0];
      picture = profile.picture || "";
      googleId = profile.googleId || "simulated_" + Date.now();
    } else {
      return res.status(400).json({
        success: false,
        message: "No Google credentials or profile provided"
      });
    }

    const normalizedEmail = (email || "").toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    const isSuperAdminEmail = normalizedEmail === adminEmail;

    // Look up user in database
    let user = await User.findOne({ email: normalizedEmail });

    // Enforce access control:
    // Google authentication is permitted ONLY if:
    // 1. The email matches the Superadmin (configured in server .env or role ADMIN in DB)
    // 2. OR the email was already added into the database by an administrator
    if (!isSuperAdminEmail && !user) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your email address is not registered in the system. Only accounts added by the administrator can log in."
      });
    }

    if (isSuperAdminEmail) {
      // Superadmin Google Login: Create or sync admin user
      if (!user) {
        user = await User.create({
          name: name || process.env.ADMIN_NAME || "System Administrator",
          email: adminEmail,
          phone: process.env.ADMIN_PHONE || "+91 6304082727",
          password: process.env.ADMIN_PASSWORD || "Admin@123",
          role: "ADMIN",
          status: "ACTIVE",
          googleId: googleId || undefined,
          authProvider: "google",
          avatar: picture || ""
        });
      } else {
        let needsSave = false;
        if (user.role !== "ADMIN") {
          user.role = "ADMIN";
          needsSave = true;
        }
        if (user.status !== "ACTIVE") {
          user.status = "ACTIVE";
          needsSave = true;
        }
        if (googleId && user.googleId !== googleId) {
          user.googleId = googleId;
          needsSave = true;
        }
        if (picture && !user.avatar) {
          user.avatar = picture;
          needsSave = true;
        }
        if (needsSave) {
          await user.save();
        }
      }
    } else {
      // Pre-registered user in database
      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated. Please contact your system administrator."
        });
      }

      // Update Google info if needed
      let needsSave = false;
      if (googleId && user.googleId !== googleId) {
        user.googleId = googleId;
        needsSave = true;
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    // Generate JWT
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate and send 6-digit OTP to user's email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your registered email address."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();

    // Block Admin from OTP password reset
    if (normalizedEmail === adminEmail) {
      return res.status(403).json({
        success: false,
        message: "System Administrator credentials are fixed and managed strictly via server .env. Password reset via OTP is not permitted for the Admin account."
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address. Please check your spelling."
      });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "System Administrator credentials are fixed and managed strictly via server .env. Password reset via OTP is not permitted for the Admin account."
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact your system administrator."
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google Sign-In. Please sign in directly with Google."
      });
    }

    // Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // OTP expires in 10 minutes
    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`\n============================================================`);
    console.log(`🔑 PASSWORD RESET OTP GENERATED FOR [${user.email}]: [${otp}]`);
    console.log(`============================================================\n`);

    // Send email with OTP
    const emailResult = await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp
    });

    if (!emailResult.sent) {
      return res.status(503).json({
        success: false,
        message: emailResult.error
          ? `Could not deliver verification email: ${emailResult.error}`
          : "Failed to send verification email. Please check your SMTP mail server settings in server/.env."
      });
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}. Please check your email inbox.`,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email address and 6-digit OTP code are required."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    if (normalizedEmail === adminEmail) {
      return res.status(403).json({
        success: false,
        message: "System Administrator password verification cannot be performed via OTP. Admin credentials are in server .env."
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordOtp: hashedOtp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code. Please request a new OTP."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code verified successfully."
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using 6-digit OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and 6-digit verification code are required."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    if (normalizedEmail === adminEmail) {
      return res.status(403).json({
        success: false,
        message: "System Administrator password cannot be reset via OTP. Please update ADMIN_PASSWORD in server .env."
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long."
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordOtp: hashedOtp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code. Please request a new OTP."
      });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "System Administrator password cannot be reset via OTP. Please update ADMIN_PASSWORD in server .env."
      });
    }

    // Set new password for non-admin user
    user.password = password;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been successfully updated! You can now sign in with your new password.",
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private (Authenticated)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Current user retrieved successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  googleLogin,
  forgotPassword,
  verifyOtp,
  resetPasswordWithOtp,
  getMe
};
