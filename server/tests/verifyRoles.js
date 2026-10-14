const http = require("http");
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Customer = require("../models/Customer");
const Product = require("../models/product");
const Invoice = require("../models/invoice");
const Category = require("../models/category");

function makeRequest({ path, method = "GET", headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === "string" ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (payload && !reqHeaders["Content-Type"]) {
      reqHeaders["Content-Type"] = "application/json";
    }
    if (payload) {
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: "localhost",
        port: 5000,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => (resBody += chunk));
        res.on("end", () => {
          let parsed = resBody;
          try {
            parsed = JSON.parse(resBody);
          } catch (e) {}
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await makeRequest({
    path: "/api/auth/login",
    method: "POST",
    body: { email, password }
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} (status ${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data.token || res.data.data?.token;
}

async function run() {
  await connectDB();

  console.log("Setting up prerequisite test entities...");
  // Create or get Category
  let category = await Category.findOne();
  if (!category) {
    category = await Category.create({ name: "General Test", status: "ACTIVE" });
  }

  // Create or get Customer
  let customer = await Customer.findOne();
  if (!customer) {
    customer = await Customer.create({
      name: "Acme Test Corp",
      phone: "+91 9999900000",
      email: "acme@test.com",
      address: "123 Test St",
      status: "ACTIVE"
    });
  }

  // Create or get Product with stock for sale testing
  let product = await Product.findOne({ stockQuantity: { $gt: 10 } });
  if (!product) {
    product = await Product.create({
      productName: "Test Widget " + Date.now(),
      sku: "SKU-TEST-" + Date.now(),
      category: category._id,
      purchasePrice: 100,
      sellingPrice: 150,
      taxRate: 18,
      stockQuantity: 100,
      minimumStock: 5,
      status: "ACTIVE"
    });
  }

  // Create or get Sale for Invoice prerequisite
  let sale = await require("../models/sale").findOne();
  if (!sale) {
    sale = await require("../models/sale").create({
      customer: customer._id,
      items: [{ product: product._id, quantity: 2, price: product.sellingPrice, total: product.sellingPrice * 2 }],
      subtotal: product.sellingPrice * 2,
      discount: { type: "fixed", value: 0 },
      tax: 0,
      grandTotal: product.sellingPrice * 2,
      paymentMethod: "Cash",
      paymentStatus: "Pending"
    });
  }

  // Create or get unpaid Invoice for payment testing
  let invoice = await Invoice.findOne({ paymentStatus: "Pending" });
  if (!invoice) {
    invoice = await Invoice.create({
      invoiceNumber: "INV-TEST-" + Date.now(),
      sale: sale._id,
      customerDetails: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address
      },
      items: [
        {
          productName: product.productName,
          quantity: 2,
          price: product.sellingPrice,
          total: product.sellingPrice * 2
        }
      ],
      subtotal: 300,
      grandTotal: 354,
      paidAmount: 0,
      paymentMethod: "Cash",
      paymentStatus: "Pending"
    });
  }

  console.log("Logging in as roles...");
  const adminToken = await loginUser(process.env.ADMIN_EMAIL || "admin@example.com", process.env.ADMIN_PASSWORD || "Admin@123");
  const managerToken = await loginUser("manager@example.com", "Password@123");
  const cashierToken = await loginUser("cashier@example.com", "Password@123");
  const staffToken = await loginUser("staff@example.com", "Password@123");

  const results = [];

  async function testCase(role, moduleName, method, path, token, expectedStatus, body = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await makeRequest({ path, method, headers, body });
    const passed = res.status === expectedStatus;
    results.push({
      role,
      module: moduleName,
      method,
      path,
      expected: expectedStatus,
      actual: res.status,
      passed,
      message: res.data?.message || ""
    });
  }

  console.log("\nExecuting test cases...");

  // 1. Unauthenticated tests (No token: 401)
  await testCase("NO TOKEN", "Products", "GET", "/api/products", null, 401);
  await testCase("NO TOKEN", "Dashboard", "GET", "/api/dashboard", null, 401);
  await testCase("NO TOKEN", "Sales", "POST", "/api/sales", null, 401, { customer: customer._id });

  // 2. MANAGER tests
  // - GET /api/users (403)
  await testCase("MANAGER", "Users", "GET", "/api/users", managerToken, 403);
  // - PUT /api/business (403)
  await testCase("MANAGER", "Business", "PUT", "/api/business", managerToken, 403, { name: "Hacked" });
  // - POST /api/payments (403 - Manager is view only!)
  await testCase("MANAGER", "Payments", "POST", "/api/payments", managerToken, 403, {
    invoice: invoice._id,
    customer: customer._id,
    amount: 100,
    paymentMethod: "Cash",
    paymentDate: "2026-10-11"
  });
  // - GET /api/reports/sales (200)
  await testCase("MANAGER", "Reports", "GET", "/api/reports/sales", managerToken, 200);
  // - POST /api/products (201)
  await testCase("MANAGER", "Products", "POST", "/api/products", managerToken, 201, {
    productName: "Manager Created Item " + Date.now(),
    sku: "SKU-MGR-" + Date.now(),
    category: category._id,
    purchasePrice: 50,
    sellingPrice: 80,
    taxRate: 5,
    stockQuantity: 50,
    minimumStock: 10,
    status: "ACTIVE"
  });

  // 3. CASHIER tests
  // - GET /api/purchases (403)
  await testCase("CASHIER", "Purchases", "GET", "/api/purchases", cashierToken, 403);
  // - GET /api/suppliers (403)
  await testCase("CASHIER", "Suppliers", "GET", "/api/suppliers", cashierToken, 403);
  // - POST /api/products (403 - Cashier is view only!)
  await testCase("CASHIER", "Products", "POST", "/api/products", cashierToken, 403, {
    productName: "Cashier Item",
    sku: "SKU-CSH-" + Date.now()
  });
  // - GET /api/products (200)
  await testCase("CASHIER", "Products", "GET", "/api/products", cashierToken, 200);
  // - POST /api/sales (201)
  await testCase("CASHIER", "Sales", "POST", "/api/sales", cashierToken, 201, {
    customer: customer._id,
    items: [{ product: product._id, quantity: 1, price: product.sellingPrice }],
    discount: { type: "fixed", value: 0 },
    taxRate: 0,
    paymentMethod: "Cash",
    paymentStatus: "Paid"
  });
  // - POST /api/payments (201)
  await testCase("CASHIER", "Payments", "POST", "/api/payments", cashierToken, 201, {
    invoice: invoice._id,
    customer: customer._id,
    amount: 50,
    paymentMethod: "Cash",
    paymentDate: "2026-10-11"
  });

  // 4. STAFF tests
  // - GET /api/customers (403)
  await testCase("STAFF", "Customers", "GET", "/api/customers", staffToken, 403);
  // - POST /api/sales (403)
  await testCase("STAFF", "Sales", "POST", "/api/sales", staffToken, 403, {
    customer: customer._id,
    items: [{ product: product._id, quantity: 1, price: 100 }]
  });
  // - GET /api/reports/sales (403)
  await testCase("STAFF", "Reports", "GET", "/api/reports/sales", staffToken, 403);
  // - GET /api/inventory (200)
  await testCase("STAFF", "Inventory", "GET", "/api/inventory", staffToken, 200);
  // - POST /api/products (201)
  await testCase("STAFF", "Products", "POST", "/api/products", staffToken, 201, {
    productName: "Staff Created Item " + Date.now(),
    sku: "SKU-STF-" + Date.now(),
    category: category._id,
    purchasePrice: 20,
    sellingPrice: 35,
    taxRate: 0,
    stockQuantity: 25,
    minimumStock: 5,
    status: "ACTIVE"
  });

  // 5. Additional Edge-Case Tests
  // GET /api/business allowed for all authenticated roles
  await testCase("MANAGER", "Business", "GET", "/api/business", managerToken, 200);
  await testCase("CASHIER", "Business", "GET", "/api/business", cashierToken, 200);
  await testCase("STAFF", "Business", "GET", "/api/business", staffToken, 200);

  // Cashier blocked modules
  await testCase("CASHIER", "Dashboard", "GET", "/api/dashboard", cashierToken, 403);
  await testCase("CASHIER", "Inventory", "GET", "/api/inventory", cashierToken, 403);
  await testCase("CASHIER", "Returns", "GET", "/api/returns", cashierToken, 403);
  await testCase("CASHIER", "Expenses", "GET", "/api/expenses", cashierToken, 403);
  await testCase("CASHIER", "Reports", "GET", "/api/reports/sales", cashierToken, 403);

  // Staff blocked modules
  await testCase("STAFF", "Dashboard", "GET", "/api/dashboard", staffToken, 403);
  await testCase("STAFF", "Purchases", "GET", "/api/purchases", staffToken, 403);
  await testCase("STAFF", "Suppliers", "GET", "/api/suppliers", staffToken, 403);
  await testCase("STAFF", "Payments", "GET", "/api/payments", staffToken, 403);
  await testCase("STAFF", "Expenses", "GET", "/api/expenses", staffToken, 403);
  await testCase("STAFF", "Returns", "GET", "/api/returns", staffToken, 403);

  console.log("\n================ TEST RESULTS SUMMARY ================");
  console.log("Role".padEnd(12) + "Module".padEnd(14) + "Method".padEnd(8) + "Expected".padEnd(10) + "Actual".padEnd(8) + "Status");
  console.log("-".repeat(60));
  let allPassed = true;
  for (const r of results) {
    if (!r.passed) allPassed = false;
    const passStr = r.passed ? "✅ PASS" : "❌ FAIL (" + r.message + ")";
    console.log(
      r.role.padEnd(12) +
      r.module.padEnd(14) +
      r.method.padEnd(8) +
      String(r.expected).padEnd(10) +
      String(r.actual).padEnd(8) +
      passStr
    );
  }
  console.log("-".repeat(60));
  console.log(allPassed ? "ALL TESTS PASSED!" : "SOME TESTS FAILED!");

  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
