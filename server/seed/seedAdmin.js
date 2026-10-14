require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");
const connectDB = require("../config/db");

const seedData = async () => {
  try {
    await connectDB();
    console.log("Seeding Database for Team 1...");

    // Remove existing users & business profile to reset cleanly if requested
    await User.deleteMany();
    await Business.deleteMany();

    // Default Users for each role
    const users = [
      {
        name: process.env.ADMIN_NAME || "System Administrator",
        email: (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim(),
        phone: process.env.ADMIN_PHONE || "+91 9876543210",
        password: process.env.ADMIN_PASSWORD || "Admin@123",
        role: "ADMIN",
        status: "ACTIVE"
      },
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
      },
      {
        name: "Inventory Staff",
        email: "staff@example.com",
        phone: "+91 9876543213",
        password: "Staff@123",
        role: "STAFF",
        status: "ACTIVE"
      },
      {
        name: "Deactivated Employee",
        email: "inactive@example.com",
        phone: "+91 9876543214",
        password: "Inactive@123",
        role: "STAFF",
        status: "INACTIVE"
      }
    ];

    for (const u of users) {
      await User.create(u);
    }
    console.log("Users seeded successfully: ADMIN, MANAGER, CASHIER, STAFF, INACTIVE");

    // Initialize Default Business
    const business = await Business.getOrCreateProfile();
    console.log("Default Business profile seeded:", business.businessName);

    console.log("Seeding Complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedData();
