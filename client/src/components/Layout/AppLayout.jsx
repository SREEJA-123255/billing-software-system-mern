import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./Layout.css";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 1024 && window.innerWidth > 768;
    }
    return false;
  });
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024 && window.innerWidth > 768) {
        setIsCollapsed(true);
      } else if (window.innerWidth > 1024) {
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine current page title
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard";
      case "/users":
        return "Users";
      case "/business-settings":
        return "Business Settings";
      case "/products":
        return "Products";
      case "/categories":
        return "Categories";
      case "/inventory":
        return "Inventory";
      case "/purchases":
        return "Purchases";
      case "/purchases/new":
        return "Purchases";
      case "/purchases/history":
        return "Purchases";
      case "/suppliers":
        return "Suppliers";
      case "/customers":
        return "Customers";
      case "/billing":
        return "POS Billing";
      case "/sales":
        return "Sales";
      case "/sales/new":
        return "Sales";
      case "/invoices":
        return "Invoices";
      case "/invoices/new":
        return "Invoices";
      case "/returns":
        return "Returns";
      case "/returns/new":
        return "Returns";
      case "/payments":
        return "Payments";
      case "/expenses":
        return "Expenses";
      case "/reports":
        return "Reports";
      default:
        if (location.pathname.startsWith("/purchases/") && location.pathname.endsWith("/edit")) {
          return "Edit Purchase Order";
        }
        if (location.pathname.startsWith("/purchases/")) {
          return "Purchase Order Details";
        }
        return "Billing & Operations";
    }
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleNavbarToggle = () => {
    if (window.innerWidth > 768) {
      setIsCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className={`app-layout ${isCollapsed ? "layout-sidebar-collapsed" : ""}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="main-wrapper">
        <Navbar
          title={getPageTitle()}
          onToggleSidebar={handleNavbarToggle}
          isCollapsed={isCollapsed}
        />
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
