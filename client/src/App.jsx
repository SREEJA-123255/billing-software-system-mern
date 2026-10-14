import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/Layout/AppLayout";
import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import UserManagement from "./pages/Users/UserManagement";
import BusinessSettings from "./pages/BusinessSettings/BusinessSettings";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases/Purchases";
import PurchaseForm from "./pages/Purchases/PurchaseForm";
import PurchaseDetails from "./pages/Purchases/PurchaseDetails";
import PurchaseHistory from "./pages/Purchases/PurchaseHistory";
import Suppliers from "./pages/Suppliers/Suppliers";
import Customers from "./pages/Customers/Customers";
import Billing from "./pages/Billing/Billing";
import Sales from "./pages/Sales/Sales";
import NewSale from "./pages/Sales/NewSale/NewSale";
import Invoices from "./pages/Invoices/Invoices";
import NewInvoice from "./pages/Invoices/NewInvoice/NewInvoice";
import Returns from "./pages/Returns/Returns";
import NewReturn from "./pages/Returns/NewReturn/NewReturn";
import Dashboard from "./pages/Dashboard";
import Payment from "./pages/Payment";
import Expense from "./pages/Expense";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound/NotFound";
import { getAllowedRoles, getDefaultLandingPage } from "./config/permissions";

// Public route helper (redirects to role landing page if already logged in)
const PublicOnlyRoute = ({ children }) => {
  const { currentUser, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to={getDefaultLandingPage(currentUser?.role)} replace />;
  }
  return children;
};

// Root index redirect based on role permissions
const RootRedirect = () => {
  const { currentUser } = useAuth();
  return <Navigate to={getDefaultLandingPage(currentUser?.role)} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPassword />
              </PublicOnlyRoute>
            }
          />
          {/* Fallback route redirect to OTP forgot-password */}
          <Route path="/reset-password/*" element={<Navigate to="/forgot-password" replace />} />

          {/* Protected Application Routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<RootRedirect />} />

              {/* Dashboard: ADMIN, MANAGER */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("dashboard")} />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>

              {/* Users & Business Settings: ADMIN only */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("users")} />}>
                <Route path="/users" element={<UserManagement />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("business")} />}>
                <Route path="/business-settings" element={<BusinessSettings />} />
              </Route>

              {/* Products & Categories: ADMIN, MANAGER, CASHIER (view only), STAFF */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("products")} />}>
                <Route path="/products" element={<Products />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("categories")} />}>
                <Route path="/categories" element={<Categories />} />
              </Route>

              {/* Inventory: ADMIN, MANAGER, STAFF (CASHIER blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("inventory")} />}>
                <Route path="/inventory" element={<Inventory />} />
              </Route>

              {/* Purchases & Suppliers: ADMIN, MANAGER only (CASHIER, STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("purchases")} />}>
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/purchases/new" element={<PurchaseForm />} />
                <Route path="/purchases/:id" element={<PurchaseDetails />} />
                <Route path="/purchases/:id/edit" element={<PurchaseForm />} />
                <Route path="/purchases/history" element={<PurchaseHistory />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("suppliers")} />}>
                <Route path="/suppliers" element={<Suppliers />} />
              </Route>

              {/* Customers: ADMIN, MANAGER, CASHIER (STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("customers")} />}>
                <Route path="/customers" element={<Customers />} />
              </Route>

              {/* Billing & Sales: ADMIN, MANAGER, CASHIER (STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("billing")} />}>
                <Route path="/billing" element={<Billing />} />
              </Route>
              {/* Sales View: ADMIN, MANAGER, CASHIER; Sales Create (Backoffice): ADMIN, MANAGER only */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("sales")} />}>
                <Route path="/sales" element={<Sales />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("sales", "manage")} />}>
                <Route path="/sales/new" element={<NewSale />} />
              </Route>

              {/* Invoices View: ADMIN, MANAGER, CASHIER; Invoices Create: ADMIN, MANAGER only */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("invoices")} />}>
                <Route path="/invoices" element={<Invoices />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("invoices", "manage")} />}>
                <Route path="/invoices/new" element={<NewInvoice />} />
              </Route>

              {/* Sales Returns: ADMIN, MANAGER only (CASHIER, STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("returns")} />}>
                <Route path="/returns" element={<Returns />} />
                <Route path="/returns/new" element={<NewReturn />} />
              </Route>

              {/* Payments: ADMIN, MANAGER (view only), CASHIER (manage) (STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("payments")} />}>
                <Route path="/payments" element={<Payment />} />
              </Route>

              {/* Expenses: ADMIN, MANAGER only (CASHIER, STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("expenses")} />}>
                <Route path="/expenses" element={<Expense />} />
              </Route>

              {/* Reports: ADMIN, MANAGER only (CASHIER, STAFF blocked) */}
              <Route element={<ProtectedRoute allowedRoles={getAllowedRoles("reports")} />}>
                <Route path="/reports" element={<Reports />} />
              </Route>

              {/* 404 Inside Layout */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
