const mongoose = require("mongoose");
const Purchase = require("../models/Purchase");
const Supplier = require("../models/Supplier");
const Customer = require("../models/Customer");
const { findMissingProducts, increaseStock, decreaseStock } = require("../services/inventoryService");

const parseDate = (value, endOfDay = false) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) d.setUTCHours(23, 59, 59, 999);
    return d;
};

const createPurchase = async (req, res) => {
    try {
        const {
            supplierId,
            customerId,
            purchaseDate,
            items,
            subtotal,
            discount,
            tax, 
            totalAmount
        } = req.body;
        const purchaseId = req.body.purchaseId.trim();
        const paymentStatus = req.body.paymentStatus.trim().toLowerCase();

        if (await Purchase.exists({ purchaseId })) {
            return res.status(400).json({ success: false, message: "Purchase ID already exists" });
        }

        if (!(await Supplier.exists({ _id: supplierId }))) {
            return res.status(404).json({ success: false, message: "Supplier not found" });
        }

        if (customerId && !(await Customer.exists({ _id: customerId }))) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const missing = await findMissingProducts(items.map((i) => i.productId));
        if (missing.length > 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
                missingProducts: missing
            });
        }

        const status = req.body.status && ["ACTIVE", "INACTIVE"].includes(String(req.body.status).toUpperCase())
            ? String(req.body.status).toUpperCase()
            : "ACTIVE";

        const purchase = await Purchase.create({
            purchaseId,
            supplierId,
            customerId,
            purchaseDate,
            items,
            subtotal,
            discount,
            tax,
            totalAmount,
            paymentStatus,
            status
        });

        // Purchase -> Inventory integration (Team 2 Product model)
        try {
            const updated = await increaseStock(purchase.items);
            if (updated) {
                purchase.stockUpdated = true;
                await purchase.save();
            }
        } catch (stockError) {
            console.error("Stock update failed, rolling back purchase:", stockError);
            await Purchase.findByIdAndDelete(purchase._id);
            return res.status(500).json({
                success: false,
                message: "Failed to update inventory. Purchase was not saved."
            });
        }

        return res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: purchase
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(400).json({ success: false, message: "Purchase ID already exists" });
        }
        if (error?.name === "ValidationError") {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("Create purchase error:", error);
        return res.status(500).json({ success: false, message: "Failed to create purchase" });
    }
};

const getPurchases = async (req, res) => {
    try {
        const { from, to, supplier } = req.query;
        const filter = {};

        if (supplier) {
            if (!mongoose.isValidObjectId(supplier)) {
                return res.status(400).json({ success: false, message: "Invalid supplier ID" });
            }
            filter.supplierId = supplier;
        }

        let fromDate, toDate;
        if (from) {
            fromDate = parseDate(from);
            if (!fromDate) return res.status(400).json({ success: false, message: "Invalid from date" });
        }
        if (to) {
            toDate = parseDate(to, true);
            if (!toDate) return res.status(400).json({ success: false, message: "Invalid to date" });
        }
        if (fromDate && toDate && fromDate > toDate) {
            return res.status(400).json({ success: false, message: "from date cannot be after to date" });
        }
        if (fromDate || toDate) {
            filter.purchaseDate = {};
            if (fromDate) filter.purchaseDate.$gte = fromDate;
            if (toDate) filter.purchaseDate.$lte = toDate;
        }

        const purchases = await Purchase.find(filter)
            .populate("supplierId", "companyName contactPerson")
            .populate("items.productId", "productName sku")
            .sort({ createdAt: -1, purchaseDate: -1, _id: -1 });

        return res.status(200).json({ success: true, count: purchases.length, data: purchases });
    } catch (error) {
        console.error("Get purchases error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch purchases" });
    }
};

const getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid purchase ID" });
        }

        const purchase = await Purchase.findById(id)
            .populate("supplierId", "companyName contactPerson")
            .populate("items.productId", "productName sku");

        if (!purchase) {
            return res.status(404).json({ success: false, message: "Purchase not found" });
        }

        return res.status(200).json({ success: true, data: purchase });
    } catch (error) {
        console.error("Get purchase by ID error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch purchase" });
    }
};

