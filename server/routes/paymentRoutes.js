const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment
} = require("../controllers/paymentController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("payments"));

router.post("/", createPayment);
router.get("/", getPayments);
router.get("/:id", getPaymentById);
router.put("/:id", updatePayment);
router.delete("/:id", deletePayment);

module.exports = router;