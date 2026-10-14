import React from "react";
import { formatNumber } from "../../utils/formatters";
import "./CommonUI.css";

/**
 * Universal Quantity Cell Component
 * Requirement: Remove the word "units" from cells.
 * Cells show ONLY the number, right aligned, with font-variant-numeric: tabular-nums.
 */
export const QuantityCell = ({ quantity, isLowStock = false, className = "" }) => {
  return (
    <span
      className={`table-quantity-cell ${isLowStock ? "text-danger" : ""} ${className}`}
      style={{
        fontVariantNumeric: "tabular-nums",
        fontWeight: 600,
        color: isLowStock ? "#dc2626" : "#0f172a",
        whiteSpace: "nowrap"
      }}
    >
      {formatNumber(quantity)}
    </span>
  );
};

export default QuantityCell;
