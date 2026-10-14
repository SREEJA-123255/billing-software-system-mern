const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const { getCustomerHistory } = require("../controllers/customerHistoryController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("customers"));

router.get("/:id/history", getCustomerHistory);

module.exports = router;