const Business = require("../models/Business");

/**
 * Retrieve business profile details directly from Team 1's Business model.
 * Reads name, address, GST number (gstin), phone, and logo.
 */
const getBusinessDetails = async () => {
    const profile = await Business.getOrCreateProfile();

    return {
        name: profile.businessName || "",
        address: profile.address || "",
        gstin: profile.gstNumber || "",
        phone: profile.phone || "",
        logo: profile.logo || "",
        email: profile.email || ""
    };
};

module.exports = {
    getBusinessDetails
};
