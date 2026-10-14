import React, { useEffect, useState, useMemo, useCallback } from "react";
import expenseService from "../services/expenseService";
import Modal from "../components/Common/Modal";
import ConfirmDialog from "../components/Common/ConfirmDialog";
import Toast from "../components/Common/Toast";
import Select from "../components/Common/Select";
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
import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiDollarSign,
  FiCalendar,
  FiTag,
  FiFileText
} from "react-icons/fi";
import "./Catalog.css";
import "./Expense.css";

const categories = [
  "Rent",
  "Electricity",
  "Transport",
  "Salary",
  "Maintenance",
  "Office Supplies",
  "Other"
];

const paymentMethods = ["Cash", "UPI", "Card", "Bank Transfer"];

const initialForm = {
  category: "",
  amount: "",
  date: "",
  paymentMethod: "Cash",
  description: ""
};

function Expense() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterMethod, setFilterMethod] = useState("ALL");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await expenseService.getExpenses();
      setExpenses(result.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Cash"
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleEdit = (expense) => {
    setEditingId(expense._id);
    setForm({
      category: expense.category || "",
      amount: expense.amount ?? "",
      paymentMethod: expense.paymentMethod || "Cash",
      date: expense.date
        ? new Date(expense.date).toISOString().split("T")[0]
        : "",
      description: expense.description || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.category) {
      showToast("Please select an expense category.", "error");
      return;
    }

    if (!form.amount || Number(form.amount) < 0) {
      showToast("Please enter a valid amount.", "error");
      return;
    }

    if (!form.paymentMethod) {
      showToast("Please select a payment method.", "error");
      return;
    }

    if (!form.date) {
      showToast("Please select a date.", "error");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        paymentMethod: form.paymentMethod,
        description: form.description
      };

      if (editingId) {
        await expenseService.updateExpense(editingId, payload);
        showToast("Expense updated successfully.", "success");
      } else {
        await expenseService.createExpense(payload);
        showToast("Expense recorded successfully.", "success");
      }

      handleCloseModal();
      await fetchExpenses();
    } catch (err) {
      showToast(err.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      await expenseService.deleteExpense(deleteId);
      setDeleteId(null);
      showToast("Expense deleted successfully.", "success");
      await fetchExpenses();
    } catch (err) {
      setDeleteId(null);
      showToast(err.message || "Failed to delete expense.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesCategory =
        filterCategory === "ALL" || item.category === filterCategory;

      const matchesMethod =
        filterMethod === "ALL" || (item.paymentMethod || "Cash") === filterMethod;

      const q = searchQuery.toLowerCase().trim();
      const catText = (item.category || "").toLowerCase();
      const methodText = (item.paymentMethod || "").toLowerCase();
      const descText = (item.description || "").toLowerCase();
      const amtText = String(item.amount || "");

      const matchesQuery =
        !q ||
        catText.includes(q) ||
        methodText.includes(q) ||
        descText.includes(q) ||
        amtText.includes(q);

      return matchesCategory && matchesMethod && matchesQuery;
    });
  }, [expenses, filterCategory, filterMethod, searchQuery]);

  // Metrics
  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    expenses.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + Number(e.amount || 0);
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "—";
  }, [expenses]);

  return (
    <div className="catalog-page expense-page-container">
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
        title="Expenses"
        description="Record and track operational overheads, bills, and category expenditures."
        actionButton={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
            id="btn-add-expense"
          >
            <FiPlus />
            <span>Record Expense</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Records"
          value={formatNumber(expenses.length)}
          icon={FiFileText}
          variant="primary"
        />
        <KpiCard
          label="Total Expenditure"
          value={formatKpiCurrency(totalExpenseAmount)}
          icon={FiDollarSign}
          variant="warning"
        />
        <KpiCard
          label="Highest Category"
          value={categoryBreakdown}
          icon={FiTag}
          variant="blue"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search expenses by category or description..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-category">
            <Select
              options={[
                { value: "ALL", label: "All Categories" },
                ...categories.map((c) => ({ value: c, label: c }))
              ]}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Category"
            />
          </div>

          <div className="filter-control-item filter-select-method">
            <Select
              options={[
                { value: "ALL", label: "All Payment Methods" },
                ...paymentMethods.map((m) => ({ value: m, label: m }))
              ]}
              value={filterMethod}
              onChange={setFilterMethod}
              placeholder="Payment Method"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchExpenses}
            title="Refresh expense records"
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-container">
        {loading && expenses.length === 0 ? (
          <SkeletonTable rows={5} columns={6} />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={FiDollarSign}
            title="No Expenses Recorded"
            description="Start logging overhead expenses to accurately track business profitability."
            actionText="Record Expense"
            onAction={handleOpenCreateModal}
          />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Expenses"
            description="No expense records match your active search filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearchQuery("");
              setFilterCategory("ALL");
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} className="col-hide-md" />
                <col style={{ width: "13%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-exp-code" style={{ width: "11%" }}>Code</th>
                  <th className="col-left col-category" style={{ width: "14%" }}>Category</th>
                  <th className="col-left col-method" style={{ width: "13%" }}>Method</th>
                  <th className="col-left col-description" style={{ width: "20%" }}>Description</th>
                  <th className="col-left col-date col-hide-md" style={{ width: "12%" }}>Date</th>
                  <th className="col-right col-amount" style={{ width: "13%" }}>Amount</th>
                  <th className="col-actions" style={{ width: "17%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense._id}>
                    <td className="col-left col-code col-exp-code">
                      <ShortId prefix="EXP" id={expense._id} />
                    </td>
                    <td className="col-left col-category">
                      <span className="payment-method-chip">
                        {expense.category}
                      </span>
                    </td>
                    <td className="col-left col-method">
                      <span className="table-amount" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                        {expense.paymentMethod || "Cash"}
                      </span>
                    </td>
                    <td className="col-left col-description">
                      <span className="item-name-cell" title={expense.description}>
                        {formatOptional(expense.description)}
                      </span>
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{formatDate(expense.date)}</span>
                    </td>
                    <td className="col-right col-money col-amount">
                      <span className="table-amount">{formatCurrency(expense.amount)}</span>
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onEdit={() => handleEdit(expense)}
                        onDelete={() => setDeleteId(expense._id)}
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
              {filteredExpenses.map((expense) => (
                <div key={expense._id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <ShortId prefix="EXP" id={expense._id} />
                      <strong className="mobile-card-title" style={{ display: "block", marginTop: "2px" }}>
                        {expense.category}
                      </strong>
                    </div>
                    <strong style={{ fontSize: "1.125rem", color: "var(--brand-primary, #6366f1)" }}>
                      {formatCurrency(expense.amount)}
                    </strong>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Expense Date</span>
                      <span className="mobile-card-value">{formatDate(expense.date)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Payment Method</span>
                      <span className="mobile-card-value">{expense.paymentMethod || "Cash"}</span>
                    </div>
                    <div className="mobile-card-field col-span-2">
                      <span className="mobile-card-label">Description</span>
                      <span className="mobile-card-value">{formatOptional(expense.description)}</span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onEdit={() => handleEdit(expense)}
                      onDelete={() => setDeleteId(expense._id)}
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

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingId ? "Edit Expense Entry" : "Record New Expense"}
          maxWidth="520px"
        >
          <form onSubmit={handleSubmit} className="expense-modal-form">
            <div className="form-group">
              <label className="form-label required">Expense Category</label>
              <Select
                name="category"
                value={form.category}
                onChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
                options={categories.map((c) => ({ value: c, label: c }))}
                placeholder="Select Category"
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Payment Method</label>
              <Select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={(val) => setForm((prev) => ({ ...prev, paymentMethod: val }))}
                options={paymentMethods.map((m) => ({ value: m, label: m }))}
                placeholder="Select Payment Method"
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
              <label className="form-label required">Expense Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Remarks</label>
              <textarea
                name="description"
                rows="3"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional details or vendor references..."
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
                {loading ? <span className="spinner"></span> : editingId ? "Update Expense" : "Save Expense"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Expense Entry"
        message="Are you sure you want to delete this expense record? This change cannot be undone."
        confirmText="Delete Expense"
        isDanger={true}
        loading={loading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

export default Expense;