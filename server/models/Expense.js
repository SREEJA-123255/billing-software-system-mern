const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            enum: [
                "Rent",
                "Electricity",
                "Transport",
                "Salary",
                "Maintenance",
                "Office Supplies",
                "Other"
            ]
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        description: {
            type: String,
            trim: true
        },

        date: {
            type: Date,
            required: true
        },

        paymentMethod: {
            type: String,
            enum: ["Cash", "UPI", "Card", "Bank Transfer"],
            default: "Cash",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Expense", expenseSchema);