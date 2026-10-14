const mongoose = require("mongoose");
const Customer = require("../models/Customer");

/**
 * Retrieve a customer by ID directly from Team 3's Customer model.
 */
const getCustomer = async (customerId) => {
    if (!customerId) {
        throw new Error("Customer ID is required");
    }

    if (!mongoose.isValidObjectId(customerId)) {
        throw new Error("Invalid customer ID");
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
    }

    return {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        gstNumber: customer.gstNumber || ""
    };
};

/**
 * Retrieve all customers from Team 3's Customer collection.
 */
const getAllCustomers = async () => {
    return Customer.find({}).sort({ name: 1 });
};

module.exports = {
    getCustomer,
    getAllCustomers
};