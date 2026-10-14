const mongoose = require("mongoose");
const Product = require("../models/product");
const Category = require("../models/category");

const escapeRegex = (string = "") => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getProducts = async (req, res) => {
    try {
        const { search, category, status, minPrice, maxPrice, lowStock, page, limit } = req.query;
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

        if (minPrice || maxPrice) {
            query.sellingPrice = {};
            if (minPrice !== undefined && minPrice !== "") {
                query.sellingPrice.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined && maxPrice !== "") {
                query.sellingPrice.$lte = Number(maxPrice);
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

        let productQuery = Product.find(query).sort({ createdAt: -1, _id: -1 });

        // If pagination parameters are explicitly provided
        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 10);
            const total = await Product.countDocuments(query);
            const products = await productQuery.skip((pageNum - 1) * limitNum).limit(limitNum);

            return res.status(200).json({
                products,
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            });
        }

        const products = await productQuery;
        return res.status(200).json(products);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch products", error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Product not found" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json(product);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch product", error: error.message });
    }
};

const createProduct = async (req, res) => {
    try {
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
        } = req.body;

        // Required field validation
        if (!productName || !String(productName).trim()) {
            return res.status(400).json({ message: "Product name is required" });
        }

        if (!sku || !String(sku).trim()) {
            return res.status(400).json({ message: "SKU is required" });
        }

        if (!category) {
            return res.status(400).json({ message: "Category is required" });
        }

        if (!mongoose.isValidObjectId(category)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ message: "Category not found" });
        }

        const numPurchasePrice = Number(purchasePrice);
        if (purchasePrice === undefined || purchasePrice === null || isNaN(numPurchasePrice) || numPurchasePrice < 0) {
            return res.status(400).json({ message: "Purchase price cannot be negative" });
        }

        const numSellingPrice = Number(sellingPrice);
        if (sellingPrice === undefined || sellingPrice === null || isNaN(numSellingPrice) || numSellingPrice < 0) {
            return res.status(400).json({ message: "Selling price cannot be negative" });
        }

        const numStockQuantity = stockQuantity !== undefined && stockQuantity !== "" ? Number(stockQuantity) : 0;
        if (isNaN(numStockQuantity) || numStockQuantity < 0) {
            return res.status(400).json({ message: "Stock quantity cannot be negative" });
        }

        const numMinimumStock = minimumStock !== undefined && minimumStock !== "" ? Number(minimumStock) : 0;
        if (isNaN(numMinimumStock) || numMinimumStock < 0) {
            return res.status(400).json({ message: "Minimum stock cannot be negative" });
        }

        const cleanName = String(productName).trim();
        const cleanSku = String(sku).trim().toUpperCase();

        // Case-insensitive duplicate check for product name on new records
        const existingName = await Product.findOne({
            productName: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") }
        });
        if (existingName) {
            return res.status(400).json({ message: "Product name already exists" });
        }

        // Case-insensitive duplicate check for SKU on new records
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
            purchasePrice: numPurchasePrice,
            sellingPrice: numSellingPrice,
            taxRate: Number(taxRate) || 0,
            stockQuantity: numStockQuantity,
            minimumStock: numMinimumStock,
            status: status && ["ACTIVE", "INACTIVE"].includes(String(status).toUpperCase())
                ? String(status).toUpperCase()
                : "ACTIVE"
        });

        return res.status(201).json({
            message: "Product created successfully",
            product
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "SKU already exists" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({
            message: "Failed to create product",
            error: error.message
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Product not found" });
        }

        const existing = await Product.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: "Product not found" });
        }

        const updates = { ...req.body };

        if (updates.productName !== undefined) {
            const cleanName = String(updates.productName).trim();
            if (!cleanName) {
                return res.status(400).json({ message: "Product name cannot be empty" });
            }
            const duplicateName = await Product.findOne({
                productName: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") },
                _id: { $ne: req.params.id }
            });
            if (duplicateName) {
                return res.status(400).json({ message: "Another product with this name already exists" });
            }
            updates.productName = cleanName;
        }

        if (updates.sku !== undefined) {
            const cleanSku = String(updates.sku).trim().toUpperCase();
            if (!cleanSku) {
                return res.status(400).json({ message: "SKU cannot be empty" });
            }
            const duplicateSku = await Product.findOne({
                sku: { $regex: new RegExp(`^${escapeRegex(cleanSku)}$`, "i") },
                _id: { $ne: req.params.id }
            });
            if (duplicateSku) {
                return res.status(400).json({ message: "SKU already exists" });
            }
            updates.sku = cleanSku;
        }

        if (updates.category !== undefined) {
            if (!mongoose.isValidObjectId(updates.category)) {
                return res.status(400).json({ message: "Invalid category ID" });
            }
            const categoryExists = await Category.findById(updates.category);
            if (!categoryExists) {
                return res.status(400).json({ message: "Category not found" });
            }
        }

        if (updates.purchasePrice !== undefined) {
            const val = Number(updates.purchasePrice);
            if (isNaN(val) || val < 0) {
                return res.status(400).json({ message: "Purchase price cannot be negative" });
            }
            updates.purchasePrice = val;
        }

        if (updates.sellingPrice !== undefined) {
            const val = Number(updates.sellingPrice);
            if (isNaN(val) || val < 0) {
                return res.status(400).json({ message: "Selling price cannot be negative" });
            }
            updates.sellingPrice = val;
        }

        if (updates.stockQuantity !== undefined) {
            const val = Number(updates.stockQuantity);
            if (isNaN(val) || val < 0) {
                return res.status(400).json({ message: "Stock quantity cannot be negative" });
            }
            updates.stockQuantity = val;
        }

        if (updates.minimumStock !== undefined) {
            const val = Number(updates.minimumStock);
            if (isNaN(val) || val < 0) {
                return res.status(400).json({ message: "Minimum stock cannot be negative" });
            }
            updates.minimumStock = val;
        }

        if (updates.status !== undefined) {
            updates.status = String(updates.status).toUpperCase();
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: "Product updated successfully",
            product
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "SKU already exists" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Failed to update product", error: error.message });
    }
};

const updateProductStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Product not found" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const { status } = req.body;
        const targetStatus = status
            ? String(status).toUpperCase()
            : (product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");

        if (!["ACTIVE", "INACTIVE"].includes(targetStatus)) {
            return res.status(400).json({ message: "Status must be ACTIVE or INACTIVE" });
        }

        product.status = targetStatus;
        await product.save();

        return res.status(200).json({
            message: `Product status updated to ${targetStatus}`,
            product
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update product status", error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Product not found" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Product deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete product", error: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductStatus,
    deleteProduct
};
