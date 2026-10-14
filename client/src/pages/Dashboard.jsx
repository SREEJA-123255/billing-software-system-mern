import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboard } from "../services/dashboardService";
import { getInvoices } from "../services/invoice";
import {
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiUsers,
  FiPackage,
  FiClock,
  FiFileText,
  FiAlertTriangle,
  FiCheckCircle,
  FiShoppingCart,
  FiTruck,
  FiCreditCard,
  FiArrowRight,
  FiPlus,
  FiBarChart2,
  FiActivity,
  FiPieChart,
  FiLayers,
  FiChevronRight
} from "react-icons/fi";
import StatusBadge from "../components/Common/StatusBadge";
import { formatCurrency, formatKpiCurrency, formatNumber, formatDate } from "../utils/formatters";
import "./Catalog.css";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch dashboard KPIs and recent invoices in parallel
      const [dashRes, invRes] = await Promise.allSettled([
        getDashboard(),
        getInvoices({ limit: 5 })
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value?.success) {
        setData(dashRes.value.data);
        setLastUpdated(new Date());
      } else if (dashRes.status === "fulfilled" && !dashRes.value?.success) {
        throw new Error(dashRes.value?.message || "Failed to fetch dashboard metrics");
      } else if (dashRes.status === "rejected") {
        throw dashRes.reason;
      }

      if (invRes.status === "fulfilled") {
        const raw = invRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data || [];
        setRecentInvoices(list.slice(0, 5));
      }
    } catch (err) {
      setError(
        err.message || "Failed to load dashboard data. Please verify your connection or server status."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Compute Net Operating Profit & Profit Margin %
  const totalSales = Number(data?.totalSales || 0);
  const totalPurchases = Number(data?.totalPurchases || 0);
  const totalExpenses = Number(data?.totalExpenses || 0);
  const estimatedProfit = totalSales - totalPurchases - totalExpenses;
  const isProfitable = estimatedProfit >= 0;

  // Margin Percentage (based on Total Sales)
  const marginPercentage =
    totalSales > 0 ? ((estimatedProfit / totalSales) * 100).toFixed(1) : "0.0";
  const cogsPercentage =
    totalSales > 0 ? Math.min(100, Math.max(0, (totalPurchases / totalSales) * 100)).toFixed(1) : "0.0";
  const expPercentage =
    totalSales > 0 ? Math.min(100, Math.max(0, (totalExpenses / totalSales) * 100)).toFixed(1) : "0.0";
  const profitBarWidth =
    totalSales > 0 ? Math.min(100, Math.max(0, (estimatedProfit / totalSales) * 100)) : 0;

  const lowStockCount = Number(data?.lowStockProducts || 0);
  const pendingAmount = Number(data?.pendingPayments || 0);

  return (
    <div className="catalog-page dashboard-enterprise-page">
      {/* Executive Header & Quick Action Bar */}
      <div className="dashboard-header-bar">
        <div className="dashboard-header-text">
          <h2>Executive Dashboard</h2>
          <p>Real-time billing, cash flow, inventory levels, and revenue analytics</p>
        </div>

        <div className="dashboard-header-actions">
          {lastUpdated && !loading && (
            <span className="dashboard-updated-badge">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchDashboardData}
            disabled={loading}
            id="btn-dashboard-refresh"
            title="Refresh dashboard metrics"
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/billing")}
            id="btn-quick-new-invoice"
          >
            <FiPlus />
            <span>New Sale (POS)</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <FiAlertTriangle style={{ fontSize: "1.25rem", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchDashboardData}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards - Clean, Consistent Enterprise Slate Styling */}
      <div className="dashboard-kpi-grid">
        {/* 1. Today's Sales */}
        <div className="enterprise-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Today's Sales</span>
            <div className="stat-card-icon">
              <FiTrendingUp />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatKpiCurrency(data?.todaySales)}
            </div>
            <div className="stat-card-caption">Live daily invoiced sales</div>
          </div>
        </div>

        {/* 2. Total Revenue */}
        <div className="enterprise-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Revenue</span>
            <div className="stat-card-icon">
              <FiDollarSign />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatKpiCurrency(data?.totalSales)}
            </div>
            <div className="stat-card-caption">All generated customer invoices</div>
          </div>
        </div>

        {/* 3. Total Purchases (COGS) */}
        <div className="enterprise-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Purchases</span>
            <div className="stat-card-icon">
              <FiShoppingBag />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatKpiCurrency(data?.totalPurchases)}
            </div>
            <div className="stat-card-caption">Cost of goods inward from suppliers</div>
          </div>
        </div>

        {/* 4. Operating Expenses */}
        <div className="enterprise-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Operating Expenses</span>
            <div className="stat-card-icon">
              <FiFileText />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatKpiCurrency(data?.totalExpenses)}
            </div>
            <div className="stat-card-caption">Administrative & operational overheads</div>
          </div>
        </div>

        {/* 5. Pending Receivables */}
        <div className={`enterprise-stat-card ${pendingAmount > 0 ? "card-status-attention" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-label">Pending Receivables</span>
            <div className="stat-card-icon">
              <FiClock />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatKpiCurrency(data?.pendingPayments)}
            </div>
            <div className="stat-card-caption">
              {pendingAmount > 0 ? "Outstanding balance on unpaid invoices" : "Zero outstanding balances"}
            </div>
          </div>
        </div>

        {/* 6. Low Stock Alerts */}
        <div className={`enterprise-stat-card ${lowStockCount > 0 ? "card-status-warning" : ""}`}>
          <div className="stat-card-header">
            <span className="stat-card-label">Low Stock Alerts</span>
            <div className="stat-card-icon">
              <FiAlertTriangle />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatNumber(data?.lowStockProducts)}
            </div>
            <div className="stat-card-caption">
              {lowStockCount > 0
                ? `${lowStockCount} product(s) at or below reorder limit`
                : "All catalog items at healthy stock levels"}
            </div>
          </div>
        </div>

        {/* 7. Active Customers */}
        <div className="enterprise-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Customers</span>
            <div className="stat-card-icon">
              <FiUsers />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatNumber(data?.totalCustomers)}
            </div>
            <div className="stat-card-caption">Registered customer directory</div>
          </div>
        </div>

        {/* 8. Catalog SKUs */}
        <div className="enterprise-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Catalog Products</span>
            <div className="stat-card-icon">
              <FiPackage />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">
              {loading && !data ? "..." : formatNumber(data?.totalProducts)}
            </div>
            <div className="stat-card-caption">Active stock keeping units (SKUs)</div>
          </div>
        </div>
      </div>

      {/* Financial Health & Operating Margin Panel */}
      {data && (
        <div className="enterprise-financial-card">
          <div className="financial-card-header">
            <div className="financial-header-left">
              <div className="financial-title-row">
                <FiPieChart className="financial-title-icon" />
                <h3>Financial Position & Operating Margin</h3>
              </div>
              <p className="financial-subtitle">
                Consolidated net performance: Total Sales Revenue less Cost of Goods (Purchases) and Operating Expenses
              </p>
            </div>

            <div className="financial-header-right">
              <div className="profit-summary-pill">
                <span className="profit-pill-label">Estimated Net Profit</span>
                <span className={`profit-pill-value ${isProfitable ? "text-profit" : "text-loss"}`}>
                  {formatCurrency(estimatedProfit)}
                </span>
                <span className={`profit-margin-tag ${isProfitable ? "tag-profit" : "tag-loss"}`}>
                  {isProfitable ? `${marginPercentage}% Operating Margin` : "Operating Deficit"}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Composition Progress Bar */}
          <div className="margin-composition-wrapper">
            <div className="margin-bar-labels">
              <span>Capital Breakdown</span>
              <span>Total Revenue: {formatCurrency(totalSales)}</span>
            </div>
            <div className="margin-composition-bar" title="Financial Composition">
              <div
                className="composition-segment segment-profit"
                style={{ width: `${Math.max(profitBarWidth, 2)}%` }}
                title={`Net Profit: ${marginPercentage}%`}
              />
              <div
                className="composition-segment segment-cogs"
                style={{ width: `${Math.max(Number(cogsPercentage), 1)}%` }}
                title={`Cost of Goods: ${cogsPercentage}%`}
              />
              <div
                className="composition-segment segment-expenses"
                style={{ width: `${Math.max(Number(expPercentage), 1)}%` }}
                title={`Expenses: ${expPercentage}%`}
              />
            </div>
            <div className="margin-bar-legend">
              <span className="legend-item">
                <span className="legend-dot dot-profit" /> Net Profit ({marginPercentage}%)
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-cogs" /> Purchases / COGS ({cogsPercentage}%)
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-expenses" /> Operating Expenses ({expPercentage}%)
              </span>
            </div>
          </div>

          {/* Structured Financial Breakdown Grid (No childlike math signs) */}
          <div className="financial-metrics-row">
            <div className="financial-metric-box">
              <span className="metric-box-label">Gross Sales Revenue</span>
              <strong className="metric-box-val">{formatCurrency(totalSales)}</strong>
              <span className="metric-box-hint">100% Total Volume</span>
            </div>

            <div className="financial-metric-box">
              <span className="metric-box-label">Cost of Goods (Purchases)</span>
              <strong className="metric-box-val">{formatCurrency(totalPurchases)}</strong>
              <span className="metric-box-hint">{cogsPercentage}% of Revenue</span>
            </div>

            <div className="financial-metric-box">
              <span className="metric-box-label">Operating Expenses</span>
              <strong className="metric-box-val">{formatCurrency(totalExpenses)}</strong>
              <span className="metric-box-hint">{expPercentage}% of Revenue</span>
            </div>

            <div className="financial-metric-box metric-box-highlight">
              <span className="metric-box-label">Net Estimated Profit</span>
              <strong className={`metric-box-val ${isProfitable ? "text-profit" : "text-loss"}`}>
                {formatCurrency(estimatedProfit)}
              </strong>
              <span className="metric-box-hint">{marginPercentage}% Net Margin</span>
            </div>
          </div>

          <div className="financial-card-footer">
            <span className="financial-footer-note">
              Comprehensive statement filters for custom date periods, tax calculations, and cash flow are available in Financial Reports.
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/reports")}
            >
              <FiBarChart2 />
              <span>View Full Financial Reports</span>
            </button>
          </div>
        </div>
      )}

      {/* Two-Column Operational Section: Recent Invoices & Quick Launch */}
      <div className="dashboard-content-split">
        {/* Left Column: Recent Billing Invoices */}
        <div className="split-column-main">
          <div className="dashboard-panel-card">
            <div className="panel-card-header">
              <div>
                <h4>Recent Billing Transactions</h4>
                <p>Latest customer sales invoices generated via POS</p>
              </div>
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => navigate("/sales")}
              >
                <span>View All Invoices</span>
                <FiChevronRight />
              </button>
            </div>

            {/* Desktop Table View (>= 641px) */}
            <div className="recent-table-responsive desktop-recent-table">
              {recentInvoices.length > 0 ? (
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => (
                      <tr key={inv._id || inv.invoiceNumber} onClick={() => navigate("/sales")} className="table-clickable-row">
                        <td className="font-mono font-bold text-primary">
                          {inv.invoiceNumber}
                        </td>
                        <td>
                          {inv.customerDetails?.name || "Walk-in Customer"}
                        </td>
                        <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                          {formatDate(inv.invoiceDate || inv.createdAt)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <StatusBadge status={inv.paymentStatus || "Unpaid"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="table-empty-notice">
                  <FiClock style={{ fontSize: "1.75rem", color: "#94a3b8" }} />
                  <p>No sales transactions recorded yet.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => navigate("/billing")}
                  >
                    Create First Bill in POS
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Cards View (< 641px) */}
            <div className="mobile-recent-list">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((inv) => (
                  <div
                    key={inv._id || inv.invoiceNumber}
                    className="mobile-recent-card"
                    onClick={() => navigate("/sales")}
                  >
                    <div className="mobile-card-row">
                      <span className="font-mono font-bold text-primary">{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.paymentStatus || "Unpaid"} />
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-cust-name">{inv.customerDetails?.name || "Walk-in Customer"}</span>
                      <span className="mobile-amount-val">{formatCurrency(inv.grandTotal)}</span>
                    </div>
                    <div className="mobile-date-line">
                      {formatDate(inv.invoiceDate || inv.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="table-empty-notice">
                  <FiClock style={{ fontSize: "1.5rem", color: "#94a3b8" }} />
                  <p>No sales recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Operational Shortcuts & Inventory Alert */}
        <div className="split-column-side">
          {/* Inventory Alert Banner */}
          {data && (
            <div
              className={`inventory-status-card ${
                lowStockCount > 0 ? "inventory-status-alert" : "inventory-status-healthy"
              }`}
            >
              <div className="inventory-status-icon">
                {lowStockCount > 0 ? <FiAlertTriangle /> : <FiCheckCircle />}
              </div>
              <div className="inventory-status-content">
                <h5>{lowStockCount > 0 ? "Inventory Alert" : "Inventory Status"}</h5>
                <p>
                  {lowStockCount > 0
                    ? `${lowStockCount} item(s) below reorder threshold. Stock replenishment advised.`
                    : "All inventory products maintained above minimum stock thresholds."}
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-link-alert"
                  onClick={() => navigate("/inventory")}
                >
                  <span>{lowStockCount > 0 ? "Review Low Stock" : "View Inventory"}</span>
                  <FiArrowRight />
                </button>
              </div>
            </div>
          )}

          {/* Quick Management Toolbar */}
          <div className="dashboard-panel-card">
            <div className="panel-card-header">
              <div>
                <h4>Quick Management</h4>
                <p>Standard operational workflows</p>
              </div>
            </div>

            <div className="quick-action-list">
              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate("/billing")}
              >
                <div className="quick-item-icon">
                  <FiShoppingCart />
                </div>
                <div className="quick-item-content">
                  <span className="quick-item-title">Point of Sale (POS)</span>
                  <span className="quick-item-desc">Issue customer bills and receipts</span>
                </div>
                <FiChevronRight className="quick-item-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate("/purchases/new")}
              >
                <div className="quick-item-icon">
                  <FiTruck />
                </div>
                <div className="quick-item-content">
                  <span className="quick-item-title">New Purchase Order</span>
                  <span className="quick-item-desc">Record inward supplier stock</span>
                </div>
                <FiChevronRight className="quick-item-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate("/products")}
              >
                <div className="quick-item-icon">
                  <FiPackage />
                </div>
                <div className="quick-item-content">
                  <span className="quick-item-title">Product Catalog</span>
                  <span className="quick-item-desc">Maintain SKUs and price rules</span>
                </div>
                <FiChevronRight className="quick-item-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate("/customers")}
              >
                <div className="quick-item-icon">
                  <FiUsers />
                </div>
                <div className="quick-item-content">
                  <span className="quick-item-title">Customer Directory</span>
                  <span className="quick-item-desc">Manage customer accounts & GST</span>
                </div>
                <FiChevronRight className="quick-item-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate("/payments")}
              >
                <div className="quick-item-icon">
                  <FiCreditCard />
                </div>
                <div className="quick-item-content">
                  <span className="quick-item-title">Record Payments</span>
                  <span className="quick-item-desc">Settle invoices via Cash, UPI, Card</span>
                </div>
                <FiChevronRight className="quick-item-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate("/reports")}
              >
                <div className="quick-item-icon">
                  <FiBarChart2 />
                </div>
                <div className="quick-item-content">
                  <span className="quick-item-title">Financial Reports</span>
                  <span className="quick-item-desc">P&L, sales reports, and taxes</span>
                </div>
                <FiChevronRight className="quick-item-arrow" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
