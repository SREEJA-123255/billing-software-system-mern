/**
 * Role-Based Access Control (RBAC) Permissions Configuration
 * Single Source of Truth for Client Navigation, Route Guards & Action Buttons
 * 
 * Rules:
 * ADMIN: everything. Full add, edit, delete on all modules.
 * MANAGER:
 *   - CAN manage: Products, Categories, Inventory, Customers, Suppliers, Purchases, Sales and Billing, Invoices, Sales Returns, Expenses.
 *   - CAN ONLY VIEW: Dashboard, Reports, Payments.
 *   - CANNOT open at all: Users, Business Settings (only GET /api/business is allowed).
 * CASHIER:
 *   - CAN manage: Customers, POS Billing (checkout), Payments.
 *   - CAN ONLY VIEW: Products and Categories (only to pick items on the billing screen), Sales (order history), Invoices.
 *   - CANNOT open at all: Dashboard, Inventory, Suppliers, Purchases, Sales Returns, Expenses, Reports, Users, Business Settings (only GET /api/business is allowed).
 * STAFF:
 *   - CAN manage: Products, Categories, Inventory.
 *   - CANNOT open at all: Dashboard, Customers, Suppliers, Purchases, Sales and Billing, Invoices, Sales Returns, Payments, Expenses, Reports, Users, Business Settings (only GET /api/business is allowed).
 */

export const ROLE_PERMISSIONS = {
  // Modules a role is allowed to view (open page, view in sidebar)
  view: {
    dashboard: ["ADMIN", "MANAGER"],
    users: ["ADMIN"],
    business: ["ADMIN"],
    products: ["ADMIN", "MANAGER", "CASHIER", "STAFF"],
    categories: ["ADMIN", "MANAGER", "CASHIER", "STAFF"],
    inventory: ["ADMIN", "MANAGER", "STAFF"],
    purchases: ["ADMIN", "MANAGER"],
    suppliers: ["ADMIN", "MANAGER"],
    customers: ["ADMIN", "MANAGER", "CASHIER"],
    billing: ["ADMIN", "MANAGER", "CASHIER"],
    sales: ["ADMIN", "MANAGER", "CASHIER"],
    invoices: ["ADMIN", "MANAGER", "CASHIER"],
    returns: ["ADMIN", "MANAGER"],
    payments: ["ADMIN", "MANAGER", "CASHIER"],
    expenses: ["ADMIN", "MANAGER"],
    reports: ["ADMIN", "MANAGER"]
  },
  // Modules a role is allowed to manage (Add, Edit, Delete buttons)
  manage: {
    dashboard: ["ADMIN"],
    users: ["ADMIN"],
    business: ["ADMIN"],
    products: ["ADMIN", "MANAGER", "STAFF"],
    categories: ["ADMIN", "MANAGER", "STAFF"],
    inventory: ["ADMIN", "MANAGER", "STAFF"],
    purchases: ["ADMIN", "MANAGER"],
    suppliers: ["ADMIN", "MANAGER"],
    customers: ["ADMIN", "MANAGER", "CASHIER"],
    billing: ["ADMIN", "MANAGER", "CASHIER"],
    sales: ["ADMIN", "MANAGER"],
    invoices: ["ADMIN", "MANAGER"],
    returns: ["ADMIN", "MANAGER"],
    payments: ["ADMIN", "CASHIER"], // MANAGER is CAN ONLY VIEW!
    expenses: ["ADMIN", "MANAGER"],
    reports: ["ADMIN", "MANAGER"]
  }
};

/**
 * Check if a role can view / access a page
 */
export const canView = (role, moduleName) => {
  if (!role || !ROLE_PERMISSIONS.view[moduleName]) return false;
  return ROLE_PERMISSIONS.view[moduleName].includes(role);
};

/**
 * Check if a role can manage (add, edit, delete) in a module
 */
export const canManage = (role, moduleName) => {
  if (!role || !ROLE_PERMISSIONS.manage[moduleName]) return false;
  return ROLE_PERMISSIONS.manage[moduleName].includes(role);
};

/**
 * Get allowed roles list for ProtectedRoute
 */
export const getAllowedRoles = (moduleName, action = "view") => {
  if (!ROLE_PERMISSIONS[action] || !ROLE_PERMISSIONS[action][moduleName]) {
    return ["ADMIN"];
  }
  return ROLE_PERMISSIONS[action][moduleName];
};

/**
 * Default landing page after login according to Rule 3:
 * ADMIN and MANAGER to /dashboard, CASHIER to /billing, STAFF to /inventory
 */
export const getDefaultLandingPage = (role) => {
  switch (role) {
    case "ADMIN":
    case "MANAGER":
      return "/dashboard";
    case "CASHIER":
      return "/billing";
    case "STAFF":
      return "/inventory";
    default:
      return "/login";
  }
};
