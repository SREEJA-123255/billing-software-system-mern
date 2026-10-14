import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiPrinter,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiCheckSquare,
  FiDollarSign,
  FiRefreshCw
} from "react-icons/fi";
import { getInvoices, updateInvoicePaymentStatus } from "../../services/invoice";
import businessService from "../../services/businessService";
import Modal from "../../components/Common/Modal";
import Toast from "../../components/Common/Toast";
import Select from "../../components/Common/Select";
import StatusBadge from "../../components/Common/StatusBadge";
import SearchBar from "../../components/Common/SearchBar";
import PageHeader from "../../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../../components/Common/KpiCard";
import TableActions from "../../components/Common/TableActions";
import { SkeletonTable } from "../../components/Common/Skeleton";
import EmptyState from "../../components/Common/EmptyState";
import {
  formatCurrency,
  formatKpiCurrency,
  formatNumber,
  formatDate,
  formatOptional
} from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";
import { canManage } from "../../config/permissions";
import "../Catalog.css";
import "./Invoices.css";

const STATUS_FILTER_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "Paid", label: "Paid" },
  { value: "Partial", label: "Partially Paid" },
  { value: "Pending", label: "Pending" }
];

const MODAL_STATUS_OPTIONS = [
  { value: "Paid", label: "Paid" },
  { value: "Partial", label: "Partially Paid" },
  { value: "Pending", label: "Pending" }
];

const formatInvoiceDisplayNumber = (rawNum) => {
  if (!rawNum) return "—";
  const str = String(rawNum).trim();
  // Standard enterprise numbering like INV-0001, INV-0007
  if (/^INV-\d{1,6}$/i.test(str)) {
    return str;
  }
  // Standard compact alphanumeric like INV-2026-01 or INV-A1B2
  if (/^INV-[A-Z0-9]{3,8}$/i.test(str)) {
    return str;
  }
  // If it's a long test/timestamp string like INV-TEST-1791690734968, format to clean compact ID
  if (str.length > 10) {
    const clean = str.replace(/[^a-zA-Z0-9]/g, "");
    const tail = clean.slice(-5).toUpperCase();
    return `INV-${tail}`;
  }
  return str;
};

