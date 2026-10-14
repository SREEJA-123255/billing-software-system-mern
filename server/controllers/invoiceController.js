const mongoose = require("mongoose");
const Sale = require("../models/sale");
const Invoice = require("../models/invoice");
const Payment = require("../models/Payment");
const { generateInvoiceNumber } = require("../utils/generateInvoiceNumber");
const { round2 } = require("../utils/calculateBill");
const { getProduct } = require("../services/stockService");
const { getBusinessDetails } = require("../services/businessService");
const { getCustomer } = require("../services/customerService");

const createInvoice = async (req, res) => {
    try {
        const { saleId } = req.body;

        if (!mongoose.isValidObjectId(saleId)) {
            return res.status(400).json({ message: "Valid saleId is required" });
        }

        const sale = await Sale.findById(saleId);
        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        const existing = await Invoice.findOne({ sale: saleId });
        if (existing) {
            return res.status(409).json({ message: "Invoice already exists for this sale", invoice: existing });
        }

        const businessDetails = await getBusinessDetails();
        const customerDetails = await getCustomer(sale.customer);
        const items = [];

        for (const item of sale.items) {
            const product = await getProduct(item.product);
            items.push({
                productName: product.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total
            });
        }

        const discountAmount =
            sale.discount?.type === "percentage"
                ? round2((sale.subtotal * (sale.discount?.value || 0)) / 100)
                : sale.discount?.value || 0;

        const invoiceNumber = await generateInvoiceNumber();

        const invoice = await Invoice.create({
            invoiceNumber,
            sale: sale._id,
            businessDetails: {
                name: businessDetails.name,
                address: businessDetails.address,
                gstin: businessDetails.gstin,
                phone: businessDetails.phone,
                logo: businessDetails.logo || ""
            },
            customerDetails: {
                name: customerDetails.name,
                phone: customerDetails.phone || "",
                address: customerDetails.address || ""
            },
            items,
            subtotal: sale.subtotal,
            discountAmount,
            taxAmount: sale.tax,
            grandTotal: sale.grandTotal,
            paymentMethod: sale.paymentMethod,
            paymentStatus: sale.paymentStatus,
            paidAmount: sale.paymentStatus === "Paid" ? sale.grandTotal : 0
        });

        // Automatically record payment for this billing invoice so user does not have to record it separately
        try {
            let paymentStatusEnum = "PAID";
            if (sale.paymentStatus === "Pending") {
                paymentStatusEnum = "PENDING";
            } else if (sale.paymentStatus === "Partial") {
                paymentStatusEnum = "PARTIALLY_PAID";
            }

            const paymentAmount = Number(sale.grandTotal) || 0;

            if (paymentAmount > 0) {
                await Payment.create({
                    invoice: invoice._id,
                    customer: sale.customer,
                    amount: paymentAmount,
                    paymentMethod: sale.paymentMethod || "Cash",
                    paymentDate: invoice.invoiceDate || new Date(),
                    status: paymentStatusEnum,
                    transactionReference: `Bill #${invoice.invoiceNumber}`
                });
            }
        } catch (payErr) {
            console.error("Auto payment creation error on invoice generation:", payErr.message);
        }

        return res.status(201).json(invoice);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getInvoices = async (req, res) => {
    try {
        const { from, to, paymentStatus } = req.query;
        const filter = {};

        if (from || to) {
            filter.invoiceDate = {};

            if (from) {
                const start = new Date(from);
                if (Number.isNaN(start.getTime())) {
                    return res.status(400).json({ message: "from is not a valid date" });
                }
                filter.invoiceDate.$gte = start;
            }

            if (to) {
                const end = new Date(to);
                if (Number.isNaN(end.getTime())) {
                    return res.status(400).json({ message: "to is not a valid date" });
                }
                end.setHours(23, 59, 59, 999);
                filter.invoiceDate.$lte = end;
            }
        }

        if (paymentStatus) {
            filter.paymentStatus = paymentStatus;
        }

        const invoices = await Invoice.find(filter).sort({ createdAt: -1, _id: -1 });
        return res.json(invoices);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateInvoicePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, paidAmount } = req.body;
        const allowedStatuses = ["Pending", "Partial", "Paid"];

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid invoice id" });
        }
        if (!allowedStatuses.includes(paymentStatus)) {
            return res.status(400).json({ message: "Payment status must be Pending, Partial, or Paid" });
        }

        const invoice = await Invoice.findById(id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        const total = Number(invoice.grandTotal || 0);
        let received = 0;
        if (paymentStatus === "Paid") {
            received = total;
        } else if (paymentStatus === "Partial") {
            received = Number(paidAmount);
            if (!Number.isFinite(received) || received <= 0 || received >= total) {
                return res.status(400).json({
                    message: `For Partial status, amount received must be greater than 0 and less than ${total}`
                });
            }
        }

        invoice.paymentStatus = paymentStatus;
        invoice.paidAmount = received;
        await invoice.save();

        // Keep the original sale's payment status in sync with its invoice
        if (invoice.sale) {
            await Sale.findByIdAndUpdate(invoice.sale, { paymentStatus });
        }

        // Keep Payment record in sync with invoice payment status update
        try {
            let paymentStatusEnum = "PAID";
            if (paymentStatus === "Pending") paymentStatusEnum = "PENDING";
            else if (paymentStatus === "Partial") paymentStatusEnum = "PARTIALLY_PAID";

            const existingPayment = await Payment.findOne({ invoice: invoice._id });
            if (existingPayment) {
                existingPayment.status = paymentStatusEnum;
                if (received > 0) {
                    existingPayment.amount = received;
                }
                await existingPayment.save();
            } else {
                const saleRecord = invoice.sale ? await Sale.findById(invoice.sale) : null;
                await Payment.create({
                    invoice: invoice._id,
                    customer: saleRecord ? saleRecord.customer : null,
                    amount: received > 0 ? received : total,
                    paymentMethod: invoice.paymentMethod || "Cash",
                    paymentDate: new Date(),
                    status: paymentStatusEnum,
                    transactionReference: `Bill #${invoice.invoiceNumber}`
                });
            }
        } catch (paySyncErr) {
            console.error("Payment sync error on invoice status update:", paySyncErr.message);
        }

        return res.json({
            message: "Invoice payment status updated successfully",
            invoice,
            paidAmount: received,
            balanceDue: Math.max(0, total - received)
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid invoice id" });
        }

        const invoice = await Invoice.findById(id).populate("sale");
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        return res.json(invoice);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    updateInvoicePaymentStatus,
    getInvoiceById
};
