import React, { useState, useCallback, useEffect, useMemo } from "react";
import reportService from "../services/reportService";
import expenseService from "../services/expenseService";
import Toast from "../components/Common/Toast";
import PageHeader from "../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../components/Common/KpiCard";
import StatusBadge from "../components/Common/StatusBadge";
import {
  formatCurrency,
  formatKpiCurrency,
  formatNumber,
  formatDate
} from "../utils/formatters";
import {
  FiBarChart2,
  FiTrendingUp,
  FiShoppingBag,
  FiDollarSign,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiActivity,
  FiCalendar
} from "react-icons/fi";
import "./Catalog.css";
import "./Reports.css";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" }
];

function SectionError({ message, onRetry }) {
  return (
    <div className="alert alert-danger" role="alert" style={{ margin: "1rem 0" }}>
      <FiAlertTriangle style={{ fontSize: "1.25rem", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <span>{message}</span>
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function SectionSkeleton({ rows = 2 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "44px",
            background: "#f1f5f9",
            borderRadius: "8px",
            animation: "pulse 1.5s infinite"
          }}
        />
      ))}
    </div>
  );
}

function Reports() {
  // Default to "today" (Today's revenue, expenses, and net profit)
  const [period, setPeriod] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [salesData, setSalesData] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");

  const [purchaseData, setPurchaseData] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  const [expenseData, setExpenseData] = useState(null);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  const [profitData, setProfitData] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [profitError, setProfitError] = useState("");

  const [hasSearched, setHasSearched] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const fetchSalesReport = useCallback(async (activePeriod = period, start = startDate, end = endDate) => {
    setSalesLoading(true);
    setSalesError("");
    try {
      const res = await reportService.getSalesReport({ period: activePeriod, startDate: start, endDate: end });
      if (res.success) setSalesData(res.data);
      else throw new Error(res.message || "Failed to fetch sales report");
    } catch (err) {
      setSalesError(err.message || "Failed to load sales report");
    } finally {
      setSalesLoading(false);
    }
  }, [period, startDate, endDate]);

  const fetchPurchaseReport = useCallback(async (activePeriod = period, start = startDate, end = endDate) => {
    setPurchaseLoading(true);
    setPurchaseError("");
    try {
      const res = await reportService.getPurchaseReport({ period: activePeriod, startDate: start, endDate: end });
      if (res.success) setPurchaseData(res.data);
      else throw new Error(res.message || "Failed to fetch purchase report");
    } catch (err) {
      setPurchaseError(err.message || "Failed to load purchase report");
    } finally {
      setPurchaseLoading(false);
    }
  }, [period, startDate, endDate]);

  const fetchExpenseReport = useCallback(async (activePeriod = period, start = startDate, end = endDate) => {
    setExpenseLoading(true);
    setExpenseError("");
    try {
      const [res, allExpensesRes] = await Promise.all([
        reportService.getExpenseReport({ period: activePeriod, startDate: start, endDate: end }),
        expenseService.getExpenses().catch(() => ({ data: [] }))
      ]);
      if (res.success) {
        const rawExpenses = allExpensesRes?.data || (Array.isArray(allExpensesRes) ? allExpensesRes : []);
        const now = new Date();
        let rangeStart, rangeEnd = new Date();
        if (activePeriod === "today") {
          rangeStart = new Date();
          rangeStart.setHours(0, 0, 0, 0);
          rangeEnd.setHours(23, 59, 59, 999);
        } else if (activePeriod === "week") {
          rangeStart = new Date();
          rangeStart.setDate(rangeStart.getDate() - 6);
          rangeStart.setHours(0, 0, 0, 0);
          rangeEnd.setHours(23, 59, 59, 999);
        } else if (activePeriod === "month") {
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          rangeStart.setHours(0, 0, 0, 0);
          rangeEnd.setHours(23, 59, 59, 999);
        } else if (activePeriod === "custom" && start && end) {
          rangeStart = new Date(start);
          rangeStart.setHours(0, 0, 0, 0);
          rangeEnd = new Date(end);
          rangeEnd.setHours(23, 59, 59, 999);
        } else {
          rangeStart = new Date(0);
          rangeEnd.setHours(23, 59, 59, 999);
        }

        const countsByCategory = {};
        rawExpenses.forEach((exp) => {
          const d = new Date(exp.date);
          if (d >= rangeStart && d <= rangeEnd) {
            countsByCategory[exp.category] = (countsByCategory[exp.category] || 0) + 1;
          }
        });

        const enhancedExpensesByCategory = (res.data?.expensesByCategory || []).map((cat) => ({
          ...cat,
          count: countsByCategory[cat._id || cat.category] || 0
        }));

        setExpenseData({
          ...res.data,
          expensesByCategory: enhancedExpensesByCategory
        });
      } else {
        throw new Error(res.message || "Failed to fetch expense report");
      }
    } catch (err) {
      setExpenseError(err.message || "Failed to load expense report");
    } finally {
      setExpenseLoading(false);
    }
  }, [period, startDate, endDate]);

  const fetchProfitReport = useCallback(async (activePeriod = period, start = startDate, end = endDate) => {
    setProfitLoading(true);
    setProfitError("");
    try {
      const res = await reportService.getProfitReport({ period: activePeriod, startDate: start, endDate: end });
      if (res.success) setProfitData(res.data);
      else throw new Error(res.message || "Failed to fetch profit report");
    } catch (err) {
      setProfitError(err.message || "Failed to load profit report");
    } finally {
      setProfitLoading(false);
    }
  }, [period, startDate, endDate]);

  const handleGenerate = useCallback((selectedPeriod = period, start = startDate, end = endDate) => {
    if (selectedPeriod === "custom") {
      if (!start || !end) {
        showToast("Please choose both start and end dates.", "error");
        return;
      }
      if (start > end) {
        showToast("Start date must be on or before end date.", "error");
        return;
      }
    }
    setHasSearched(true);
    fetchSalesReport(selectedPeriod, start, end);
    fetchPurchaseReport(selectedPeriod, start, end);
    fetchExpenseReport(selectedPeriod, start, end);
    fetchProfitReport(selectedPeriod, start, end);
  }, [period, startDate, endDate, fetchSalesReport, fetchPurchaseReport, fetchExpenseReport, fetchProfitReport]);

  // Load automatically with "today" (Today's Report) on mount
  useEffect(() => {
    handleGenerate("today");
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      handleGenerate(newPeriod);
    }
  };

  const isCustomInvalid =
    period === "custom" && (!startDate || !endDate || startDate > endDate);

  const anyLoading =
    salesLoading || purchaseLoading || expenseLoading || profitLoading;

  // Profit label rule: "Profit" when > 0, "Loss" when < 0, "Break-even" when 0. Never "Profitable" for 0.
  const netProfit = Number(profitData?.profit ?? 0);
  let profitLabel = "Break-even";
  let profitVariant = "neutral";
  if (profitData) {
    if (netProfit > 0) {
      profitLabel = "Profit";
      profitVariant = "success";
    } else if (netProfit < 0) {
      profitLabel = "Loss";
      profitVariant = "warning";
    } else {
      profitLabel = "Break-even";
      profitVariant = "blue";
    }
  }

  // Active Date Range Pill Text
  const activeRangeText = useMemo(() => {
    const now = new Date();
    const formatRangeDate = (d) => {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    };

    if (period === "today") {
      return formatRangeDate(now);
    }
    if (period === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return `${formatRangeDate(start)} – ${formatRangeDate(now)}`;
    }
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${formatRangeDate(start)} – ${formatRangeDate(end)}`;
    }
    if (period === "custom") {
      if (startDate && endDate) {
        return `${formatRangeDate(new Date(startDate))} – ${formatRangeDate(new Date(endDate))}`;
      }
      return "Select dates below";
    }
    return null;
  }, [period, startDate, endDate]);

  // Profit Margin Calculation
  const salesRev = Number(profitData?.salesRevenue ?? salesData?.totalSales ?? 0);
  const netProfitVal = Number(profitData?.profit ?? 0);
  const marginPct = useMemo(() => {
    if (!profitData || salesRev <= 0) return null;
    return ((netProfitVal / salesRev) * 100).toFixed(1);
  }, [profitData, salesRev, netProfitVal]);

  return (
    <div className="catalog-page reports-page-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Reports"
        description="Generate period-based revenue, expense, and net profit analytics."
        actionButton={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGenerate(period, startDate, endDate)}
            disabled={isCustomInvalid || anyLoading}
            id="rpt-refresh-btn"
          >
            <FiRefreshCw className={anyLoading ? "spin" : ""} />
            <span>{anyLoading ? "Refreshing..." : "Refresh Report"}</span>
          </button>
        }
      />

      {/* 2. Period Filter Card */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="reports-filter-top">
            <div>
              <label className="form-label" style={{ marginBottom: "8px" }}>Select Time Period</label>
              <div className="reports-period-buttons">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    id={p.value === period ? "rpt-period" : undefined}
                    className={`btn btn-sm ${period === p.value ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => handlePeriodChange(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {activeRangeText && (
              <div className="reports-active-range-pill" title="Active period date range">
                <FiCalendar className="reports-calendar-icon" />
                <span>{activeRangeText}</span>
              </div>
            )}
          </div>

          {period === "custom" && (
            <div className="grid-2" style={{ marginTop: "4px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="rpt-start" className="form-label required">Start Date</label>
                <input
                  id="rpt-start"
                  type="date"
                  className="form-control"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="rpt-end" className="form-label required">End Date</label>
                <input
                  id="rpt-end"
                  type="date"
                  className="form-control"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {isCustomInvalid && (
            <p style={{ color: "var(--color-danger)", fontSize: "0.8125rem", margin: 0 }}>
              Please select a valid start and end date (start must be before end).
            </p>
          )}
        </div>
      </div>

      {/* 3. KPI Summary Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Sales Revenue"
          value={salesData ? formatKpiCurrency(salesData.totalSales) : "—"}
          icon={FiTrendingUp}
          variant="primary"
        />
        <KpiCard
          label="Purchase Costs"
          value={purchaseData ? formatKpiCurrency(purchaseData.totalPurchases) : "—"}
          icon={FiShoppingBag}
          variant="blue"
        />
        <KpiCard
          label="Total Expenses"
          value={expenseData ? formatKpiCurrency(expenseData.totalExpenses) : "—"}
          icon={FiDollarSign}
          variant="warning"
        />
        <KpiCard
          label={`Net Result (${profitLabel})`}
          value={profitData ? formatKpiCurrency(profitData.profit) : "—"}
          subtext={marginPct !== null ? `Margin: ${marginPct}%` : undefined}
          icon={FiBarChart2}
          variant={profitVariant}
        />
      </KpiGrid>

      {/* 4. Detailed Breakdown Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginTop: "24px", alignItems: "stretch" }}>
        {/* Profit Breakdown Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Net Profit Breakdown</h3>
              <p className="card-subtitle">Revenue minus purchases and operating overhead</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {marginPct !== null && (
                <span className={`reports-margin-badge ${netProfitVal < 0 ? "margin-negative" : ""}`}>
                  Margin: {marginPct}%
                </span>
              )}
              <span className={`badge ${netProfit >= 0 ? "badge-active" : "badge-inactive"}`}>
                {profitLabel}
              </span>
            </div>
          </div>
          <div className="card-body" style={{ flex: 1 }}>
            {profitLoading && <SectionSkeleton rows={3} />}
            {profitError && (
              <SectionError message={profitError} onRetry={() => fetchProfitReport(period, startDate, endDate)} />
            )}
            {profitData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-success, #10b981)" }} />
                    <span style={{ fontWeight: 600, color: "#334155" }}>Sales Revenue</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-success, #10b981)", fontSize: "1rem" }}>
                    {formatCurrency(profitData.salesRevenue)}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7" }} />
                    <span style={{ fontWeight: 600, color: "#334155" }}>Purchase Costs</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-danger, #ef4444)", fontSize: "1rem" }}>
                    &minus; {formatCurrency(profitData.purchaseCost)}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-warning, #f59e0b)" }} />
                    <span style={{ fontWeight: 600, color: "#334155" }}>Operating Expenses</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-danger, #ef4444)", fontSize: "1rem" }}>
                    &minus; {formatCurrency(profitData.expenses)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "12px",
                    marginTop: "4px",
                    borderTop: "2px solid #e2e8f0"
                  }}
                >
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Net Result</span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color:
                        (profitData.profit ?? 0) > 0
                          ? "var(--color-success, #10b981)"
                          : (profitData.profit ?? 0) < 0
                            ? "var(--color-danger, #ef4444)"
                            : "#64748b"
                    }}
                  >
                    {formatCurrency(profitData.profit)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown Table Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Expense Breakdown by Category</h3>
              <p className="card-subtitle">Distribution of overhead expenses for the selected period</p>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0, flex: 1, display: "flex", flexDirection: "column" }}>
            {expenseLoading && (
              <div style={{ padding: "24px" }}>
                <SectionSkeleton rows={2} />
              </div>
            )}
            {expenseError && (
              <div style={{ padding: "24px" }}>
                <SectionError message={expenseError} onRetry={() => fetchExpenseReport(period, startDate, endDate)} />
              </div>
            )}
            {expenseData && expenseData.expensesByCategory && expenseData.expensesByCategory.length > 0 ? (
              <>
                <div className="table-container desktop-table-view" style={{ border: "none", borderRadius: 0, boxShadow: "none", flex: 1 }}>
                  <table className="universal-table">
                    <colgroup>
                      <col className="col-flex" />
                      <col style={{ width: "110px" }} />
                      <col style={{ width: "150px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="col-left">Category</th>
                        <th className="col-right" style={{ width: "110px" }}>Count</th>
                        <th className="col-right" style={{ width: "150px" }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseData.expensesByCategory.map((cat, idx) => {
                        const totalExpensesVal = Number(expenseData.totalExpenses || 0);
                        const catVal = Number(cat.total ?? cat.totalAmount ?? 0);
                        const pct = totalExpensesVal > 0 ? Math.round((catVal / totalExpensesVal) * 100) : 0;
                        return (
                          <tr key={idx}>
                            <td className="col-left">
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span className="payment-method-chip">
                                    {cat.category || cat._id || "Uncategorized"}
                                  </span>
                                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                                    {pct}%
                                  </span>
                                </div>
                                <div className="reports-progress-bar-track">
                                  <div
                                    className="reports-progress-bar-fill"
                                    style={{ width: `${Math.max(pct, 4)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="col-right">
                              <span className="badge-count" style={{ fontVariantNumeric: "tabular-nums" }}>
                                {formatNumber(cat.count ?? 0)}
                              </span>
                            </td>
                            <td className="col-right col-money">
                              <span className="table-amount">
                                {formatCurrency(cat.total ?? cat.totalAmount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Breakdown View (< 768px) */}
                <div className="reports-expense-category-mobile">
                  {expenseData.expensesByCategory.map((cat, idx) => {
                    const totalExpensesVal = Number(expenseData.totalExpenses || 0);
                    const catVal = Number(cat.total ?? cat.totalAmount ?? 0);
                    const pct = totalExpensesVal > 0 ? Math.round((catVal / totalExpensesVal) * 100) : 0;
                    return (
                      <div key={idx} className="reports-cat-item-mobile">
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, marginRight: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className="payment-method-chip" style={{ width: "fit-content" }}>
                              {cat.category || cat._id || "Uncategorized"}
                            </span>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="reports-progress-bar-track">
                            <div
                              className="reports-progress-bar-fill"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {formatNumber(cat.count ?? 0)} records
                          </span>
                        </div>
                        <strong style={{ fontSize: "0.9375rem", color: "#0f172a", whiteSpace: "nowrap" }}>
                          {formatCurrency(cat.total ?? cat.totalAmount)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              expenseData && (
                <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
                  No expense records found for this period.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 5. Invoices / Sales Transactions Table for Selected Period */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 className="card-title">
              {period === "today" ? "Today's Invoices & Revenue" : "Invoiced Sales for Period"}
            </h3>
            <p className="card-subtitle">
              {salesData ? `${salesData.numberOfSales} sales totaling ${formatCurrency(salesData.totalSales)}` : "Live sales transactions"}
            </p>
          </div>
          {salesData && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="badge badge-active" style={{ fontSize: "0.8125rem", padding: "6px 12px" }}>
                Total: {formatCurrency(salesData.totalSales)}
              </span>
            </div>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {salesLoading && (
            <div style={{ padding: "24px" }}>
              <SectionSkeleton rows={3} />
            </div>
          )}
          {salesError && (
            <div style={{ padding: "24px" }}>
              <SectionError message={salesError} onRetry={() => fetchSalesReport(period, startDate, endDate)} />
            </div>
          )}
          {!salesLoading && !salesError && salesData && (
            salesData.invoices && salesData.invoices.length > 0 ? (
              <div className="table-container desktop-table-view" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                <table className="universal-table">
                  <colgroup>
                    <col style={{ width: "140px" }} />
                    <col className="col-flex" />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "160px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="col-left">Invoice #</th>
                      <th className="col-left">Customer</th>
                      <th className="col-left">Date</th>
                      <th className="col-center">Status</th>
                      <th className="col-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.invoices.map((inv) => (
                      <tr key={inv.id || inv.invoiceNumber}>
                        <td className="col-left col-code">
                          <strong style={{ color: "var(--brand-primary, #6366f1)" }}>{inv.invoiceNumber}</strong>
                        </td>
                        <td className="col-left">
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>{inv.customer || "Walk-in Customer"}</span>
                        </td>
                        <td className="col-left" style={{ color: "#64748b", fontSize: "0.875rem" }}>
                          {formatDate(inv.date)}
                        </td>
                        <td className="col-center">
                          <StatusBadge status={inv.paymentStatus || "Paid"} />
                        </td>
                        <td className="col-right col-money">
                          <span className="table-amount" style={{ fontWeight: 700, color: "#0f172a" }}>
                            {formatCurrency(inv.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "36px 24px", textAlign: "center", color: "#64748b", fontSize: "0.9375rem" }}>
                No invoices recorded for {period === "today" ? "today" : "this period"}.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
