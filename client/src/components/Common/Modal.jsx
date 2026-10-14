import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

const Modal = ({ isOpen, onClose, title, children, maxWidth = "560px" }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="custom-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="custom-modal-container"
        style={{ maxWidth }}
      >
        {/* Modal Header */}
        <div className="custom-modal-header">
          <h3 className="custom-modal-title">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="custom-modal-close-btn"
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="custom-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
