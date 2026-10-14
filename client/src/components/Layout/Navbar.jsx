import React from "react";
import { useAuth } from "../../context/AuthContext";
import { StatusBadge } from "../Common/Badges";
import { FiMenu, FiLogOut } from "react-icons/fi";

const Navbar = ({ onToggleSidebar, title = "Dashboard", isCollapsed = false }) => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          className="navbar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar navigation"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          id="btn-navbar-toggle-sidebar"
        >
          <FiMenu size={20} />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="navbar-right">
        <div className="navbar-user-info">
          <StatusBadge status={currentUser?.status || "ACTIVE"} />
          <span className="user-display-name">
            {currentUser?.email}
          </span>
        </div>

        <button
          onClick={logout}
          className="btn btn-outline-danger btn-sm"
          id="btn-navbar-logout"
          title="Sign out of system"
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
