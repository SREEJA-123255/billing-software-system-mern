const mongoose = require("mongoose");
const { Schema } = mongoose;

const returnSchema = new mongoose.Schema(
    {
        // Shared by product records submitted together in one return form.
        batchId: { type: String, index: true },

        sale: {
            type: Schema.Types.ObjectId,
            ref: "Sale",
            required: true
        },

        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        quantityReturned: {
            type: Number,
            required: true,
            min: [1, "Returned quantity must be at least 1"]
        },
        reason: {
            type: String,
            trim: true,
            default: ""
        },

        status: {
            type: String,
            enum: ["Completed", "Rejected"],
            default: "Completed"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Return_items", returnSchema);
