const mongoose = require("mongoose");
const { Schema } = mongoose;

const saleItemSchema = new mongoose.Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"]
        },
        price: {
            type: Number,
            required: true,
            min: [0, "Price cannot be negative"]
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false }
);

const saleSchema = new mongoose.Schema(
    {
        customer: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true
        },
        items: {
            type: [saleItemSchema],
            required: true,
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: "A sale must contain at least one item"
            }
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        discount: {
            type: {
                type: String,
                enum: ["percentage", "fixed"],
                default: "fixed"
            },
            value: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        tax: {
            type: Number,
            required: true,
            min: 0
        },
        grandTotal: {
            type: Number,
            required: true,
            min: 0
        },
        paymentMethod: {
            type: String,
            enum: ["Cash", "UPI", "Card", "BankTransfer", "Credit"],
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ["Paid", "Pending", "Partial"],
            default: "Pending"
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
