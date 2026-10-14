import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "../Common/Badges";
import { canView } from "../../config/permissions";
import {
  FiUsers,
  FiSettings,
  FiLogOut,
  FiX,
  FiChevronRight,
  FiPackage,
  FiLayers,
  FiArchive,
  FiShoppingBag,
  FiTruck,
  FiUserCheck,
  FiShoppingCart,
  FiFileText,
  FiCheckSquare,
  FiRotateCcw,
  FiGrid,
  FiCreditCard,
  FiDollarSign,
  FiBarChart2
} from "react-icons/fi";
import logoImg from "../../assets/logo.png";

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { currentUser, logout } = useAuth();
  const role = currentUser?.role;

  const handleCrossOrExpandClick = () => {
    // If on mobile (<= 768px), close the drawer overlay
    if (window.innerWidth <= 768) {
      onClose();
    } else {
      // On desktop/tablet, toggle collapse to icon-only mode
      onToggleCollapse();
    }
  };

  const showCatalogSection =
    canView(role, "products") ||
    canView(role, "categories") ||
    canView(role, "inventory");

  const showPurchasesSection =
    canView(role, "purchases") ||
    canView(role, "suppliers");

  const showBillingSection =
    canView(role, "billing") ||
    canView(role, "sales") ||
    canView(role, "invoices") ||
    canView(role, "returns");

  const showFinanceSection =
    canView(role, "payments") ||
    canView(role, "expenses") ||
    canView(role, "reports");

  const showAdminSection =
    canView(role, "users") ||
    canView(role, "business");

  return (
    <>
      {/* Overlay for mobile drawer */}
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className={`sidebar-brand ${isCollapsed ? "brand-collapsed" : ""}`}>
          <div
            className="sidebar-logo-wrapper"
            style={{ width: "40px", height: "40px", minWidth: "40px", maxWidth: "40px", overflow: "hidden" }}
            title={isCollapsed ? "Click to expand sidebar" : "IT Spaxios Innovation"}
            onClick={isCollapsed ? onToggleCollapse : undefined}
            role={isCollapsed ? "button" : undefined}
            tabIndex={isCollapsed ? 0 : undefined}
          >
            <img
              src={logoImg}
              alt="IT Spaxios Innovation Logo"
              className="sidebar-logo-img"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>

          {!isCollapsed && (
            <div className="sidebar-brand-text">
              <h2>IT Spaxios</h2>
              <span>Innovation</span>
            </div>
          )}

          {/* Close / Collapse Cross Button (or Expand Arrow when collapsed) */}
          <button
            onClick={handleCrossOrExpandClick}
            className={`sidebar-collapse-btn ${isCollapsed ? "btn-expand" : "btn-close"}`}
            title={isCollapsed ? "Expand sidebar" : "Close sidebar (show only icons)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Close sidebar to icons only"}
            id="btn-sidebar-toggle-cross"
          >
            {isCollapsed ? <FiChevronRight size={16} /> : <FiX size={18} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {canView(role, "dashboard") && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              title="Dashboard"
              data-tooltip="Dashboard"
              onClick={() => {
                if (window.innerWidth <= 768) onClose();
              }}
            >
              <span className="nav-item-icon">
                <FiGrid />
              </span>
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
          )}

          {/* Administration (ADMIN only) */}
          {!isCollapsed && showAdminSection && (
            <div className="nav-section-title" style={{ marginTop: canView(role, "dashboard") ? "1rem" : 0 }}>
              Administration
            </div>
          )}

          {canView(role, "users") && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              title="Users"
              data-tooltip="Users"
              onClick={() => {
                if (window.innerWidth <= 768) onClose();
              }}
            >
              <span className="nav-item-icon">
                <FiUsers />
              </span>
              {!isCollapsed && <span>Users</span>}
            </NavLink>
          )}

          {canView(role, "business") && (
            <NavLink
              to="/business-settings"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              title="Business Settings"
              data-tooltip="Business Settings"
              onClick={() => {
                if (window.innerWidth <= 768) onClose();
              }}
            >
              <span className="nav-item-icon">
                <FiSettings />
              </span>
              {!isCollapsed && <span>Business Settings</span>}
            </NavLink>
          )}

          {/* Catalog & Inventory */}
          {showCatalogSection && (
            <>
              {!isCollapsed && (
                <div className="nav-section-title" style={{ marginTop: "1rem" }}>
                  Catalog & Inventory
                </div>
              )}

              {canView(role, "products") && (
                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Products"
                  data-tooltip="Products"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiPackage />
                  </span>
                  {!isCollapsed && <span>Products</span>}
                </NavLink>
              )}

              {canView(role, "categories") && (
                <NavLink
                  to="/categories"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Categories"
                  data-tooltip="Categories"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiLayers />
                  </span>
                  {!isCollapsed && <span>Categories</span>}
                </NavLink>
              )}

              {canView(role, "inventory") && (
                <NavLink
                  to="/inventory"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Inventory"
                  data-tooltip="Inventory"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiArchive />
                  </span>
                  {!isCollapsed && <span>Inventory</span>}
                </NavLink>
              )}
            </>
          )}

          {/* Purchases & Partners */}
          {showPurchasesSection && (
            <>
              {!isCollapsed && (
                <div className="nav-section-title" style={{ marginTop: "1rem" }}>
                  Purchases & Partners
                </div>
              )}

              {canView(role, "purchases") && (
                <NavLink
                  to="/purchases"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Purchases"
                  data-tooltip="Purchases"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiShoppingBag />
                  </span>
                  {!isCollapsed && <span>Purchases</span>}
                </NavLink>
              )}

              {canView(role, "suppliers") && (
                <NavLink
                  to="/suppliers"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Suppliers"
                  data-tooltip="Suppliers"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiTruck />
                  </span>
                  {!isCollapsed && <span>Suppliers</span>}
                </NavLink>
              )}
            </>
          )}

          {/* Customers */}
          {canView(role, "customers") && (
            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              title="Customers"
              data-tooltip="Customers"
              onClick={() => {
                if (window.innerWidth <= 768) onClose();
              }}
            >
              <span className="nav-item-icon">
                <FiUserCheck />
              </span>
              {!isCollapsed && <span>Customers</span>}
            </NavLink>
          )}

          {/* Billing & POS */}
          {showBillingSection && (
            <>
              {!isCollapsed && (
                <div className="nav-section-title" style={{ marginTop: "1rem" }}>
                  Billing & POS
                </div>
              )}

              {canView(role, "billing") && (
                <NavLink
                  to="/billing"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="POS Billing"
                  data-tooltip="POS Billing"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiShoppingCart />
                  </span>
                  {!isCollapsed && <span>POS Billing</span>}
                </NavLink>
              )}

              {canView(role, "sales") && (
                <NavLink
                  to="/sales"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Sales"
                  data-tooltip="Sales"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiFileText />
                  </span>
                  {!isCollapsed && <span>Sales</span>}
                </NavLink>
              )}

              {canView(role, "invoices") && (
                <NavLink
                  to="/invoices"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Invoices"
                  data-tooltip="Invoices"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiCheckSquare />
                  </span>
                  {!isCollapsed && <span>Invoices</span>}
                </NavLink>
              )}

              {canView(role, "returns") && (
                <NavLink
                  to="/returns"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Returns"
                  data-tooltip="Returns"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiRotateCcw />
                  </span>
                  {!isCollapsed && <span>Returns</span>}
                </NavLink>
              )}
            </>
          )}

          {/* Finance & Reports */}
          {showFinanceSection && (
            <>
              {!isCollapsed && (
                <div className="nav-section-title" style={{ marginTop: "1rem" }}>
                  Finance & Reports
                </div>
              )}

              {canView(role, "payments") && (
                <NavLink
                  to="/payments"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Payments"
                  data-tooltip="Payments"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiCreditCard />
                  </span>
                  {!isCollapsed && <span>Payments</span>}
                </NavLink>
              )}

              {canView(role, "expenses") && (
                <NavLink
                  to="/expenses"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Expenses"
                  data-tooltip="Expenses"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiDollarSign />
                  </span>
                  {!isCollapsed && <span>Expenses</span>}
                </NavLink>
              )}

              {canView(role, "reports") && (
                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  title="Reports"
                  data-tooltip="Reports"
                  onClick={() => {
                    if (window.innerWidth <= 768) onClose();
                  }}
                >
                  <span className="nav-item-icon">
                    <FiBarChart2 />
                  </span>
                  {!isCollapsed && <span>Reports</span>}
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Sidebar Footer with Logged in user info & Logout */}
        <div className={`sidebar-footer ${isCollapsed ? "footer-collapsed" : ""}`}>
          <div className="user-mini-card">
            <div
              className="user-avatar"
              title={`${currentUser?.name || "User"} (${currentUser?.role || "STAFF"})`}
              onClick={isCollapsed ? onToggleCollapse : undefined}
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser?.name || "Avatar"}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span>{(currentUser?.name || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>

            {!isCollapsed && (
              <div className="user-info-text">
                <div className="user-name" title={currentUser?.name || "Logged User"}>
                  {currentUser?.name || "Logged User"}
                </div>
                <div className="user-role-line">
                  <RoleBadge role={currentUser?.role || "STAFF"} />
                </div>
              </div>
            )}

            {!isCollapsed && (
              <button
                onClick={logout}
                className="btn-logout"
                title="Log out from system"
                aria-label="Log out"
                id="btn-sidebar-logout"
              >
                <FiLogOut />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
