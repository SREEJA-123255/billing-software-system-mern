
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Invoice = require("../models/invoice");
const Customer = require("../models/Customer");
const Sale = require("../models/sale");

const escapeRegex = (string = "") => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ===============================
// Create Payment
// ===============================
const createPayment = async (req, res) => {
    try {
        const {
            invoice,
            customer,
            amount,
            paymentMethod,
            paymentDate,
            transactionReference
        } = req.body;

        // Validate amount
        if (
            amount === undefined ||
            amount === null ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be greater than 0"
            });
        }

        // Validate payment method
        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required"
            });
        }

        // Validate payment date
        if (!paymentDate) {
            return res.status(400).json({
                success: false,
                message: "Payment date is required"
            });
        }

        // Find invoice if provided (flexible matching by ID, exact number, case-insensitive, or padded digits e.g. INV-009 -> INV-0009)
        let invoiceData = null;
        if (invoice) {
            const trimmed = String(invoice).trim();
            if (mongoose.Types.ObjectId.isValid(trimmed)) {
                invoiceData = await Invoice.findById(trimmed);
            }
            if (!invoiceData) {
                invoiceData = await Invoice.findOne({ invoiceNumber: trimmed });
            }
            if (!invoiceData) {
                invoiceData = await Invoice.findOne({
                    invoiceNumber: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") }
                });
            }
            if (!invoiceData) {
                const digitsMatch = trimmed.match(/\d+/);
                if (digitsMatch) {
                    const num = parseInt(digitsMatch[0], 10);
                    invoiceData = await Invoice.findOne({
                        invoiceNumber: { $regex: new RegExp(`^INV-0*${num}$`, "i") }
                    });
                }
            }
        }

        // Resolve customer
        let customerId = (customer && mongoose.Types.ObjectId.isValid(customer)) ? customer : null;
        if (!customerId && customer && typeof customer === "string" && customer.trim()) {
            const custTrimmed = customer.trim();
            const foundCust = await Customer.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(custTrimmed)}$`, "i") }
            }) || await Customer.findOne({
                name: { $regex: new RegExp(escapeRegex(custTrimmed), "i") }
            });
            if (foundCust) {
                customerId = foundCust._id;
            }
        }

        // If customerId still not resolved, resolve from invoice or its sale
        if (!customerId && invoiceData) {
            if (invoiceData.sale) {
                const saleRecord = await Sale.findById(invoiceData.sale);
                if (saleRecord && saleRecord.customer) {
                    customerId = saleRecord.customer;
                }
            }
            if (!customerId && invoiceData.customerDetails?.name) {
                const foundCust = await Customer.findOne({
                    name: { $regex: new RegExp(`^${escapeRegex(invoiceData.customerDetails.name)}$`, "i") }
                });
                if (foundCust) {
                    customerId = foundCust._id;
                }
            }
        }

        // Calculate and reconcile invoice totals if linked
        let invoiceAmount = 0;
        let totalPreviouslyPaid = 0;
        let totalPaidAfterPayment = Number(amount);
        let status = req.body.status || "PAID";

        if (invoiceData) {
            invoiceAmount = Number(invoiceData.grandTotal) || 0;
            totalPreviouslyPaid = Number(invoiceData.paidAmount) || 0;
            totalPaidAfterPayment = totalPreviouslyPaid + Number(amount);

            invoiceData.paidAmount = totalPaidAfterPayment;
            invoiceData.paymentStatus = (totalPaidAfterPayment >= invoiceAmount) ? "Paid" : "Partial";
            await invoiceData.save();

            status = (totalPaidAfterPayment >= invoiceAmount) ? "PAID" : "PARTIALLY_PAID";
        }

        // Create payment record
        const payment = await Payment.create({
            invoice: invoiceData ? invoiceData._id : null,
            customer: customerId,
            amount: Number(amount),
            paymentMethod,
            paymentDate: new Date(paymentDate),
            status: req.body.status || status,
            transactionReference: transactionReference || (invoice && !invoiceData ? `Ref Invoice: ${invoice}` : undefined)
        });

        const remainingAmount = Math.max(0, invoiceAmount - totalPaidAfterPayment);

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            data: payment,
            paymentSummary: {
                invoiceAmount,
                totalPreviouslyPaid,
                paymentAmount: Number(amount),
                totalPaid: totalPaidAfterPayment,
                remainingAmount,
                status
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Get All Payments
// ===============================
const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate("invoice", "invoiceNumber grandTotal paidAmount paymentStatus")
            .populate("customer", "name phone email")
            .sort({ createdAt: -1, paymentDate: -1, _id: -1 });

        res.status(200).json({
            success: true,
            data: payments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Get Payment By ID
// ===============================
const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate("invoice", "invoiceNumber grandTotal paidAmount paymentStatus")
            .populate("customer", "name phone email");

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid payment ID"
        });
    }
};

// ===============================
// Update Payment
// ===============================
const updatePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const allowedUpdates = {
            paymentMethod: req.body.paymentMethod,
            paymentDate: req.body.paymentDate,
            transactionReference: req.body.transactionReference
        };

        if (allowedUpdates.paymentMethod !== undefined) {
            payment.paymentMethod = allowedUpdates.paymentMethod;
        }

        if (allowedUpdates.paymentDate !== undefined) {
            payment.paymentDate = allowedUpdates.paymentDate;
        }

        if (allowedUpdates.transactionReference !== undefined) {
            payment.transactionReference = allowedUpdates.transactionReference;
        }

        await payment.save();

        res.status(200).json({
            success: true,
            message: "Payment updated successfully",
            data: payment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Delete Payment
// ===============================
const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // Adjust the invoice paidAmount and status
        if (payment.invoice) {
            const invoiceData = await Invoice.findById(payment.invoice);
            if (invoiceData) {
                const newPaid = Math.max(0, (Number(invoiceData.paidAmount) || 0) - Number(payment.amount));
                invoiceData.paidAmount = newPaid;
                const grandTotal = Number(invoiceData.grandTotal) || 0;
                invoiceData.paymentStatus = newPaid >= grandTotal ? "Paid" : (newPaid > 0 ? "Partial" : "Pending");
                await invoiceData.save();
            }
        }

        await Payment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Payment deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid payment ID"
        });
    }
};

module.exports = {
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment
};
