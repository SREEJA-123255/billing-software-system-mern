import React from "react";
import { FiInbox, FiPlus } from "react-icons/fi";
import "./EmptyState.css";

const EmptyState = ({
  icon: Icon = FiInbox,
  title = "No records found",
  description = "Get started by creating your first entry.",
  actionLabel,
  onAction,
  className = ""
}) => {
  return (
    <div className={`universal-empty-state ${className}`}>
      <div className="empty-state-icon-wrapper">
        <Icon className="empty-state-icon" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary btn-sm empty-state-btn"
          onClick={onAction}
        >
          <FiPlus />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
