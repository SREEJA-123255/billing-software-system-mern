const Counter = require("../models/counter");

const generateInvoiceNumber = async () => {
    const counter = await Counter.findOneAndUpdate(
        { name: "invoice" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `INV-${String(counter.seq).padStart(4, "0")}`;
};

module.exports = {
    generateInvoiceNumber
};
