const mongoose = require("mongoose");
const Product = require("../models/product");
const Category = require("../models/category");

const escapeRegex = (string = "") => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const formatInventoryItem = (product) => {
    if (!product) {
        return null;
    }

    const stockQuantity = Number(product.stockQuantity || 0);
    const minimumStock = Number(product.minimumStock || 0);

    return {
        _id: product._id,
        productName: product.productName,
        sku: product.sku,
        category: product.category,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        taxRate: product.taxRate,
        stockQuantity,
        minimumStock,
        status: product.status,
        lowStock: stockQuantity <= minimumStock,
        inventoryStatus: stockQuantity <= minimumStock ? "LOW_STOCK" : "IN_STOCK",
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
};

const createInventoryItems = async (req, res) => {
    try {
        const payload = Array.isArray(req.body) ? req.body : [req.body];

        if (!payload.length || payload.some((item) => !item)) {
            return res.status(400).json({ message: "At least one inventory item is required" });
        }

        const createdItems = [];

        for (const item of payload) {
            const {
                productName,
                sku,
                category,
                purchasePrice,
                sellingPrice,
                taxRate,
                stockQuantity,
                minimumStock,
                status
            } = item;

            if (!productName || !sku || !category) {
                return res.status(400).json({
                    message: "productName, sku, and category are required"
                });
            }

            const cleanName = String(productName).trim();
            const cleanSku = String(sku).trim().toUpperCase();

            // Case-insensitive checks
            const existingName = await Product.findOne({
                productName: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") }
            });
            if (existingName) {
                return res.status(400).json({ message: "Product name already exists" });
            }

            const existingSku = await Product.findOne({
                sku: { $regex: new RegExp(`^${escapeRegex(cleanSku)}$`, "i") }
            });
            if (existingSku) {
                return res.status(400).json({ message: "SKU already exists" });
            }

            const product = await Product.create({
                productName: cleanName,
                sku: cleanSku,
                category,
                purchasePrice: Number(purchasePrice) || 0,
                sellingPrice: Number(sellingPrice) || 0,
                taxRate: Number(taxRate) || 0,
                stockQuantity: Number(stockQuantity) || 0,
                minimumStock: Number(minimumStock) || 0,
                status: status && ["ACTIVE", "INACTIVE"].includes(String(status).toUpperCase())
                    ? String(status).toUpperCase()
                    : "ACTIVE"
            });

            createdItems.push(formatInventoryItem(product));
        }

        if (createdItems.length === 1) {
            return res.status(201).json({
                message: "Inventory item created successfully",
                item: createdItems[0]
            });
        }

        return res.status(201).json({
            message: "Inventory items created successfully",
            items: createdItems
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "SKU already exists" });
        }
        return res.status(500).json({ message: "Failed to create inventory item(s)", error: error.message });
    }
};

const createInventoryItem = createInventoryItems;

const getInventoryItems = async (req, res) => {
    try {
        const { search, category, status, lowStock, minQuantity, maxQuantity } = req.query;
        const query = {};

        if (search && search.trim()) {
            const regex = { $regex: escapeRegex(search.trim()), $options: "i" };
            query.$or = [{ productName: regex }, { sku: regex }];
        }

        if (category && category !== "ALL") {
            query.category = category;
        }

        if (status && status !== "ALL") {
            query.status = status.toUpperCase();
        }

        if (minQuantity || maxQuantity) {
            query.stockQuantity = {};
            if (minQuantity !== undefined && minQuantity !== "") {
                query.stockQuantity.$gte = Number(minQuantity);
            }
            if (maxQuantity !== undefined && maxQuantity !== "") {
                query.stockQuantity.$lte = Number(maxQuantity);
            }
        }

        if (lowStock === "true" || lowStock === true || lowStock === "1") {
            query.$expr = {
                $lte: [
                    { $toDouble: { $ifNull: ["$stockQuantity", 0] } },
                    { $toDouble: { $ifNull: ["$minimumStock", 0] } }
                ]
            };
        }

        const products = await Product.find(query).sort({ updatedAt: -1 });

        return res.status(200).json(products.map(formatInventoryItem));
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch inventory", error: error.message });
    }
};

const getInventoryItemById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        return res.status(200).json(formatInventoryItem(product));
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch inventory item", error: error.message });
    }
};

const getLowStockItems = async (req, res) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: [
                    { $toDouble: { $ifNull: ["$stockQuantity", 0] } },
                    { $toDouble: { $ifNull: ["$minimumStock", 0] } }
                ]
            }
        }).sort({ updatedAt: -1 });

        return res.status(200).json(products.map(formatInventoryItem));
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch low stock products", error: error.message });
    }
};

const getInventorySummary = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeCategories = await Category.countDocuments({ status: "ACTIVE" });
        const lowStockCount = await Product.countDocuments({
            $expr: {
                $lte: [
                    { $toDouble: { $ifNull: ["$stockQuantity", 0] } },
                    { $toDouble: { $ifNull: ["$minimumStock", 0] } }
                ]
            }
        });
        const totalStock = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: "$stockQuantity" }
                }
            }
        ]);

        return res.status(200).json({
            totalProducts,
            totalStock: totalStock[0]?.totalStock || 0,
            lowStockCount,
            inStockCount: Math.max(0, totalProducts - lowStockCount),
            activeCategories
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch inventory summary", error: error.message });
    }
};

const updateInventoryItem = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        return res.status(200).json({
            message: "Inventory item updated successfully",
            item: formatInventoryItem(product)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "SKU already exists" });
        }
        return res.status(500).json({ message: "Failed to update inventory item", error: error.message });
    }
};

const adjustInventory = async (req, res) => {
    try {
        const productId = req.body.productId || req.body.id || req.params.id;
        const { quantity, adjustment, operation = "set", stockQuantity } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "productId is required" });
        }

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const delta = Number(adjustment ?? quantity ?? 0);
        const absoluteValue = Number(stockQuantity ?? product.stockQuantity ?? 0);

        let nextQuantity;

        switch (operation.toLowerCase()) {
            case "add":
                nextQuantity = product.stockQuantity + delta;
                break;
            case "subtract":
                nextQuantity = product.stockQuantity - delta;
                break;
            case "set":
                nextQuantity = absoluteValue;
                break;
            default:
                return res.status(400).json({ message: "Invalid operation. Use add, subtract, or set." });
        }

        if (nextQuantity < 0) {
            return res.status(400).json({ message: "Stock quantity cannot be negative" });
        }

        product.stockQuantity = nextQuantity;
        if (req.body.minimumStock !== undefined) {
            product.minimumStock = Number(req.body.minimumStock);
        }

        await product.save();

        return res.status(200).json({
            message: "Inventory adjusted successfully",
            item: formatInventoryItem(product)
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to adjust inventory", error: error.message });
    }
};

const deleteInventoryItem = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        // Deactivate rather than delete database records
        product.status = "INACTIVE";
        await product.save();

        return res.status(200).json({ message: "Inventory item deactivated successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete inventory item", error: error.message });
    }
};

module.exports = {
    getInventoryItems,
    getInventoryItemById,
    getLowStockItems,
    getInventorySummary,
    createInventoryItem,
    createInventoryItems,
    updateInventoryItem,
    adjustInventory,
    deleteInventoryItem
};

