const mongoose = require("mongoose");
const { getProduct } = require("../services/stockService");

const checkStock = async (req, res, next) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "At least one item is required" });
        }

        const products = {};

        for (const item of items) {
            if (!mongoose.isValidObjectId(item.product)) {
                return res.status(400).json({ message: "Each item needs a valid product id" });
            }
            if (!Number.isInteger(item.quantity) || item.quantity < 1) {
                return res.status(400).json({ message: "Each item needs a whole number quantity, minimum 1" });
            }

            const product = await getProduct(item.product);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.product} not found` });
            }

            if (product.status === "INACTIVE") {
                return res.status(400).json({ message: `Product ${product.name} is inactive and cannot be sold` });
            }

            if (item.quantity > product.stock) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}`
                });
            }

            products[item.product] = product;
        }

        req.products = products;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = checkStock;
