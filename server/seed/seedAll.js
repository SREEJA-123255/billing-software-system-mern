require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");
const Category = require("../models/category");
const Product = require("../models/product");
const Customer = require("../models/Customer");
const connectDB = require("../config/db");

const seedData = async () => {
  try {
    await connectDB();
    console.log("🌱 Starting Full Database Seeding for Billing Software...");

    // 1. Seed Users
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: process.env.ADMIN_NAME || "System Administrator",
        email: adminEmail,
        phone: process.env.ADMIN_PHONE || "+91 9876543210",
        password: process.env.ADMIN_PASSWORD || "Admin@123",
        role: "ADMIN",
        status: "ACTIVE"
      });
      console.log("✅ Admin user seeded");
    }

    const defaultStaff = [
      {
        name: "Store Manager",
        email: "manager@example.com",
        phone: "+91 9876543211",
        password: "Manager@123",
        role: "MANAGER",
        status: "ACTIVE"
      },
      {
        name: "Billing Cashier",
        email: "cashier@example.com",
        phone: "+91 9876543212",
        password: "Cashier@123",
        role: "CASHIER",
        status: "ACTIVE"
      }
    ];

    for (const u of defaultStaff) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`✅ User seeded: ${u.email}`);
      }
    }

    // 2. Seed Business Profile
    const business = await Business.getOrCreateProfile();
    console.log("✅ Business profile initialized:", business.businessName);

    // 3. Seed Default Categories
    const defaultCategories = [
      { name: "Electronics", description: "Peripherals, gadgets and computer accessories" },
      { name: "Grocery", description: "Everyday essentials and packaged goods" },
      { name: "Clothing", description: "Apparel, garments and textiles" },
      { name: "Stationery", description: "Office supplies, notebooks and pens" }
    ];

    const categoryMap = {};
    for (const cat of defaultCategories) {
      let existingCat = await Category.findOne({ name: { $regex: new RegExp(`^${cat.name}$`, "i") } });
      if (!existingCat) {
        existingCat = await Category.create(cat);
        console.log(`✅ Category created: ${cat.name}`);
      }
      categoryMap[cat.name] = existingCat._id;
    }

    // 4. Seed Default Products
    const defaultProducts = [
      {
        productName: "Wireless Optical Mouse",
        sku: "MOU-OPT-01",
        category: categoryMap["Electronics"],
        purchasePrice: 180,
        sellingPrice: 350,
        stockQuantity: 50,
        minimumStock: 5,
        taxRate: 18,
        status: "ACTIVE"
      },
      {
        productName: "Mechanical USB Keyboard",
        sku: "KB-MECH-01",
        category: categoryMap["Electronics"],
        purchasePrice: 650,
        sellingPrice: 1199,
        stockQuantity: 30,
        minimumStock: 5,
        taxRate: 18,
        status: "ACTIVE"
      },
      {
        productName: "Executive Spiral Notebook A4",
        sku: "STAT-A4-01",
        category: categoryMap["Stationery"],
        purchasePrice: 60,
        sellingPrice: 120,
        stockQuantity: 100,
        minimumStock: 10,
        taxRate: 12,
        status: "ACTIVE"
      }
    ];

    for (const prod of defaultProducts) {
      if (!prod.category) continue;
      const exists = await Product.findOne({
        $or: [{ productName: prod.productName }, { sku: prod.sku }]
      });
      if (!exists) {
        await Product.create(prod);
        console.log(`✅ Product created: ${prod.productName}`);
      }
    }

    // 5. Seed Default Customer
    const walkinExists = await Customer.findOne({ name: "Walk-in Retail Customer" });
    if (!walkinExists) {
      await Customer.create({
        name: "Walk-in Retail Customer",
        phone: "9876543210",
        email: "customer@example.com",
        address: "Counter POS Desk",
        status: "Active"
      });
      console.log("✅ Default Customer seeded: Walk-in Retail Customer");
    }

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
};

seedData();
