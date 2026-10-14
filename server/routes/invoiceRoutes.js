const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoicePaymentStatus
} = require("../controllers/invoiceController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("invoices"));

router.post("/", createInvoice);
router.get("/", getInvoices);
router.patch("/:id/payment-status", updateInvoicePaymentStatus);
router.get("/:id", getInvoiceById);

module.exports = router;
