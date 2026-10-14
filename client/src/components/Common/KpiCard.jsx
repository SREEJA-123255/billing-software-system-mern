import React from "react";
import "./CommonUI.css";

/**
 * Universal KPI Summary Card
 * Consistent layout, auto-scaling font size, no truncation, wrap allowed
 */
export const KpiCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "primary" // primary, success, warning, danger, neutral, blue
}) => {
  return (
    <div className="universal-kpi-card">
      <div className="kpi-card-info">
        <span className="kpi-card-label">{label}</span>
        <span className="kpi-card-value">{value}</span>
        {subtext && <span className="kpi-card-subtext">{subtext}</span>}
      </div>
      {Icon && (
        <div className={`kpi-card-icon icon-variant-${variant}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
};

export const KpiGrid = ({ children, columns = 4, className = "" }) => {
  return (
    <div className={`universal-kpi-grid cols-${columns} ${className}`}>
      {children}
    </div>
  );
};

export default KpiCard;
