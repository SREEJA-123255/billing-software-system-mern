const mongoose = require("mongoose");
const { Schema } = mongoose;

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true
        },

        sale: {
            type: Schema.Types.ObjectId,
            ref: "Sale",
            required: true
        },

        invoiceDate: {
            type: Date,
            default: Date.now
        },

        businessDetails: {
            name: String,
            address: String,
            gstin: String,
            phone: String,
            logo: String
        },

        customerDetails: {
            name: { type: String, required: true },
            phone: String,
            address: String
        },

        items: [
            {
                productName: { type: String, required: true },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                total: { type: Number, required: true }
            }
        ],

        subtotal: {
            type: Number,
            required: true
        },
        discountAmount: {
            type: Number,
            default: 0
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        grandTotal: {
            type: Number,
            required: true
        },

        paymentMethod: {
            type: String,
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ["Paid", "Pending", "Partial"],
            required: true,
            default: "Pending"
        },
        paidAmount: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Invoices", invoiceSchema);
