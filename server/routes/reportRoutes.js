const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    getSalesReport,
    getPurchaseReport,
    getExpenseReport,
    getProfitReport,
    getStockReport
} = require("../controllers/reportController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("reports"));

router.get("/sales", getSalesReport);
router.get("/purchases", getPurchaseReport);
router.get("/expenses", getExpenseReport);
router.get("/profit", getProfitReport);
router.get("/stock", getStockReport);

module.exports = router;
