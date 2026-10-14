const mongoose = require("mongoose");
const Product = require("../models/product");
const { decreaseStock, increaseStock } = require("./inventoryService");

/**
 * Retrieve product details using Team 2's Product model.
 */
const getProduct = async (productId) => {
    if (!productId) {
        throw new Error("Product ID is required");
    }

    if (!mongoose.isValidObjectId(productId)) {
        throw new Error("Invalid product ID");
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new Error(`Product ${productId} not found`);
    }

    return {
        _id: product._id,
        name: product.productName,
        price: product.sellingPrice,
        stock: product.stockQuantity,
        taxRate: product.taxRate || 0,
        sku: product.sku,
        status: product.status
    };
};

/**
 * Retrieve all products using Team 2's Product model.
 */
const getAllProducts = async () => {
    const products = await Product.find({}).sort({ productName: 1 });

    return products.map((p) => ({
        _id: p._id,
        name: p.productName,
        price: p.sellingPrice,
        stock: p.stockQuantity,
        taxRate: p.taxRate || 0,
        sku: p.sku,
        status: p.status
    }));
};

module.exports = {
    getProduct,
    decreaseStock,
    increaseStock,
    getAllProducts
};