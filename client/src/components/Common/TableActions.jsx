import React, { useState, useRef, useEffect } from "react";
import {
  FiEye,
  FiEdit2,
  FiSliders,
  FiPrinter,
  FiSlash,
  FiCheck,
  FiTrash2,
  FiChevronDown
} from "react-icons/fi";
import "./TableActions.css";

/**
 * Universal Action Buttons Component
 * Strict Enterprise Standard (TCS / Infosys / Zoho level):
 * - Small labelled text buttons (height 32px, 12px horizontal padding, 13px font)
 * - Visible buttons: max 2 per row (+ "More" dropdown for 3rd/4th actions on Customers/Suppliers)
 * - Exact names: "View", "Edit", "Deactivate", "Activate", "Delete", "Print", "Adjust Stock"
 * - Styles: View, Edit, Print, Adjust Stock = neutral outline; Deactivate = amber outline; Activate = green outline; Delete = red outline
 * - Fixed slot for Activate/Deactivate so Active and Inactive rows sit in the exact same position
 */
export const TableActions = ({
  onView,
  onPrint,
  onAdjust,
  onEdit,
  status,
  onDeactivate,
  onActivate,
  onDelete,
  disabledDelete = false,
  disabledDeactivate = false,
  disabledActivate = false,
  viewTitle = "View",
  printTitle = "Print",
  adjustTitle = "Adjust Stock",
  editTitle = "Edit",
  deactivateTitle = "Deactivate",
  activateTitle = "Activate",
  deleteTitle = "Delete",
  isMobileCard = false,
  className = ""
}) => {
  const isInactive = String(status || "").toUpperCase() === "INACTIVE";
  const [menuOpen, setMenuOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleToggleMenu = (e) => {
    e.stopPropagation();
    if (!menuOpen && btnRef.current) {
      const isFirstRow = Boolean(btnRef.current.closest("tr:first-child"));
      const isSecondRow = Boolean(btnRef.current.closest("tr:nth-child(2)"));
      const isLastRow = Boolean(btnRef.current.closest("tr:last-child"));

      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;

      const tableContainer = btnRef.current.closest(".table-container");
      const containerRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
      const containerSpaceBelow = containerRect ? containerRect.bottom - rect.bottom : spaceBelow;

      // First row always opens downwards to prevent overlapping the table header
      if (isFirstRow) {
        setOpenUpwards(false);
      } else if (isSecondRow || isLastRow) {
        // Second row or last row opens upwards so Deactivate/Delete never falls below table
        setOpenUpwards(true);
      } else if (containerSpaceBelow < 120 || spaceBelow < 120) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
    setMenuOpen((prev) => !prev);
  };

  // Mobile Card Mode (full-width stacked/grid buttons at card bottom)
  if (isMobileCard) {
    return (
      <div className={`table-actions-mobile ${className}`}>
        {onView && (
          <button
            type="button"
            className="btn-action-text btn-action-neutral btn-action-full"
            onClick={onView}
            title={viewTitle}
          >
            <FiEye size={14} />
            <span>View</span>
          </button>
        )}
        {onPrint && (
          <button
            type="button"
            className="btn-action-text btn-action-neutral btn-action-full"
            onClick={onPrint}
            title={printTitle}
          >
            <FiPrinter size={14} />
            <span>Print</span>
          </button>
        )}
        {onAdjust && (
          <button
            type="button"
            className="btn-action-text btn-action-adjust btn-action-full"
            onClick={onAdjust}
            title={adjustTitle}
          >
            <FiSliders size={14} />
            <span>Adjust Stock</span>
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            className="btn-action-text btn-action-neutral btn-action-full"
            onClick={onEdit}
            title={editTitle}
          >
            <FiEdit2 size={14} />
            <span>Edit</span>
          </button>
        )}
        {isInactive && onActivate && (
          <button
            type="button"
            className="btn-action-text btn-action-activate btn-action-full"
            onClick={onActivate}
            disabled={disabledActivate}
            title={activateTitle}
          >
            <FiCheck size={14} />
            <span>Activate</span>
          </button>
        )}
        {!isInactive && onDeactivate && (
          <button
            type="button"
            className="btn-action-text btn-action-deactivate btn-action-full"
            onClick={onDeactivate}
            disabled={disabledDeactivate}
            title={deactivateTitle}
          >
            <FiSlash size={14} />
            <span>Deactivate</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="btn-action-text btn-action-delete btn-action-full"
            onClick={onDelete}
            disabled={disabledDelete}
            title={deleteTitle}
          >
            <FiTrash2 size={14} />
            <span>Delete</span>
          </button>
        )}
      </div>
    );
  }

  // Check if we need "More" dropdown:
  // Customers & Suppliers have onView + onEdit + (status toggle or onDelete)
  const hasMoreMenu =
    Boolean(onView && onEdit && (onDeactivate || onActivate || onDelete));

  return (
    <div className={`table-actions-group ${menuOpen ? "dropdown-active" : ""} ${className}`} ref={menuRef}>
      {/* 1. View Button */}
      {onView && (
        <button
          type="button"
          className="btn-action-text btn-action-neutral"
          onClick={onView}
          title={viewTitle}
        >
          <FiEye size={13} />
          <span>View</span>
        </button>
      )}

      {/* 2. Print Button */}
      {onPrint && (
        <button
          type="button"
          className="btn-action-text btn-action-neutral"
          onClick={onPrint}
          title={printTitle}
        >
          <FiPrinter size={13} />
          <span>Print</span>
        </button>
      )}

      {/* 3. Adjust Stock Button */}
      {onAdjust && (
        <button
          type="button"
          className="btn-action-text btn-action-adjust"
          onClick={onAdjust}
          title={adjustTitle}
        >
          <FiSliders size={13} />
          <span>Adjust Stock</span>
        </button>
      )}

      {/* 4. Edit Button */}
      {onEdit && (
        <button
          type="button"
          className="btn-action-text btn-action-neutral"
          onClick={onEdit}
          title={editTitle}
        >
          <FiEdit2 size={13} />
          <span>Edit</span>
        </button>
      )}

      {/* If Customers / Suppliers (has onView and onEdit and extra actions): Show "More" Dropdown */}
      {hasMoreMenu ? (
        <div className="action-dropdown-wrapper">
          <button
            ref={btnRef}
            type="button"
            className="btn-action-text btn-action-neutral"
            onClick={handleToggleMenu}
            title="More Actions"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <span>More</span>
            <FiChevronDown
              size={13}
              style={{
                transform: openUpwards && menuOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease"
              }}
            />
          </button>
          {menuOpen && (
            <div className={`action-dropdown-menu ${openUpwards ? "open-upwards" : ""}`}>
              {isInactive && onActivate && (
                <button
                  type="button"
                  className="action-dropdown-item item-activate"
                  onClick={() => {
                    setMenuOpen(false);
                    onActivate();
                  }}
                  disabled={disabledActivate}
                >
                  <FiCheck size={14} />
                  <span>Activate</span>
                </button>
              )}
              {!isInactive && onDeactivate && (
                <button
                  type="button"
                  className="action-dropdown-item item-deactivate"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeactivate();
                  }}
                  disabled={disabledDeactivate}
                >
                  <FiSlash size={14} />
                  <span>Deactivate</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="action-dropdown-item item-delete"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  disabled={disabledDelete}
                >
                  <FiTrash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 5. Activate or Deactivate (Fixed Slot for perfect row-to-row alignment) */}
          {(onActivate || onDeactivate) && (
            <div className="action-status-slot">
              {isInactive && onActivate ? (
                <button
                  type="button"
                  className="btn-action-text btn-action-activate action-slot-btn"
                  onClick={onActivate}
                  disabled={disabledActivate}
                  title={activateTitle}
                >
                  <FiCheck size={13} />
                  <span>Activate</span>
                </button>
              ) : !isInactive && onDeactivate ? (
                <button
                  type="button"
                  className="btn-action-text btn-action-deactivate action-slot-btn"
                  onClick={onDeactivate}
                  disabled={disabledDeactivate}
                  title={deactivateTitle}
                >
                  <FiSlash size={13} />
                  <span>Deactivate</span>
                </button>
              ) : null}
            </div>
          )}

          {/* 6. Delete Button */}
          {onDelete && (
            <button
              type="button"
              className="btn-action-text btn-action-delete"
              onClick={onDelete}
              disabled={disabledDelete}
              title={deleteTitle}
            >
              <FiTrash2 size={13} />
              <span>Delete</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TableActions;