function Invoices() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManageInvoices = canManage(currentUser?.role, "invoices");

  const [invoices, setInvoices] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  // Selected invoice for detail/print modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Payment status updating state
  const [nextPaymentStatus, setNextPaymentStatus] = useState("Pending");
  const [paidAmountInput, setPaidAmountInput] = useState("0");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "info" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceRes, businessRes] = await Promise.all([
        getInvoices(),
        businessService.getBusiness().catch(() => null),
      ]);

      const invoiceData = Array.isArray(invoiceRes)
        ? invoiceRes
        : invoiceRes?.data || [];

      if (businessRes?.success && businessRes.data) {
        setBusinessProfile(businessRes.data);
      }

      setInvoices(
        invoiceData.map((inv) => {
          const rawNum = inv.invoiceNumber || inv._id || inv.id;
          return {
            ...inv,
            id: rawNum,
            displayId: formatInvoiceDisplayNumber(rawNum),
            rawId: inv._id,
            customer: inv.customerDetails?.name || inv.customer || "Walk-in Customer",
            phone: inv.customerDetails?.phone || inv.phone || "",
            address: inv.customerDetails?.address || inv.address || "",
            date: inv.invoiceDate ? formatDate(inv.invoiceDate) : (inv.createdAt ? formatDate(inv.createdAt) : "—"),
            amount: Number(inv.grandTotal ?? inv.amount ?? 0),
            paidAmount: Number(inv.paidAmount ?? (inv.paymentStatus === "Paid" ? inv.grandTotal : 0)),
          };
        })
      );
    } catch (error) {
      setToast({ message: error.message || "Failed to fetch invoices", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const searchText = search.toLowerCase().trim();
      const matchesSearch =
        String(inv.id || "").toLowerCase().includes(searchText) ||
        String(inv.displayId || "").toLowerCase().includes(searchText) ||
        String(inv.customer || "").toLowerCase().includes(searchText) ||
        String(inv.phone || "").includes(searchText);

      const matchesStatus =
        status === "All" ||
        inv.paymentStatus === status ||
        (status === "Pending" && (inv.paymentStatus === "Pending" || inv.paymentStatus === "Partial"));

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, status]);

  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  const paidInvoicesCount = invoices.filter(
    (inv) => inv.paymentStatus === "Paid"
  ).length;

  // Unsettled invoices: any invoice that is not fully paid (Pending or Partially Paid)
  const pendingInvoicesCount = invoices.filter(
    (inv) => inv.paymentStatus !== "Paid"
  ).length;

  const handleOpenInvoiceModal = (inv) => {
    setSelectedInvoice(inv);
    setNextPaymentStatus(inv.paymentStatus || "Pending");
    setPaidAmountInput(String(inv.paidAmount || 0));
  };

  const handlePrintDirect = (inv) => {
    setSelectedInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSavePaymentStatus = async () => {
    if (!selectedInvoice) return;
    setPaymentSaving(true);
    try {
      const invoiceId = selectedInvoice.rawId || selectedInvoice._id;
      const amountReceived = nextPaymentStatus === "Paid"
        ? Number(selectedInvoice.grandTotal || selectedInvoice.amount || 0)
        : nextPaymentStatus === "Pending"
          ? 0
          : Number(paidAmountInput || 0);

      await updateInvoicePaymentStatus(invoiceId, nextPaymentStatus, amountReceived);

      setToast({ message: "Invoice payment status updated successfully!", type: "success" });

      setSelectedInvoice((prev) =>
        prev
          ? {
            ...prev,
            paymentStatus: nextPaymentStatus,
            paidAmount: amountReceived,
          }
          : null
      );

      setInvoices((prev) =>
        prev.map((item) =>
          item.rawId === invoiceId || item.id === selectedInvoice.id
            ? { ...item, paymentStatus: nextPaymentStatus, paidAmount: amountReceived }
            : item
        )
      );
    } catch (err) {
      setToast({ message: err.message || "Failed to update payment status", type: "error" });
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <div className="catalog-page invoices-page-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Invoices"
        description="Generate, track, and print GST tax invoices and payment receipts."
        actionButton={
          canManageInvoices ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/invoices/new")}
              id="btn-new-invoice"
            >
              <FiPlus />
              <span>Generate Invoice</span>
            </button>
          ) : null
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Total Invoices"
          value={formatNumber(invoices.length)}
          icon={FiCheckSquare}
          variant="primary"
        />
        <KpiCard
          label="Total Billed"
          value={formatKpiCurrency(totalBilled)}
          icon={FiDollarSign}
          variant="success"
        />
        <KpiCard
          label="Paid Invoices"
          value={formatNumber(paidInvoicesCount)}
          icon={FiCheckCircle}
          variant="blue"
        />
        <KpiCard
          label="Pending / Partial"
          value={formatNumber(pendingInvoicesCount)}
          icon={FiClock}
          variant="warning"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoices by number, customer, or phone..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              options={STATUS_FILTER_OPTIONS}
              value={status}
              onChange={setStatus}
              placeholder="Status"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={loadData}
            title="Refresh invoices list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* 4. Main Table Card */}
      <div className="table-container invoices-table-card">
        {loading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FiFileText}
            title="No Invoices Found"
            description={
              canManageInvoices
                ? "No invoices generated yet. Click '+ Generate Invoice' to invoice an existing sale."
                : "No invoices currently available."
            }
            actionText={canManageInvoices ? "Generate Invoice" : null}
            onAction={canManageInvoices ? () => navigate("/invoices/new") : undefined}
          />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Invoices"
            description="No invoices match your search filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearch("");
              setStatus("All");
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: "13%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "12%" }} className="col-hide-md" />
                <col style={{ width: "10%" }} className="col-hide-md" />
                <col style={{ width: "13%" }} />
                <col style={{ width: "8%" }} className="col-hide-md" />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-invoice-num" style={{ width: "13%" }}>Invoice #</th>
                  <th className="col-left col-customer" style={{ width: "19%" }}>Customer</th>
                  <th className="col-left col-mobile col-hide-md" style={{ width: "12%" }}>Mobile</th>
                  <th className="col-left col-date col-hide-md" style={{ width: "10%" }}>Date</th>
                  <th className="col-right col-amount" style={{ width: "13%" }}>Amount</th>
                  <th className="col-left col-method col-hide-md" style={{ width: "8%" }}>Method</th>
                  <th className="col-left col-status" style={{ width: "12%" }}>Status</th>
                  <th className="col-actions" style={{ width: "13%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="col-left col-code col-invoice-num">
                      <span
                        className="invoice-chip"
                        onClick={() => handleOpenInvoiceModal(inv)}
                        title={inv.id}
                        style={{ cursor: "pointer" }}
                      >
                        {inv.displayId || inv.id}
                      </span>
                    </td>
                    <td className="col-left col-customer">
                      <strong className="item-name-cell" title={inv.customer}>
                        {inv.customer}
                      </strong>
                    </td>
                    <td className="col-left col-mobile col-hide-md">
                      <span className="table-phone">
                        {formatOptional(inv.phone)}
                      </span>
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{inv.date}</span>
                    </td>
                    <td className="col-right col-money col-amount">
                      <span className="table-amount">{formatCurrency(inv.amount)}</span>
                    </td>
                    <td className="col-left col-method col-hide-md">
                      <span className="payment-method-chip">
                        {inv.paymentMethod || "Cash"}
                      </span>
                    </td>
                    <td className="col-left col-status">
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onView={() => handleOpenInvoiceModal(inv)}
                        onPrint={() => handlePrintDirect(inv)}
                        viewTitle="View"
                        printTitle="Print"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <button
                      type="button"
                      className="table-id-badge"
                      onClick={() => handleOpenInvoiceModal(inv)}
                    >
                      {inv.id}
                    </button>
                    <StatusBadge status={inv.paymentStatus} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Customer</span>
                      <strong className="mobile-card-value">{inv.customer}</strong>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Mobile</span>
                      <span className="mobile-card-value">{formatOptional(inv.phone)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Date</span>
                      <span className="mobile-card-value">{inv.date}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Method</span>
                      <span className="mobile-card-value">{inv.paymentMethod || "Cash"}</span>
                    </div>
                    <div className="mobile-card-field" style={{ gridColumn: "span 2" }}>
                      <span className="mobile-card-label">Amount</span>
                      <strong className="mobile-card-value" style={{ fontSize: "1.125rem", color: "var(--brand-primary, #6366f1)" }}>
                        {formatCurrency(inv.amount)}
                      </strong>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => handleOpenInvoiceModal(inv)}
                      onPrint={() => handlePrintDirect(inv)}
                      viewTitle="View Invoice"
                      printTitle="Print Invoice"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Invoice View & Print Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Tax Invoice - ${selectedInvoice.id}`}
          maxWidth="750px"
        >
          {/* Printable Invoice Document */}
          <div className="printable-invoice-wrapper" id="printable-invoice-content">
            {/* Business Profile Branding Header */}
            <div className="invoice-branding-header">
              <div className="invoice-brand-info">
                <span className="invoice-brand-name">
                  {selectedInvoice.businessDetails?.name ||
                    businessProfile?.businessName ||
                    "Apex Billing Solutions"}
                </span>
                <span className="invoice-brand-text">
                  {selectedInvoice.businessDetails?.address ||
                    businessProfile?.address ||
                    "123 Business Avenue, Suite 100"}
                </span>
                <span className="invoice-brand-text">
                  <strong>GSTIN:</strong>{" "}
                  {selectedInvoice.businessDetails?.gstin ||
                    businessProfile?.gstNumber ||
                    "29AAAAA0000A1Z5"}
                </span>
                <span className="invoice-brand-text">
                  <strong>Phone:</strong>{" "}
                  {selectedInvoice.businessDetails?.phone ||
                    businessProfile?.phone ||
                    "+91 9876543210"}
                </span>
              </div>

              {/* Logo from Team 1 Business Profile */}
              {(selectedInvoice.businessDetails?.logo || businessProfile?.logo) && (
                <div className="invoice-logo-container">
                  <img
                    src={selectedInvoice.businessDetails?.logo || businessProfile?.logo}
                    alt="Business Logo"
                    className="invoice-logo-img"
                  />
                </div>
              )}
            </div>

            {/* Invoice Meta Grid */}
            <div className="invoice-meta-grid">
              <div className="invoice-meta-col">
                <span>Invoice Number</span>
                <strong>{selectedInvoice.id}</strong>
                <span style={{ marginTop: "0.5rem" }}>Invoice Date</span>
                <strong>{selectedInvoice.date}</strong>
              </div>
              <div className="invoice-meta-col">
                <span>Billed To (Customer)</span>
                <strong>{selectedInvoice.customer}</strong>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Phone: {formatOptional(selectedInvoice.phone)}
                </span>
                {selectedInvoice.address && (
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Address: {selectedInvoice.address}
                  </span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="invoice-items-table-wrapper">
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>Item Description</th>
                    <th style={{ width: "15%", textAlign: "center" }}>Qty</th>
                    <th style={{ width: "20%", textAlign: "right" }}>Unit Price</th>
                    <th style={{ width: "20%", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.productName || `Item #${idx + 1}`}</strong>
                        </td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(item.price)}</td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{formatCurrency(item.total)}</strong>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>
                        Product sales transaction items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="invoice-calc-grid">
              <div className="invoice-calc-box">
                <div className="invoice-calc-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(selectedInvoice.subtotal || selectedInvoice.amount)}</strong>
                </div>
                <div className="invoice-calc-row">
                  <span>Discount</span>
                  <strong style={{ color: "var(--color-danger, #ef4444)" }}>
                    -{formatCurrency(selectedInvoice.discountAmount || 0)}
                  </strong>
                </div>
                <div className="invoice-calc-row">
                  <span>Tax (GST)</span>
                  <strong>+{formatCurrency(selectedInvoice.taxAmount || 0)}</strong>
                </div>
                <div className="invoice-calc-row grand-total">
                  <span>Grand Total</span>
                  <strong>{formatCurrency(selectedInvoice.grandTotal || selectedInvoice.amount)}</strong>
                </div>
                <div className="invoice-calc-row" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
                  <span>Amount Paid</span>
                  <span style={{ color: "var(--color-success, #10b981)", fontWeight: 700 }}>
                    {formatCurrency(selectedInvoice.paidAmount)}
                  </span>
                </div>
                <div className="invoice-calc-row">
                  <span>Balance Due</span>
                  <strong style={{ color: "#0f172a" }}>
                    {formatCurrency(
                      Math.max(0, Number(selectedInvoice.grandTotal || selectedInvoice.amount || 0) - Number(selectedInvoice.paidAmount || 0))
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Editor */}
          <div className="status-editor-card no-print">
            <h4 style={{ fontSize: "0.875rem", marginBottom: "0.625rem", color: "#0f172a" }}>
              Update Payment Details
            </h4>
            <div className="status-editor-form">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payment Status</label>
                <Select
                  options={MODAL_STATUS_OPTIONS}
                  value={nextPaymentStatus}
                  onChange={setNextPaymentStatus}
                />
              </div>

              {nextPaymentStatus === "Partial" && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount Received (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0.01"
                    max={Number(selectedInvoice.grandTotal || selectedInvoice.amount || 0) - 0.01}
                    step="0.01"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                  />
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                disabled={paymentSaving}
                onClick={handleSavePaymentStatus}
              >
                {paymentSaving ? "Saving..." : "Update Status"}
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="invoice-modal-actions no-print">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelectedInvoice(null)}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
              id="btn-print-invoice"
            >
              <FiPrinter />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Invoices;