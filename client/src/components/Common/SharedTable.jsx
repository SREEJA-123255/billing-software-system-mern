import React from "react";
import "./CommonUI.css";

/**
 * Shared Enterprise Table Component
 * Enforces the One Table System:
 * - table-layout: fixed
 * - Same column widths in header and body via <colgroup>
 * - Exactly ONE flexible column per table
 * - 16px horizontal padding, header 48px, row 64px
 * - Header text-align strictly equals body cell text-align
 */
export const SharedTable = ({
  columns = [],
  children,
  className = ""
}) => {
  return (
    <table className={`desktop-table-view universal-table ${className}`}>
      <colgroup>
        {columns.map((col, idx) => (
          <col
            key={col.key || idx}
            style={col.flex ? undefined : { width: col.width }}
            className={`${col.flex ? "col-flex" : ""} ${col.hideOnNarrow ? "col-hide-md" : ""}`}
          />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((col, idx) => {
            const alignClass =
              col.align === "right"
                ? "col-right"
                : col.isActions
                ? "col-actions"
                : "col-left";
            return (
              <th
                key={col.key || idx}
                className={`${alignClass} ${col.hideOnNarrow ? "col-hide-md" : ""}`}
                style={col.flex ? undefined : { width: col.width }}
              >
                {col.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
};

export default SharedTable;
