const mongoose = require("mongoose");
const Sale = require("../models/sale");
const Return = require("../models/return");
const { getProduct, increaseStock } = require("../services/stockService");

const createReturn = async (req, res) => {
    try {
        const { saleId, productId, quantityReturned, reason, batchId } = req.body;

        if (!mongoose.isValidObjectId(saleId) || !mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Valid saleId and productId are required" });
        }
        if (!Number.isInteger(quantityReturned) || quantityReturned < 1) {
            return res.status(400).json({ message: "quantityReturned must be a whole number, minimum 1" });
        }

        const sale = await Sale.findById(saleId);
        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        try {
            await getProduct(productId);
        } catch (error) {
            return res.status(404).json({ message: "Product not found" });
        }

        const soldItem = sale.items.find((item) => String(item.product) === String(productId));
        if (!soldItem) {
            return res.status(400).json({ message: "This product is not part of the given sale" });
        }

        const previous = await Return.find({ sale: saleId, product: productId, status: "Completed" });
        const alreadyReturned = previous.reduce((sum, r) => sum + r.quantityReturned, 0);
        const remaining = soldItem.quantity - alreadyReturned;

        if (quantityReturned > remaining) {
            return res.status(400).json({
                message: `Cannot return ${quantityReturned}. Only ${remaining} unit(s) can be returned.`
            });
        }

        // Restock returned units back into Team 2 Product and Inventory models
        await increaseStock(productId, quantityReturned);

        const newReturn = await Return.create({
            sale: saleId,
            product: productId,
            quantityReturned,
            reason: reason || "",
            status: "Completed",
            ...(typeof batchId === "string" && batchId.trim() ? { batchId: batchId.trim() } : {})
        });

        return res.status(201).json({
            message: "Return processed and stock replenished successfully",
            returnItem: newReturn
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getReturns = async (req, res) => {
    try {
        const { saleId, productId } = req.query;
        const filter = {};

        if (saleId) {
            if (!mongoose.isValidObjectId(saleId)) {
                return res.status(400).json({ message: "saleId is not a valid id" });
            }
            filter.sale = saleId;
        }

        if (productId) {
            if (!mongoose.isValidObjectId(productId)) {
                return res.status(400).json({ message: "productId is not a valid id" });
            }
            filter.product = productId;
        }

        const returns = await Return.find(filter)
            .populate("product", "productName sku sellingPrice")
            .sort({ createdAt: -1, _id: -1 });

        return res.json(returns);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getReturnById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid return id" });
        }

        const found = await Return.findById(id)
            .populate("product", "productName sku sellingPrice")
            .populate("sale");

        if (!found) {
            return res.status(404).json({ message: "Return not found" });
        }

        return res.json(found);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createReturn,
    getReturns,
    getReturnById
};
