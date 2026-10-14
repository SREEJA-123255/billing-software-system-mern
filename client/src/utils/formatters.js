/**
 * Enterprise Billing Software - Universal Financial, Identifier & Date Formatters
 * Strict 8px scale & Indian formatting compliance
 */

/**
 * Standard Indian Rupee currency format with two decimal places (e.g. ₹1,09,968.00)
 */
export function formatCurrency(amount, options = {}) {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * KPI summary card currency format WITHOUT paise (e.g. ₹1,09,860)
 */
export function formatKpiCurrency(amount) {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Formats integers with Indian comma grouping (e.g. 1,09,860)
 */
export function formatNumber(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
}

/**
 * Short readable identifier code (e.g. CUS-7C2944, SUP-1A2B3C, PRD-4D5E6F, USR-7A8B9C)
 * Takes last 4-6 characters in uppercase. Preserves custom numbers like SALE-7C2944, INV-0001.
 */
export function formatShortId(prefix, rawId) {
  if (!rawId) return "—";
  const s = String(rawId).trim();
  if (s.startsWith(prefix + "-") || s.startsWith("INV-") || s.startsWith("SALE-") || s.startsWith("PO-") || s.startsWith("RET-")) {
    return s;
  }
  const cleanId = s.replace(/[^a-zA-Z0-9]/g, "");
  const tail = cleanId.length >= 6 ? cleanId.slice(-6).toUpperCase() : cleanId.toUpperCase();
  return `${prefix}-${tail}`;
}

/**
 * Formats optional strings. Returns "—" for empty, null, undefined, or "N/A"
 */
export function formatOptional(value) {
  if (value === undefined || value === null) return "—";
  const str = String(value).trim();
  if (str === "" || str.toUpperCase() === "N/A" || str.toUpperCase() === "NONE") return "—";
  return str;
}

/**
 * Clean short date format (e.g. 12 Oct 2026)
 */
export function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Short date + time (e.g. 12 Oct 2026, 10:30 AM)
 */
export function formatDateTime(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(dateString);
  }
}

export default {
  formatCurrency,
  formatKpiCurrency,
  formatNumber,
  formatShortId,
  formatOptional,
  formatDate,
  formatDateTime
};
