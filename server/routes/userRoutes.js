const express = require("express");
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser
} = require("../controllers/userController");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
  validateUserCreate,
  validateUserUpdate,
  validateStatusToggle
} = require("../middleware/validationMiddleware");

// All user management routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorizeModule("users"));

// POST /api/users - Create new user
router.post("/", validateUserCreate, createUser);

// GET /api/users - Get all users with search, filter, pagination
router.get("/", getUsers);

// GET /api/users/:id - Get user by ID
router.get("/:id", getUserById);

// PUT /api/users/:id - Update user details
router.put("/:id", validateUserUpdate, updateUser);

// PATCH /api/users/:id/status - Soft toggle user status
router.patch("/:id/status", validateStatusToggle, toggleUserStatus);

// DELETE /api/users/:id - Delete user
router.delete("/:id", deleteUser);

module.exports = router;
