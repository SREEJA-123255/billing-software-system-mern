const User = require("../models/User");

// @desc    Create a new user
// @route   POST /api/users
// @access  Private / ADMIN only
const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, status } = req.body;

    // Disallow creating additional ADMIN accounts; only .env governs the System Administrator
    if (role === "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "The System Administrator account is configured strictly via server .env. Additional users can only be registered with roles MANAGER, CASHIER, or STAFF."
      });
    }

    // Check if user with same email exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email address is already registered"
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: role || "STAFF",
      status: status || "ACTIVE"
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with search, role filter, status filter, and pagination
// @route   GET /api/users
// @access  Private / ADMIN only
const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search filter across name, email, phone
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Role filter
    if (role && role !== "ALL") {
      query.role = role;
    }

    // Status filter
    if (status && status !== "ALL") {
      query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private / ADMIN only
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private / ADMIN only
const updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, status, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    const isTargetAdmin = user.role === "ADMIN" || user.email.toLowerCase().trim() === adminEmail;

    // Guardrails for Admin: credentials and role are strictly managed via server .env
    if (isTargetAdmin) {
      if (email && email.toLowerCase().trim() !== adminEmail) {
        return res.status(400).json({
          success: false,
          message: "The System Administrator email is managed strictly via server .env and cannot be changed here."
        });
      }
      if (role && role !== "ADMIN") {
        return res.status(400).json({
          success: false,
          message: "The System Administrator role cannot be changed."
        });
      }
      if (status && status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "The System Administrator account cannot be deactivated."
        });
      }
      if (password && password.trim()) {
        return res.status(400).json({
          success: false,
          message: "The System Administrator password must be changed directly in the server .env file."
        });
      }
    }

    // If non-admin user is attempting to change their role to ADMIN
    if (!isTargetAdmin && role === "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Cannot elevate account to ADMIN. The System Administrator is configured exclusively via server .env."
      });
    }

    // If email is changing, check uniqueness
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: req.params.id }
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email address is already registered"
        });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (!isTargetAdmin && role !== undefined) user.role = role;
    if (!isTargetAdmin && status !== undefined) {
      // Prevent deactivating own account
      if (req.user._id.toString() === user._id.toString() && status === "INACTIVE") {
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own administrative account"
        });
      }
      user.status = status;
    }

    if (!isTargetAdmin && password && password.trim()) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft activate / deactivate user status
// @route   PATCH /api/users/:id/status
// @access  Private / ADMIN only
const toggleUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    if (user.role === "ADMIN" || user.email.toLowerCase().trim() === adminEmail) {
      return res.status(400).json({
        success: false,
        message: "The System Administrator account cannot be deactivated. It is governed strictly by server .env."
      });
    }

    // Prevent deactivating own account
    if (req.user._id.toString() === user._id.toString() && status === "INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own administrative account"
      });
    }

    user.status = status;
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      success: true,
      message: `User status successfully updated to ${status}`,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/:id
// @access  Private / ADMIN only
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    if (user.role === "ADMIN" || user.email.toLowerCase().trim() === adminEmail) {
      return res.status(400).json({
        success: false,
        message: "The System Administrator account cannot be deleted."
      });
    }

    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account."
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser
};
