const express = require("express");
const router = express.Router();
const {
  getBusiness,
  updateBusiness
} = require("../controllers/businessController");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const uploadLogo = require("../middleware/uploadMiddleware");
const {
  validateBusinessSettings
} = require("../middleware/validationMiddleware");

router.use(authenticate);
router.use(authorizeModule("business"));

// GET /api/business - Accessible to all authenticated users (Team 1, Team 4 for invoices, etc.)
router.get("/", getBusiness);

// PUT /api/business - Only ADMIN can update business settings and logo
router.put(
  "/",
  uploadLogo.single("logo"),
  validateBusinessSettings,
  updateBusiness
);

module.exports = router;
