const mongoose = require("mongoose");
const { Schema } = mongoose;

const counterSchema = new Schema({
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
});

module.exports = mongoose.model("Counter", counterSchema);
