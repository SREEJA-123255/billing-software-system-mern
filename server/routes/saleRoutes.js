const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const validateSale = require("../middleware/validateSale");
const checkStock = require("../middleware/checkStock");
const { createSale, getSales, getSaleById } = require("../controllers/saleController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("sales"));

router.post("/", validateSale, checkStock, createSale);
router.get("/", getSales);
router.get("/:id", getSaleById);

module.exports = router;