import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import paymentService from "../services/paymentService";
import invoiceService from "../services/invoice";
import Modal from "../components/Common/Modal";
import ConfirmDialog from "../components/Common/ConfirmDialog";
import Toast from "../components/Common/Toast";
import Select from "../components/Common/Select";
import StatusBadge from "../components/Common/StatusBadge";
import SearchBar from "../components/Common/SearchBar";
import PageHeader from "../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../components/Common/KpiCard";
import TableActions from "../components/Common/TableActions";
import ShortId from "../components/Common/ShortId";
import { SkeletonTable } from "../components/Common/Skeleton";
import EmptyState from "../components/Common/EmptyState";
import {
  formatCurrency,
  formatKpiCurrency,
  formatNumber,
  formatDate,
  formatOptional
} from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import { canManage } from "../config/permissions";
import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiCreditCard,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiUser,
  FiCalendar,
  FiHash
} from "react-icons/fi";
import "./Catalog.css";
import "./Payment.css";

const initialForm = {
  invoice: "",
  customer: "",
  amount: "",
  paymentMethod: "",
  paymentDate: "",
  status: "PENDING",
  transactionReference: ""
};

const paymentMethods = [
  "Cash",
  "Card",
  "UPI",
  "Bank Transfer",
  "Cheque"
];

const filterStatusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PENDING", label: "Pending" }
];

const filterMethodOptions = [
  { value: "ALL", label: "All Methods" },
  ...paymentMethods.map((m) => ({ value: m, label: m }))
];

const modalPaymentMethodOptions = paymentMethods.map((m) => ({
  value: m,
  label: m
}));

const modalStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" }
];

