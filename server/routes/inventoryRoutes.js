const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    getInventoryItems,
    getInventoryItemById,
    getLowStockItems,
    getInventorySummary,
    createInventoryItem,
    createInventoryItems,
    updateInventoryItem,
    adjustInventory,
    deleteInventoryItem
} = require("../controllers/inventoryController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("inventory"));

router.get("/summary", getInventorySummary);
router.get("/low-stock", getLowStockItems);
router.get("/", getInventoryItems);
router.get("/:id", getInventoryItemById);

router.post("/", createInventoryItem);
router.post("/bulk", createInventoryItems);

router.patch("/adjust", adjustInventory);
router.patch("/:id/adjust", adjustInventory);
router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

module.exports = router;