const updatePurchase = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid purchase ID" });
        }

        const existingPurchase = await Purchase.findById(id);
        if (!existingPurchase) {
            return res.status(404).json({ success: false, message: "Purchase not found" });
        }

        const {
            supplierId,
            customerId,
            purchaseDate,
            items,
            subtotal,
            discount,
            tax,
            totalAmount,
            status
        } = req.body;

        const paymentStatus = req.body.paymentStatus
            ? req.body.paymentStatus.trim().toLowerCase()
            : existingPurchase.paymentStatus;

        if (supplierId && !(await Supplier.exists({ _id: supplierId }))) {
            return res.status(404).json({ success: false, message: "Supplier not found" });
        }

        if (customerId && !(await Customer.exists({ _id: customerId }))) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        if (items && items.length > 0) {
            const missing = await findMissingProducts(items.map((i) => i.productId));
            if (missing.length > 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found",
                    missingProducts: missing
                });
            }

            // Inventory adjustment: revert previous items stock, then apply new items stock
            try {
                if (existingPurchase.stockUpdated && existingPurchase.items?.length > 0) {
                    await decreaseStock(existingPurchase.items);
                }
                await increaseStock(items);
                existingPurchase.stockUpdated = true;
            } catch (stockError) {
                console.error("Stock update failed during purchase update:", stockError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to update inventory during purchase update: " + stockError.message
                });
            }

            existingPurchase.items = items;
        }

        if (supplierId) existingPurchase.supplierId = supplierId;
        if (customerId !== undefined) existingPurchase.customerId = customerId || null;
        if (purchaseDate) existingPurchase.purchaseDate = purchaseDate;
        if (subtotal !== undefined) existingPurchase.subtotal = subtotal;
        if (discount !== undefined) existingPurchase.discount = discount;
        if (tax !== undefined) existingPurchase.tax = tax;
        if (totalAmount !== undefined) existingPurchase.totalAmount = totalAmount;
        if (paymentStatus) existingPurchase.paymentStatus = paymentStatus;

        if (status) {
            const upperStatus = String(status).toUpperCase();
            if (["ACTIVE", "INACTIVE"].includes(upperStatus)) {
                const currentStatus = existingPurchase.status || "ACTIVE";
                if (upperStatus !== currentStatus) {
                    if (upperStatus === "INACTIVE" && existingPurchase.stockUpdated && existingPurchase.items?.length > 0) {
                        try {
                            await decreaseStock(existingPurchase.items);
                            existingPurchase.stockUpdated = false;
                        } catch (stockErr) {
                            console.error("Stock decrease on deactivate purchase failed:", stockErr);
                        }
                    } else if (upperStatus === "ACTIVE" && !existingPurchase.stockUpdated && existingPurchase.items?.length > 0) {
                        try {
                            await increaseStock(existingPurchase.items);
                            existingPurchase.stockUpdated = true;
                        } catch (stockErr) {
                            console.error("Stock increase on activate purchase failed:", stockErr);
                        }
                    }
                    existingPurchase.status = upperStatus;
                }
            }
        }

        await existingPurchase.save();

        const populated = await Purchase.findById(existingPurchase._id)
            .populate("supplierId", "companyName contactPerson")
            .populate("items.productId", "productName sku");

        return res.status(200).json({
            success: true,
            message: "Purchase updated successfully",
            data: populated
        });
    } catch (error) {
        if (error?.name === "ValidationError") {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("Update purchase error:", error);
        return res.status(500).json({ success: false, message: "Failed to update purchase" });
    }
};

const deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid purchase ID" });
        }

        const purchase = await Purchase.findById(id);
        if (!purchase) {
            return res.status(404).json({ success: false, message: "Purchase not found" });
        }

        // Revert inventory stock if it was previously updated
        if (purchase.stockUpdated && purchase.items?.length > 0) {
            try {
                await decreaseStock(purchase.items);
            } catch (stockErr) {
                console.error("Failed to decrease stock on purchase deletion:", stockErr);
            }
        }

        await Purchase.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Purchase deleted successfully"
        });
    } catch (error) {
        console.error("Delete purchase error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete purchase" });
    }
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
};