const mongoose = require("mongoose");
const Product = require("../models/product");
const Inventory = require("../models/inventory");

/**
 * Find products that do not exist in Team 2's Product model.
 *
 * @param {string[]} productIds - Product IDs to verify
 * @returns {Promise<string[]>} - IDs of products that are missing
 */
const findMissingProducts = async (productIds) => {
    const ids = [...new Set(productIds.map(String))];

    const invalidIds = ids.filter((id) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
        return invalidIds;
    }

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    const existingProducts = await Product.find(
        { _id: { $in: objectIds } },
        { _id: 1 }
    ).lean();

    const existingIds = new Set(
        existingProducts.map((p) => p._id.toString())
    );

    return ids.filter((id) => !existingIds.has(id));
};

/**
 * Normalizes input arguments to an array of { productId, quantity }.
 */
const normalizeItems = (itemsOrProductId, maybeQuantity) => {
    if (
        typeof itemsOrProductId === "string" ||
        itemsOrProductId instanceof mongoose.Types.ObjectId
    ) {
        return [{ productId: String(itemsOrProductId), quantity: Number(maybeQuantity) }];
    }

    if (Array.isArray(itemsOrProductId)) {
        return itemsOrProductId.map((item) => ({
            productId: String(item.productId || item.product || item._id),
            quantity: Number(item.quantity)
        }));
    }

    throw new Error("Invalid items argument for inventory stock operation");
};

/**
 * Increase stock quantity for products in Team 2's Product and Inventory models.
 * Used for Purchases, Sale rollbacks, and Returns.
 *
 * @param {Array|string} itemsOrProductId - Array of items or a single productId
 * @param {number} [maybeQuantity] - Quantity when first argument is a single productId
 * @returns {Promise<boolean>}
 */
const increaseStock = async (itemsOrProductId, maybeQuantity) => {
    const items = normalizeItems(itemsOrProductId, maybeQuantity);

    if (items.length === 0) {
        throw new Error("Items are required for increasing stock");
    }

    // Combine quantities if the same product appears multiple times
    const quantityMap = new Map();

    for (const item of items) {
        const { productId, quantity } = item;

        if (!mongoose.isValidObjectId(productId)) {
            throw new Error(`Invalid product ID: ${productId}`);
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity for product ${productId}`);
        }

        const current = quantityMap.get(productId) || 0;
        quantityMap.set(productId, current + quantity);
    }

    const operations = [];

    for (const [productId, quantity] of quantityMap.entries()) {
        operations.push({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(productId) },
                update: { $inc: { stockQuantity: quantity } }
            }
        });
    }

    const result = await Product.bulkWrite(operations, { ordered: true });

    if (result.matchedCount !== operations.length) {
        throw new Error("One or more products could not be found to increase stock");
    }

    // Also update Team 2 Inventory model if inventory records exist for these products
    for (const [productId, quantity] of quantityMap.entries()) {
        await Inventory.updateMany(
            { product: new mongoose.Types.ObjectId(productId) },
            { $inc: { stockQuantity: quantity } }
        );
    }

    return true;
};

/**
 * Decrease stock quantity for sold products in Team 2's Product and Inventory models.
 * Validates stock sufficiency and stops the sale with a clear error if insufficient.
 *
 * @param {Array|string} itemsOrProductId - Array of items or a single productId
 * @param {number} [maybeQuantity] - Quantity when first argument is a single productId
 * @returns {Promise<boolean>}
 */
const decreaseStock = async (itemsOrProductId, maybeQuantity) => {
    const items = normalizeItems(itemsOrProductId, maybeQuantity);

    if (items.length === 0) {
        throw new Error("Items are required for decreasing stock");
    }

    // Combine quantities for duplicates
    const quantityMap = new Map();

    for (const item of items) {
        const { productId, quantity } = item;

        if (!mongoose.isValidObjectId(productId)) {
            throw new Error(`Invalid product ID: ${productId}`);
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity for product ${productId}`);
        }

        const current = quantityMap.get(productId) || 0;
        quantityMap.set(productId, current + quantity);
    }

    // First pass: verify each product exists and has sufficient stock
    for (const [productId, quantity] of quantityMap.entries()) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error(`Product ${productId} not found`);
        }

        if (product.stockQuantity < quantity) {
            throw new Error(
                `Insufficient stock for ${product.productName}. Available: ${product.stockQuantity}, requested: ${quantity}`
            );
        }
    }

    // Second pass: atomically decrement stock on Product model
    const decrementedList = [];

    try {
        for (const [productId, quantity] of quantityMap.entries()) {
            const updateResult = await Product.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(productId),
                    stockQuantity: { $gte: quantity }
                },
                {
                    $inc: { stockQuantity: -quantity }
                }
            );

            if (updateResult.modifiedCount === 0) {
                const currentProduct = await Product.findById(productId);
                const currentStock = currentProduct ? currentProduct.stockQuantity : 0;
                const productName = currentProduct ? currentProduct.productName : productId;
                throw new Error(
                    `Insufficient stock for ${productName}. Available: ${currentStock}, requested: ${quantity}`
                );
            }

            decrementedList.push({ productId, quantity });

            // Also mirror decrement on Team 2 Inventory model
            await Inventory.updateMany(
                { product: new mongoose.Types.ObjectId(productId) },
                { $inc: { stockQuantity: -quantity } }
            );
        }
    } catch (err) {
        // Rollback any successfully decremented items in this transaction
        if (decrementedList.length > 0) {
            for (const dec of decrementedList) {
                try {
                    await Product.updateOne(
                        { _id: new mongoose.Types.ObjectId(dec.productId) },
                        { $inc: { stockQuantity: dec.quantity } }
                    );
                    await Inventory.updateMany(
                        { product: new mongoose.Types.ObjectId(dec.productId) },
                        { $inc: { stockQuantity: dec.quantity } }
                    );
                } catch (rollbackErr) {
                    console.error("Rollback error:", rollbackErr.message);
                }
            }
        }
        throw err;
    }

    return true;
};

module.exports = {
    findMissingProducts,
    increaseStock,
    decreaseStock
};