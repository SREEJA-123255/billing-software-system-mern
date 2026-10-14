const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Purchase = require("../models/Purchase");
const Sale = require("../models/sale");
const Invoice = require("../models/invoice");

const getCustomerHistory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid customer ID" });
        }

        const customer = await Customer.findById(id).select("name phone email");
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        // Fetch sales/invoices made by this customer
        const sales = await Sale.find({ customer: id })
            .sort({ createdAt: -1 })
            .lean();

        const saleHistories = await Promise.all(
            sales.map(async (s) => {
                const inv = await Invoice.findOne({ sale: s._id }).select("invoiceNumber").lean();
                return {
                    id: s._id,
                    purchaseId: inv?.invoiceNumber || `SALE-${String(s._id).slice(-6).toUpperCase()}`,
                    purchaseDate: s.createdAt,
                    totalAmount: s.grandTotal || 0,
                    paymentStatus: s.paymentStatus || "Paid"
                };
            })
        );

        // Also fetch any supplier purchase records linked to customer
        const purchases = await Purchase.find({ customerId: id })
            .select("purchaseId purchaseDate totalAmount paymentStatus")
            .sort({ purchaseDate: -1 })
            .lean();

        const purchaseHistories = purchases.map((p) => ({
            id: p._id,
            purchaseId: p.purchaseId,
            purchaseDate: p.purchaseDate,
            totalAmount: p.totalAmount || 0,
            paymentStatus: p.paymentStatus || "Completed"
        }));

        const combined = [...saleHistories, ...purchaseHistories].sort(
            (a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)
        );

        const totalAmount = combined.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

        return res.status(200).json({
            success: true,
            customer,
            count: combined.length,
            totalAmount,
            data: combined
        });
    } catch (error) {
        console.error("Customer history error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch customer history" });
    }
};

module.exports = {
    getCustomerHistory
};