const Business = require("../models/Business");
const fs = require("fs");
const path = require("path");

// @desc    Get business details
// @route   GET /api/business
// @access  Private (Authenticated users - used by Admin & Team 4 Invoice generation)
const getBusiness = async (req, res, next) => {
  try {
    const business = await Business.getOrCreateProfile();
    return res.status(200).json({
      success: true,
      message: "Business details retrieved successfully",
      data: business
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business details & logo
// @route   PUT /api/business
// @access  Private / ADMIN only
const updateBusiness = async (req, res, next) => {
  try {
    const { businessName, address, phone, email, gstNumber } = req.body;

    const business = await Business.getOrCreateProfile();

    if (businessName !== undefined) business.businessName = businessName.trim();
    if (address !== undefined) business.address = address.trim();
    if (phone !== undefined) business.phone = phone.trim();
    if (email !== undefined) business.email = email.toLowerCase().trim();
    if (gstNumber !== undefined) business.gstNumber = gstNumber.trim().toUpperCase();

    // If a new logo file was uploaded via multer
    if (req.file) {
      // Optional: Clean up old local logo file if it existed
      if (business.logo && business.logo.startsWith("/uploads/logos/")) {
        const oldFilePath = path.join(__dirname, "..", business.logo);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.error("Could not remove old logo file:", e.message);
          }
        }
      }
      business.logo = `/uploads/logos/${req.file.filename}`;
    } else if (req.body.removeLogo === "true" || req.body.logo === "") {
      business.logo = "";
    }

    await business.save();

    return res.status(200).json({
      success: true,
      message: "Business profile updated successfully",
      data: business
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBusiness,
  updateBusiness
};
