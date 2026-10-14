import React from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";

const NotFound = () => {
  return (
    <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
      <div style={{ fontSize: "3rem", color: "#f59e0b", marginBottom: "1rem" }}>
        <FiAlertCircle />
      </div>
      <h2 style={{ fontSize: "1.75rem", color: "#0f172a", marginBottom: "0.5rem" }}>
        Page Not Found
      </h2>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
