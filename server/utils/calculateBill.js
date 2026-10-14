const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const calculateDiscount = (subtotal, discount) => {
    const { type = "fixed", value = 0 } = discount || {};

    if (typeof value !== "number" || value < 0) {
        throw new Error("Invalid discount value");
    }
    if (type === "percentage") {
        if (value > 100) throw new Error("Percentage discount cannot exceed 100");
        return round2((subtotal * value) / 100);
    }
    if (type === "fixed") {
        return round2(value);
    }
    throw new Error(`Unknown discount type: ${type}`);
};

const calculateBill = ({ items, discount = { type: "fixed", value: 0 }, taxRate = 0 }) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("At least one item is required to calculate a bill");
    }

    const itemsWithTotals = items.map((item, index) => {
        const { quantity, price } = item;
        if (typeof quantity !== "number" || quantity <= 0) {
            throw new Error(`Invalid quantity for item at index ${index}`);
        }
        if (typeof price !== "number" || price < 0) {
            throw new Error(`Invalid price for item at index ${index}`);
        }
        return { ...item, total: round2(quantity * price) };
    });

    const subtotal = round2(itemsWithTotals.reduce((sum, i) => sum + i.total, 0));

    const discountAmount = calculateDiscount(subtotal, discount);
    if (discountAmount > subtotal) {
        throw new Error("Discount cannot exceed the subtotal");
    }

    if (typeof taxRate !== "number" || taxRate < 0) {
        throw new Error("Invalid tax rate");
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = round2((taxableAmount * taxRate) / 100);
    const grandTotal = round2(taxableAmount + taxAmount);

    return { items: itemsWithTotals, subtotal, discountAmount, taxAmount, grandTotal };
};

module.exports = {
    round2,
    calculateDiscount,
    calculateBill
};
