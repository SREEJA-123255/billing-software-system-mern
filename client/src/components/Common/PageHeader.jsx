import React from "react";
import "./CommonUI.css";

/**
 * Universal Page Header Component
 * Strict structure: page title and one-line description on the left, primary action button on the right
 */
export const PageHeader = ({ title, description, actionButton }) => {
  return (
    <div className="universal-page-header">
      <div className="page-header-content">
        <h2 className="page-header-title">{title}</h2>
        {description && <p className="page-header-description">{description}</p>}
      </div>
      {actionButton && <div className="page-header-action">{actionButton}</div>}
    </div>
  );
};

export default PageHeader;
