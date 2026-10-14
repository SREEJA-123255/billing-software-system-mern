const mongoose = require("mongoose");
const Sale = require("../models/sale");
const { calculateBill } = require("../utils/calculateBill");
const { decreaseStock, increaseStock } = require("../services/stockService");
const { getCustomer } = require("../services/customerService");

const rollbackStock = async (decreasedItems) => {
    for (const item of decreasedItems) {
        try {
            await increaseStock(item.product, item.quantity);
        } catch (error) {
            console.error(`Stock rollback failed for product ${item.product}:`, error.message);
        }
    }
};

const createSale = async (req, res) => {
    const decreased = [];

    try {
        const { customer, items, discount, taxRate, paymentMethod, paymentStatus } = req.body;

        try {
            await getCustomer(customer);
        } catch (error) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const billItems = items.map((item) => {
            const product = req.products ? req.products[item.product] : null;
            const price = typeof item.price === "number" ? item.price : (product ? product.price : 0);
            return { product: item.product, quantity: item.quantity, price };
        });

        let bill;
        try {
            bill = calculateBill({ items: billItems, discount, taxRate });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        const saleData = {
            customer,
            items: bill.items.map(({ product, quantity, price, total }) => ({ product, quantity, price, total })),
            subtotal: bill.subtotal,
            discount: { type: discount?.type || "fixed", value: discount?.value || 0 },
            tax: bill.taxAmount,
            grandTotal: bill.grandTotal,
            paymentMethod,
            paymentStatus: paymentStatus || "Pending",
            createdBy: req.user?._id
        };

        for (const item of bill.items) {
            await decreaseStock(item.product, item.quantity);
            decreased.push(item);
        }

        const sale = await Sale.create(saleData);
        return res.status(201).json(sale);
    } catch (error) {
        await rollbackStock(decreased);
        return res.status(error.message && error.message.includes("Insufficient stock") ? 400 : 500).json({
            message: error.message
        });
    }
};

const getSales = async (req, res) => {
    try {
        const { from, to, customer } = req.query;
        const filter = {};

        if (from || to) {
            filter.createdAt = {};

            if (from) {
                const start = new Date(from);
                if (Number.isNaN(start.getTime())) {
                    return res.status(400).json({ message: "from is not a valid date" });
                }
                filter.createdAt.$gte = start;
            }

            if (to) {
                const end = new Date(to);
                if (Number.isNaN(end.getTime())) {
                    return res.status(400).json({ message: "to is not a valid date" });
                }
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        if (customer) {
            if (!mongoose.isValidObjectId(customer)) {
                return res.status(400).json({ message: "customer is not a valid id" });
            }
            filter.customer = customer;
        }

        const sales = await Sale.find(filter)
            .populate("customer", "name phone email")
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1, _id: -1 });

        return res.json(sales);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid sale id" });
        }

        const sale = await Sale.findById(id)
            .populate("customer", "name phone email address gstNumber")
            .populate("items.product", "productName sku sellingPrice")
            .populate("createdBy", "name email role");

        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        return res.json(sale);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSale,
    getSales,
    getSaleById
};
