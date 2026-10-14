const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true
        },

        stockQuantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        minimumStock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        location: {
            type: String,
            trim: true,
            default: "Main Warehouse"
        },

        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Inventory", inventorySchema);
