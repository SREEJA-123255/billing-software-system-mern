const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("dashboard"));

router.get("/", getDashboard);

module.exports = router;