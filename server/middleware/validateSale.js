const mongoose = require("mongoose");

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "BankTransfer", "Credit"];
const PAYMENT_STATUSES = ["Paid", "Pending", "Partial"];
const DISCOUNT_TYPES = ["percentage", "fixed"];

const validateSale = (req, res, next) => {
    const { customer, items, paymentMethod, paymentStatus, discount, taxRate } = req.body;

    if (!mongoose.isValidObjectId(customer)) {
        return res.status(400).json({ message: "Valid customer id is required" });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({ message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}` });
    }

    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ message: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(", ")}` });
    }

    if (discount !== undefined) {
        const validDiscount =
            discount !== null &&
            typeof discount === "object" &&
            DISCOUNT_TYPES.includes(discount.type) &&
            typeof discount.value === "number" &&
            discount.value >= 0;

        if (!validDiscount) {
            return res.status(400).json({
                message: 'discount must be { type: "percentage" | "fixed", value: number >= 0 }'
            });
        }
    }

    if (taxRate !== undefined && (typeof taxRate !== "number" || taxRate < 0)) {
        return res.status(400).json({ message: "taxRate must be a number, minimum 0" });
    }

    if (Array.isArray(items)) {
        const ids = items.map((item) => String(item?.product));
        if (new Set(ids).size !== ids.length) {
            return res.status(400).json({ message: "Same product appears more than once. Increase its quantity instead." });
        }
    }

    next();
};

module.exports = validateSale;
