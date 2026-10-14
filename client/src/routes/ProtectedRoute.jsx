import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultLandingPage } from "../config/permissions";

const ProtectedRoute = ({ allowedRoles = null }) => {
  const { currentUser, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="spinner spinner-primary" style={{ width: "3rem", height: "3rem", borderWidth: "3px" }}></div>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is not allowed on this route -> immediately redirect to their allowed home page (never show Access Restricted dead-end)
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const landing = getDefaultLandingPage(currentUser.role);
    return <Navigate to={landing} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
