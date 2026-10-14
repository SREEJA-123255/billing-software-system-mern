require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const businessRoutes = require("./routes/businessRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const customerRoutes = require("./routes/customerRoutes");
const customerHistoryRoutes = require("./routes/customerHistoryRoutes");
const saleRoutes = require("./routes/saleRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const returnRoutes = require("./routes/returnRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { authenticate, authorizeModule } = require("./middleware/authMiddleware");
const {
  notFound,
  errorHandler
} = require("./middleware/errorMiddleware");
const User = require("./models/User");
const Business = require("./models/Business");

const app = express();

// Connect to MongoDB
connectDB();

// Ensure uploads/logos directory exists
const uploadDir = path.join(__dirname, "uploads/logos");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// System Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "Billing System API (Team 1 - Auth, Users & Business) is operational",
    timestamp: new Date().toISOString()
  });
});

// Team 1 API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authenticate, authorizeModule("users"), userRoutes);
app.use("/api/business", businessRoutes);

// Team 2 API routes
app.use("/api/products", authenticate, authorizeModule("products"), productRoutes);
app.use("/api/categories", authenticate, authorizeModule("categories"), categoryRoutes);
app.use("/api/inventory", authenticate, authorizeModule("inventory"), inventoryRoutes);

// Team 3 API routes
app.use("/api/purchases", authenticate, authorizeModule("purchases"), purchaseRoutes);
app.use("/api/suppliers", authenticate, authorizeModule("suppliers"), supplierRoutes);
app.use("/api/customers", authenticate, authorizeModule("customers"), customerHistoryRoutes);
app.use("/api/customers", authenticate, authorizeModule("customers"), customerRoutes);

// Team 4 API routes
app.use("/api/sales", authenticate, authorizeModule("sales"), saleRoutes);
app.use("/api/invoices", authenticate, authorizeModule("invoices"), invoiceRoutes);
app.use("/api/returns", authenticate, authorizeModule("returns"), returnRoutes);

// Team 5 API routes
app.use("/api/payments", authenticate, authorizeModule("payments"), paymentRoutes);
app.use("/api/expenses", authenticate, authorizeModule("expenses"), expenseRoutes);
app.use("/api/reports", authenticate, authorizeModule("reports"), reportRoutes);
app.use("/api/dashboard", authenticate, authorizeModule("dashboard"), dashboardRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Billing Software API Server - Team 1 Active");
});

// Initialize default admin and business profile
const initDefaultData = async () => {
  try {
    const adminEmail = (
      process.env.ADMIN_EMAIL || "admin@example.com"
    )
      .toLowerCase()
      .trim();

    const adminPassword =
      process.env.ADMIN_PASSWORD || "Admin@123";

    const adminName =
      process.env.ADMIN_NAME || "System Administrator";

    const adminPhone =
      process.env.ADMIN_PHONE || "+91 9876543210";

    const existingAdmin = await User.findOne({
      email: adminEmail
    });

    if (!existingAdmin) {
      console.log(`Creating default admin (${adminEmail})...`);

      await User.create({
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: adminPassword,
        role: "ADMIN",
        status: "ACTIVE"
      });

      console.log(`Default Admin initialized: ${adminEmail}`);
    }

    // Ensure business profile exists
    await Business.getOrCreateProfile();
  } catch (err) {
    console.error(
      "Initialization check error:",
      err.message
    );
  }
};

initDefaultData();

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Server configuration
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Billing System Backend running on port ${PORT}`
  );
});

// Handle server startup errors
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `ERROR: Port ${PORT} is already in use.`
    );
    console.error(
      "The backend may already be running in another terminal."
    );
    console.error(
      "Check the existing process or configure a different PORT in .env."
    );

    process.exitCode = 1;
    return;
  }

  console.error("Backend server error:", err);
  process.exitCode = 1;
});

module.exports = app;