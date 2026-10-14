/**
 * Role-Based Access Control (RBAC) Permissions Configuration
 * Single Source of Truth for Server Route Authorization
 * 
 * Rules:
 * - DENY BY DEFAULT: Every route requires authentication and explicit role permission.
 * - ADMIN: Full access to everything (read & write).
 * - MANAGER:
 *   - CAN manage: Products, Categories, Inventory, Customers, Suppliers, Purchases, Sales and Billing, Invoices, Sales Returns, Expenses.
 *   - CAN ONLY VIEW: Dashboard, Reports, Payments.
 *   - CANNOT open at all: Users, Business Settings (except GET /api/business).
 * - CASHIER:
 *   - CAN manage: Customers, Sales and Billing, Payments.
 *   - CAN ONLY VIEW: Products, Categories, Invoices.
 *   - CANNOT open at all: Dashboard, Inventory, Suppliers, Purchases, Sales Returns, Expenses, Reports, Users, Business Settings (except GET /api/business).
 * - STAFF:
 *   - CAN manage: Products, Categories, Inventory.
 *   - CANNOT open at all: Dashboard, Customers, Suppliers, Purchases, Sales and Billing, Invoices, Sales Returns, Payments, Expenses, Reports, Users, Business Settings (except GET /api/business).
 */

const ROLE_PERMISSIONS = {
  // Allowed roles for GET, HEAD, OPTIONS
  read: {
    dashboard: ["ADMIN", "MANAGER"],
    users: ["ADMIN"],
    business: ["ADMIN", "MANAGER", "CASHIER", "STAFF"],
    products: ["ADMIN", "MANAGER", "CASHIER", "STAFF"],
    categories: ["ADMIN", "MANAGER", "CASHIER", "STAFF"],
    inventory: ["ADMIN", "MANAGER", "STAFF"],
    customers: ["ADMIN", "MANAGER", "CASHIER"],
    suppliers: ["ADMIN", "MANAGER"],
    purchases: ["ADMIN", "MANAGER"],
    sales: ["ADMIN", "MANAGER", "CASHIER"],
    invoices: ["ADMIN", "MANAGER", "CASHIER"],
    returns: ["ADMIN", "MANAGER"],
    payments: ["ADMIN", "MANAGER", "CASHIER"],
    expenses: ["ADMIN", "MANAGER"],
    reports: ["ADMIN", "MANAGER"]
  },
  // Allowed roles for POST, PUT, PATCH, DELETE
  write: {
    dashboard: ["ADMIN"],
    users: ["ADMIN"],
    business: ["ADMIN"],
    products: ["ADMIN", "MANAGER", "STAFF"],
    categories: ["ADMIN", "MANAGER", "STAFF"],
    inventory: ["ADMIN", "MANAGER", "STAFF"],
    customers: ["ADMIN", "MANAGER", "CASHIER"],
    suppliers: ["ADMIN", "MANAGER"],
    purchases: ["ADMIN", "MANAGER"],
    sales: ["ADMIN", "MANAGER", "CASHIER"],
    invoices: ["ADMIN", "MANAGER", "CASHIER"],
    returns: ["ADMIN", "MANAGER"],
    payments: ["ADMIN", "CASHIER"], // MANAGER is view-only on payments
    expenses: ["ADMIN", "MANAGER"],
    reports: ["ADMIN", "MANAGER"]
  }
};

/**
 * Middleware factory to authorize requests against ROLE_PERMISSIONS.
 * Automatically inspects HTTP method: GET/HEAD -> read, POST/PUT/PATCH/DELETE -> write.
 */
const authorizeModule = (moduleName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid Bearer token."
      });
    }

    const role = req.user.role;
    const method = req.method.toUpperCase();
    const isRead = ["GET", "HEAD", "OPTIONS"].includes(method);

    const allowedRoles = isRead
      ? (ROLE_PERMISSIONS.read[moduleName] || [])
      : (ROLE_PERMISSIONS.write[moduleName] || []);

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${role}' is not authorized to ${isRead ? "view" : "modify"} ${moduleName}.`
      });
    }

    next();
  };
};

module.exports = {
  ROLE_PERMISSIONS,
  authorizeModule
};
