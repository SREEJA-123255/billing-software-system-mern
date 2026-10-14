import React, { useEffect } from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

const Toast = ({ message, type = "info", onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <FiCheckCircle style={{ color: "#10b981", fontSize: "1.25rem", flexShrink: 0 }} />,
    error: <FiAlertCircle style={{ color: "#ef4444", fontSize: "1.25rem", flexShrink: 0 }} />,
    info: <FiInfo style={{ color: "#0ea5e9", fontSize: "1.25rem", flexShrink: 0 }} />
  };

  const bgStyles = {
    success: { background: "#ffffff", borderLeft: "4px solid #10b981" },
    error: { background: "#ffffff", borderLeft: "4px solid #ef4444" },
    info: { background: "#ffffff", borderLeft: "4px solid #0ea5e9" }
  };

  return (
    <div
      className="toast-notification"
      style={{
        ...bgStyles[type]
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden", flex: 1 }}>
        {icons[type] || icons.info}
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", wordBreak: "break-word" }}>
          {message}
        </span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0
          }}
          aria-label="Close notification"
        >
          <FiX size={16} />
        </button>
      )}
    </div>
  );
};

export default Toast;
