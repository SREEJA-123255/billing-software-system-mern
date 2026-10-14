const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
} = require("../controllers/purchaseController");
const { validatePurchase } = require("../middleware/validatePurchase");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("purchases"));

router.post("/", validatePurchase, createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchaseById);
router.patch("/:id/status", updatePurchase);
router.put("/:id/status", updatePurchase);
router.put("/:id", validatePurchase, updatePurchase);
router.delete("/:id", deletePurchase);

module.exports = router;