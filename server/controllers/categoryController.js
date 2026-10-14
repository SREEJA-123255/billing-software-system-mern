const mongoose = require("mongoose");
const Category = require("../models/category");
const Product = require("../models/product");

const escapeRegex = (string = "") => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// CREATE CATEGORY
const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const cleanName = String(name).trim().replace(/\s+/g, " ");

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Category name must be at least 2 characters"
      });
    }

    // Unique ignoring case and extra spaces
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") }
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists"
      });
    }

    const category = await Category.create({
      name: cleanName,
      description: description ? String(description).trim() : "",
      status: status && ["ACTIVE", "INACTIVE"].includes(String(status).toUpperCase())
        ? String(status).toUpperCase()
        : "ACTIVE"
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message
    });
  }
};

// GET ALL CATEGORIES + SEARCH
const getCategories = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (search && search.trim()) {
      filter.name = {
        $regex: escapeRegex(search.trim()),
        $options: "i"
      };
    }

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }

    const categories = await Category.find(filter).sort({ createdAt: -1, _id: -1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
};

// GET SINGLE CATEGORY
const getCategoryById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message
    });
  }
};

// UPDATE CATEGORY
const updateCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const { name, description, status } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    if (name !== undefined) {
      const cleanName = String(name).trim().replace(/\s+/g, " ");
      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty"
        });
      }

      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Category name must be at least 2 characters"
        });
      }

      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") },
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Another category with this name already exists"
        });
      }

      category.name = cleanName;
    }

    if (description !== undefined) {
      category.description = String(description).trim();
    }

    if (status !== undefined) {
      const upperStatus = String(status).toUpperCase();
      if (!["ACTIVE", "INACTIVE"].includes(upperStatus)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE"
        });
      }
      category.status = upperStatus;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another category with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message
    });
  }
};

// DELETE / DEACTIVATE CATEGORY
const deleteCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Check if category has any products
    const productCount = await Product.countDocuments({ category: req.params.id });

    const isDeactivateRequest =
      req.query.action === "deactivate" ||
      req.body?.action === "deactivate" ||
      req.query.deactivate === "true";

    const isPermanentDelete =
      req.query.permanent === "true" ||
      req.query.action === "delete" ||
      req.body?.action === "delete";

    if (productCount > 0 && !isDeactivateRequest) {
      return res.status(400).json({
        success: false,
        hasProducts: true,
        productCount,
        message: `Cannot delete category "${category.name}" because it contains ${productCount} product(s). You can deactivate it instead.`
      });
    }

    if (isPermanentDelete || (!isDeactivateRequest && productCount === 0)) {
      await Category.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: `Category "${category.name}" deleted successfully`
      });
    }

    // Deactivate category (preserving database records)
    category.status = "INACTIVE";
    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category "${category.name}" deactivated successfully`,
      data: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process category deletion",
      error: error.message
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};