function Payment() {
  const { currentUser } = useAuth();
  const canManagePayments = canManage(currentUser?.role, "payments");

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [viewPayment, setViewPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterMethod, setFilterMethod] = useState("ALL");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await paymentService.getPayments();
      setPayments(result.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await invoiceService.getInvoices();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setInvoices(list);
    } catch (err) {
      console.error("Failed to load invoices for payment picker:", err);
    }
  }, []);

  const location = useLocation();

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
  }, [fetchPayments, fetchInvoices]);

  useEffect(() => {
    if (location.state?.fromBilling) {
      showToast(
        location.state.message || "Billing completed! Payment recorded directly.",
        "success"
      );
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenCreateModal = () => {
    if (!canManagePayments) return;
    setEditingId(null);
    setForm({
      ...initialForm,
      paymentDate: new Date().toISOString().split("T")[0]
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleEdit = (payment) => {
    setEditingId(payment._id);
    const invoiceVal = payment.invoice
      ? typeof payment.invoice === "object"
        ? payment.invoice._id || payment.invoice.invoiceNumber || ""
        : payment.invoice
      : "";

    const customerVal = payment.customer
      ? typeof payment.customer === "object"
        ? payment.customer._id || payment.customer.name || ""
        : payment.customer
      : "";

    setForm({
      invoice: invoiceVal,
      customer: customerVal,
      amount: payment.amount ?? "",
      paymentMethod: payment.paymentMethod || "",
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split("T")[0]
        : "",
      status: payment.status || "PENDING",
      transactionReference: payment.transactionReference || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    if (!form.paymentMethod) {
      showToast("Please select a payment method.", "error");
      return;
    }

    if (!form.paymentDate) {
      showToast("Please select a payment date.", "error");
      return;
    }

    if (!form.status) {
      showToast("Please select a payment status.", "error");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        invoice: form.invoice || undefined,
        customer: form.customer || undefined,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        status: form.status,
        transactionReference: form.transactionReference || undefined
      };

      if (editingId) {
        await paymentService.updatePayment(editingId, payload);
        showToast("Payment updated successfully.", "success");
      } else {
        await paymentService.createPayment(payload);
        showToast("Payment recorded successfully.", "success");
      }

      handleCloseModal();
      await fetchPayments();
      await fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      await paymentService.deletePayment(deleteId);
      setDeleteId(null);
      showToast("Payment deleted successfully.", "success");
      await fetchPayments();
    } catch (err) {
      setDeleteId(null);
      showToast(err.message || "Failed to delete payment.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceDisplay = (inv) => {
    if (!inv) return "—";
    const raw = typeof inv === "object" ? inv.invoiceNumber || inv._id || "—" : String(inv);
    const str = String(raw).trim();
    if (str === "" || str === "null" || str === "undefined") return "—";
    if (/^INV-\d{1,6}$/i.test(str)) return str;
    if (/^INV-[A-Z0-9]{3,8}$/i.test(str)) return str;
    if (str.length > 10) {
      const match = str.match(/(?:INV-TEST-|INV-)?([a-zA-Z0-9]{4,15})/i);
      if (match && match[1]) {
        return `INV-${match[1].slice(-5).toUpperCase()}`;
      }
      const clean = str.replace(/[^a-zA-Z0-9]/g, "");
      return `INV-${clean.slice(-5).toUpperCase()}`;
    }
    return str;
  };

  const getCustomerDisplay = (cust, inv) => {
    if (cust) {
      if (typeof cust === "object") return cust.name || cust._id || "Walk-in Customer";
      const s = String(cust).trim();
      if (s && s !== "null" && s !== "undefined" && s !== "[object Object]") return s;
    }
    // If invoice string has customer appended like "INV-TEST-1791690709156 Sreeja"
    if (inv) {
      const raw = typeof inv === "object" ? inv.invoiceNumber || "" : String(inv);
      const parts = raw.trim().split(/\s+/);
      if (parts.length > 1) {
        return parts.slice(1).join(" ");
      }
    }
    return "Walk-in Customer";
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const matchesStatus =
        filterStatus === "ALL" || item.status === filterStatus;

      const matchesMethod =
        filterMethod === "ALL" || item.paymentMethod === filterMethod;

      const q = searchQuery.toLowerCase().trim();
      const rawInvText = typeof item.invoice === "object" ? item.invoice.invoiceNumber || "" : String(item.invoice || "");
      const invText = getInvoiceDisplay(item.invoice).toLowerCase();
      const custText = getCustomerDisplay(item.customer, item.invoice).toLowerCase();
      const refText = (item.transactionReference || "").toLowerCase();
      const methodText = (item.paymentMethod || "").toLowerCase();
      const amtText = String(item.amount || "");

      const matchesQuery =
        !q ||
        invText.includes(q) ||
        rawInvText.toLowerCase().includes(q) ||
        custText.includes(q) ||
        refText.includes(q) ||
        methodText.includes(q) ||
        amtText.includes(q);

      return matchesStatus && matchesMethod && matchesQuery;
    });
  }, [payments, filterStatus, filterMethod, searchQuery]);

  // Metrics
  const totalAmountCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const paidCount = useMemo(() => {
    return payments.filter((p) => String(p.status).toUpperCase() === "PAID").length;
  }, [payments]);

  const pendingCount = useMemo(() => {
    return payments.filter((p) => String(p.status).toUpperCase() !== "PAID").length;
  }, [payments]);

  return (
    <div className="catalog-page payment-page-container">
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Payments"
        description="Record customer payments, reconcile balances, and manage payment records."
        actionButton={
          canManagePayments ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              id="btn-record-payment"
            >
              <FiPlus />
              <span>Record Payment</span>
            </button>
          ) : null
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Total Payments"
          value={formatNumber(payments.length)}
          icon={FiCreditCard}
          variant="primary"
        />
        <KpiCard
          label="Total Collected"
          value={formatKpiCurrency(totalAmountCollected)}
          icon={FiDollarSign}
          variant="success"
        />
        <KpiCard
          label="Completed Payments"
          value={formatNumber(paidCount)}
          icon={FiCheckCircle}
          variant="blue"
        />
        <KpiCard
          label="Pending / Partial"
          value={formatNumber(pendingCount)}
          icon={FiClock}
          variant="warning"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search payments by invoice, customer, reference, or amount..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              options={filterStatusOptions}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Status"
            />
          </div>

          <div className="filter-control-item filter-select-method">
            <Select
              options={filterMethodOptions}
              value={filterMethod}
              onChange={setFilterMethod}
              placeholder="Method"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchPayments}
            title="Refresh payment records"
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-container">
        {loading && payments.length === 0 ? (
          <SkeletonTable rows={5} columns={7} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={FiCreditCard}
            title="No Payment Records Found"
            description={
              canManagePayments
                ? "Get started by recording your first customer invoice payment."
                : "No payment records available."
            }
            actionText={canManagePayments ? "Record Payment" : null}
            onAction={canManagePayments ? handleOpenCreateModal : undefined}
          />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Payments"
            description="No transactions match your search criteria."
            actionText="Clear Filters"
            onAction={() => {
              setSearchQuery("");
              setFilterStatus("ALL");
              setFilterMethod("ALL");
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} className="col-hide-md" />
                <col style={{ width: "11%" }} />
                <col style={{ width: "7%" }} className="col-hide-md" />
                <col style={{ width: "11%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-pay-id" style={{ width: "11%" }}>Payment ID</th>
                  <th className="col-left col-invoice-num" style={{ width: "10%" }}>Invoice #</th>
                  <th className="col-left col-customer" style={{ width: "18%" }}>Customer</th>
                  <th className="col-left col-date col-hide-md" style={{ width: "10%" }}>Date</th>
                  <th className="col-right col-amount" style={{ width: "11%" }}>Amount</th>
                  <th className="col-left col-method col-hide-md" style={{ width: "7%" }}>Method</th>
                  <th className="col-left col-status" style={{ width: "11%" }}>Status</th>
                  <th className="col-actions" style={{ width: "22%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="col-left col-code col-pay-id">
                      <ShortId prefix="PAY" id={payment._id} />
                    </td>
                    <td className="col-left col-code col-invoice-num">
                      <span className="invoice-chip" title={typeof payment.invoice === "object" ? payment.invoice.invoiceNumber || payment.invoice._id : String(payment.invoice || "—")}>
                        {getInvoiceDisplay(payment.invoice)}
                      </span>
                    </td>
                    <td className="col-left col-customer">
                      <strong className="item-name-cell" title={getCustomerDisplay(payment.customer, payment.invoice)}>
                        {getCustomerDisplay(payment.customer, payment.invoice)}
                      </strong>
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{formatDate(payment.paymentDate)}</span>
                    </td>
                    <td className="col-right col-money col-amount">
                      <span className="table-amount">{formatCurrency(payment.amount)}</span>
                    </td>
                    <td className="col-left col-method col-hide-md">
                      <span className="payment-method-chip">
                        {payment.paymentMethod || "Cash"}
                      </span>
                    </td>
                    <td className="col-left col-status">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onView={() => setViewPayment(payment)}
                        onEdit={canManagePayments ? () => handleEdit(payment) : undefined}
                        onDelete={canManagePayments ? () => setDeleteId(payment._id) : undefined}
                        viewTitle="View Payment"
                        editTitle="Edit"
                        deleteTitle="Delete"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {filteredPayments.map((payment) => (
                <div key={payment._id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <ShortId prefix="PAY" id={payment._id} />
                      <strong className="mobile-card-title" style={{ display: "block", marginTop: "2px" }}>
                        {getCustomerDisplay(payment.customer)}
                      </strong>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Invoice</span>
                      <span className="mobile-card-value">{getInvoiceDisplay(payment.invoice)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Date</span>
                      <span className="mobile-card-value">{formatDate(payment.paymentDate)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Method</span>
                      <span className="mobile-card-value">{payment.paymentMethod || "Cash"}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Amount</span>
                      <strong className="mobile-card-value" style={{ color: "var(--brand-primary, #6366f1)" }}>
                        {formatCurrency(payment.amount)}
                      </strong>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => setViewPayment(payment)}
                      onEdit={canManagePayments ? () => handleEdit(payment) : undefined}
                      onDelete={canManagePayments ? () => setDeleteId(payment._id) : undefined}
                      viewTitle="View Payment"
                      editTitle="Edit"
                      deleteTitle="Delete"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Record / Edit Payment Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingId ? "Edit Payment Details" : "Record New Payment"}
          maxWidth="560px"
        >
          <form onSubmit={handleSubmit} className="payment-modal-form">
            <div className="modal-two-col-grid">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Select Invoice (Quick Link)</label>
                <Select
                  name="invoiceSelect"
                  value={form.invoice}
                  onChange={(val) => {
                    const selected = invoices.find(
                      (i) => String(i._id) === String(val) || i.invoiceNumber === val
                    );
                    if (selected) {
                      const total = Number(selected.grandTotal) || 0;
                      const paid = Number(selected.paidAmount) || 0;
                      const remaining = Math.max(0, total - paid);
                      setForm((prev) => ({
                        ...prev,
                        invoice: selected.invoiceNumber,
                        customer: prev.customer || selected.customerDetails?.name || "",
                        amount: remaining > 0 ? String(remaining) : (prev.amount || String(total))
                      }));
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        invoice: val
                      }));
                    }
                  }}
                  options={[
                    { value: "", label: "-- Custom / Direct Payment (No Invoice) --" },
                    ...invoices.map((inv) => {
                      const cName = inv.customerDetails?.name || "Customer";
                      const total = Number(inv.grandTotal) || 0;
                      const paid = Number(inv.paidAmount) || 0;
                      const remaining = Math.max(0, total - paid);
                      return {
                        value: inv.invoiceNumber,
                        label: `${inv.invoiceNumber} — ${cName}`,
                        subtitle: remaining > 0 ? `Pending: ₹${remaining.toLocaleString('en-IN')} (Total: ₹${total.toLocaleString('en-IN')})` : `Total: ₹${total.toLocaleString('en-IN')} • Already Paid`
                      };
                    })
                  ]}
                  placeholder="Choose an existing invoice..."
                  searchable={invoices.length > 5}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <input
                  type="text"
                  name="invoice"
                  value={form.invoice}
                  onChange={handleChange}
                  placeholder="e.g. INV-0001 or INV-009"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  name="customer"
                  value={form.customer}
                  onChange={handleChange}
                  placeholder="e.g. John Doe or Sreeja"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Payment Method</label>
                <Select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={(val) => setForm((prev) => ({ ...prev, paymentMethod: val }))}
                  options={modalPaymentMethodOptions}
                  placeholder="Select Method"
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Payment Date</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={form.paymentDate}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Status</label>
                <Select
                  name="status"
                  value={form.status}
                  onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
                  options={modalStatusOptions}
                  placeholder="Select Status"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label">Transaction Reference / UTR</label>
              <input
                type="text"
                name="transactionReference"
                value={form.transactionReference}
                onChange={handleChange}
                placeholder="Optional reference ID or UPI transaction hash"
                className="form-control"
              />
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner"></span> : editingId ? "Update Payment" : "Save Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? This action cannot be reversed."
        confirmText="Delete Payment"
        isDanger={true}
        loading={loading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />

      {/* View Payment Modal */}
      {viewPayment && (
        <Modal
          isOpen={Boolean(viewPayment)}
          onClose={() => setViewPayment(null)}
          title="Payment Details"
          maxWidth="580px"
        >
          <div className="payment-view-container">
            {/* 1. Hero Card: Amount, Status, and Method */}
            <div className="payment-view-hero">
              <div className="payment-view-hero-left">
                <span className="payment-view-hero-label">Total Amount Paid</span>
                <div className="payment-view-hero-amount">
                  {formatCurrency(viewPayment.amount)}
                </div>
              </div>
              <div className="payment-view-hero-badges">
                <StatusBadge status={viewPayment.status} />
                <span className="payment-method-chip">
                  <FiCreditCard style={{ marginRight: "4px" }} />
                  {viewPayment.paymentMethod || "Cash"}
                </span>
              </div>
            </div>

            {/* 2. Structured Two-Column Information Grid */}
            <div className="payment-view-grid">
              <div className="payment-view-card">
                <div className="payment-view-item-label">
                  <FiHash className="view-icon" />
                  <span>Payment ID</span>
                </div>
                <div className="payment-view-item-value">
                  <ShortId prefix="PAY" id={viewPayment._id} />
                </div>
              </div>

              <div className="payment-view-card">
                <div className="payment-view-item-label">
                  <FiCalendar className="view-icon" />
                  <span>Payment Date</span>
                </div>
                <div className="payment-view-item-value">
                  {formatDate(viewPayment.paymentDate)}
                </div>
              </div>

              <div className="payment-view-card">
                <div className="payment-view-item-label">
                  <FiUser className="view-icon" />
                  <span>Customer</span>
                </div>
                <div className="payment-view-item-value">
                  <strong>{getCustomerDisplay(viewPayment.customer, viewPayment.invoice)}</strong>
                  {typeof viewPayment.customer === "object" && viewPayment.customer?.phone && (
                    <span className="payment-view-subtext">{viewPayment.customer.phone}</span>
                  )}
                </div>
              </div>

              <div className="payment-view-card">
                <div className="payment-view-item-label">
                  <FiFileText className="view-icon" />
                  <span>Invoice Number</span>
                </div>
                <div className="payment-view-item-value">
                  <span className="invoice-chip">
                    {getInvoiceDisplay(viewPayment.invoice)}
                  </span>
                </div>
              </div>

              <div className="payment-view-card payment-view-full-width">
                <div className="payment-view-item-label">
                  <span>Reference / Note</span>
                </div>
                <div className="payment-view-item-value">
                  <div className="payment-ref-text">
                    {viewPayment.transactionReference || "No reference provided"}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Invoice Reconciliation Summary (if invoice object is populated) */}
            {typeof viewPayment.invoice === "object" && viewPayment.invoice?.grandTotal !== undefined && (
              <div className="payment-view-reconciliation">
                <div className="reconciliation-row">
                  <span>Invoice Total</span>
                  <strong>{formatCurrency(viewPayment.invoice.grandTotal)}</strong>
                </div>
                <div className="reconciliation-row">
                  <span>Total Paid</span>
                  <strong style={{ color: "#16a34a" }}>
                    {formatCurrency(viewPayment.invoice.paidAmount ?? viewPayment.amount)}
                  </strong>
                </div>
                <div className="reconciliation-row">
                  <span>Balance Due</span>
                  <strong style={{ color: Math.max(0, (Number(viewPayment.invoice.grandTotal) || 0) - (Number(viewPayment.invoice.paidAmount) || Number(viewPayment.amount) || 0)) > 0 ? "#dc2626" : "#0f172a" }}>
                    {formatCurrency(Math.max(0, (Number(viewPayment.invoice.grandTotal) || 0) - (Number(viewPayment.invoice.paidAmount) || Number(viewPayment.amount) || 0)))}
                  </strong>
                </div>
              </div>
            )}

            {/* 4. Footer Actions */}
            <div className="payment-view-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewPayment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Payment;