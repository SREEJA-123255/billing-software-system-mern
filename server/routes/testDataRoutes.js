const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { getAllCustomers } = require("../services/customerService");
const { getAllProducts } = require("../services/stockService");

const router = express.Router();

router.get("/test-customers", authenticate, async (req, res) => {
    try {
        const customers = await getAllCustomers();
        return res.json(customers);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

router.get("/test-products", authenticate, async (req, res) => {
    try {
        const products = await getAllProducts();
        return res.json(products);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

module.exports = router;
