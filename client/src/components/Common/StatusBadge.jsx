import React from "react";
import "./StatusBadge.css";

/**
 * Universal Shared StatusBadge Component
 * Standardizes status labels, size, and colors across every page:
 * - Active: Green
 * - Inactive: Grey
 * - Paid: Green
 * - Partially Paid: Amber
 * - Pending: Red
 */

export function normalizeStatus(rawStatus) {
  if (!rawStatus) return { label: "Pending", variant: "pending" };

  const s = String(rawStatus).trim().toUpperCase();

  // Active / Paid
  if (s === "ACTIVE") {
    return { label: "Active", variant: "active" };
  }
  if (s === "PAID" || s === "COMPLETED" || s === "SETTLED" || s === "SUCCESS") {
    return { label: "Paid", variant: "paid" };
  }

  // Partially Paid
  if (s === "PARTIAL" || s === "PARTIALLY_PAID" || s === "PARTIALLY PAID") {
    return { label: "Partially Paid", variant: "partial" };
  }

  // Pending / Unpaid
  if (s === "PENDING" || s === "UNPAID" || s === "DUE" || s === "OVERDUE") {
    return { label: "Pending", variant: "pending" };
  }

  // Stock Health indicators
  if (s === "IN STOCK" || s === "IN_STOCK") {
    return { label: "In Stock", variant: "active" };
  }
  if (s === "LOW STOCK" || s === "LOW_STOCK") {
    return { label: "Low Stock", variant: "pending" };
  }
  if (s === "OUT OF STOCK" || s === "OUT_OF_STOCK") {
    return { label: "Out of Stock", variant: "danger-dark" };
  }

  // Inactive / Cancelled
  if (s === "INACTIVE" || s === "CANCELLED" || s === "CANCELED" || s === "REJECTED") {
    return { label: "Inactive", variant: "inactive" };
  }

  // Default fallback
  const formatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  return { label: formatted, variant: "inactive" };
}

export const StatusBadge = ({ status, className = "" }) => {
  const { label, variant } = normalizeStatus(status);

  return (
    <span className={`universal-status-badge badge-${variant} ${className}`}>
      <span className="badge-dot" />
      <span className="badge-text">{label}</span>
    </span>
  );
};

export const RoleBadge = ({ role = "STAFF", className = "" }) => {
  const r = String(role).toUpperCase();
  const roleClasses = {
    ADMIN: "role-admin",
    MANAGER: "role-manager",
    CASHIER: "role-cashier",
    STAFF: "role-staff"
  };

  return (
    <span className={`universal-role-badge ${roleClasses[r] || "role-staff"} ${className}`}>
      {r}
    </span>
  );
};

export default StatusBadge;
