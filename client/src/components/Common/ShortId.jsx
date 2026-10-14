import React from "react";
import { formatShortId } from "../../utils/formatters";
import "./CommonUI.css";

/**
 * Universal Short Readable Code Component (e.g. CUS-XXXX, SUP-XXXX, PRD-XXXX, USR-XXXX)
 * Rendered in a muted monospace style.
 */
export const ShortId = ({ prefix, id, className = "" }) => {
  const code = formatShortId(prefix, id);
  return (
    <span className={`universal-short-id ${className}`} title={String(id || "")}>
      {code}
    </span>
  );
};

export default ShortId;
