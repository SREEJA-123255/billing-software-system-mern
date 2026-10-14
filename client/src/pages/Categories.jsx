import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiLayers,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from "react-icons/fi";
import categoryService from "../services/categoryService";
import Modal from "../components/Common/Modal";
import ConfirmDialog from "../components/Common/ConfirmDialog";
import Toast from "../components/Common/Toast";
import StatusBadge from "../components/Common/StatusBadge";
import Select from "../components/Common/Select";
import SearchBar from "../components/Common/SearchBar";
import PageHeader from "../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../components/Common/KpiCard";
import TableActions from "../components/Common/TableActions";
import ShortId from "../components/Common/ShortId";
import { SkeletonTable } from "../components/Common/Skeleton";
import EmptyState from "../components/Common/EmptyState";
import { formatNumber, formatDate, formatOptional } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import { canManage } from "../config/permissions";
import "./Catalog.css";
import "./Categories.css";

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" }
];

const MODAL_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" }
];

const Categories = () => {
  const { currentUser } = useAuth();
  const canManageCategories = canManage(currentUser?.role, "categories");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "ACTIVE"
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // View Details Modal State
  const [detailsCategory, setDetailsCategory] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Permanent Delete Modal State
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirmation Dialog (for Deactivation)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: "",
    hasProducts: false,
    message: "",
    loading: false
  });

  // Toast State
  const [toast, setToast] = useState({ message: "", type: "info" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryService.getCategories({
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load categories. Please check your network connection."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCategories();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchCategories]);

  // Open Add Modal
  const handleOpenAdd = () => {
    if (!canManageCategories) return;
    setEditingId(null);
    setFormData({ name: "", description: "", status: "ACTIVE" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (category) => {
    if (!canManageCategories) return;
    setEditingId(category._id);
    setFormData({
      name: category.name || "",
      description: category.description || "",
      status: category.status || "ACTIVE"
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const fieldName = name === "categoryName" ? "name" : name;
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName]) {
      setFormErrors((prev) => ({ ...prev, [fieldName]: null }));
    }
  };

  // Validate Form
  const validateForm = () => {
    const errors = {};
    const trimmed = formData.name.trim().replace(/\s+/g, " ");

    if (!trimmed) {
      errors.name = "Category name is required";
    } else if (trimmed.length < 2) {
      errors.name = "Category name must be at least 2 characters";
    } else {
      const duplicate = categories.find(
        (c) =>
          c.name.trim().replace(/\s+/g, " ").toLowerCase() === trimmed.toLowerCase() &&
          c._id !== editingId
      );
      if (duplicate) {
        errors.name = "Category name already exists";
      }
    }

    return errors;
  };

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    const cleanName = formData.name.trim().replace(/\s+/g, " ");
    try {
      if (editingId) {
        await categoryService.updateCategory(editingId, {
          name: cleanName,
          description: formData.description.trim(),
          status: formData.status
        });
        showToast("Category updated successfully", "success");
      } else {
        await categoryService.createCategory({
          name: cleanName,
          description: formData.description.trim(),
          status: formData.status
        });
        showToast("Category created successfully", "success");
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error("Save category error:", err);
      const msg = err.response?.data?.message || "Failed to save category";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // View Details Modal
  const handleOpenDetails = (category) => {
    setDetailsCategory(category);
    setIsDetailsOpen(true);
  };

  // Open Permanent Delete Confirmation
  const handleOpenDelete = (category) => {
    if (!canManageCategories) return;
    setCategoryToDelete(category);
    setIsDeleteOpen(true);
  };

  // Confirm Permanent Delete
  const handleConfirmDelete = async () => {
    if (!canManageCategories || !categoryToDelete) return;
    setIsDeleting(true);
    try {
      await categoryService.permanentlyDeleteCategory(categoryToDelete._id);
      showToast(`Category "${categoryToDelete.name}" deleted successfully`, "success");
      setIsDeleteOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      console.error("Delete category error:", err);
      const msg = err.response?.data?.message || "Failed to delete category";
      showToast(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Activate Category
  const handleActivateCategory = async (category) => {
    if (!canManageCategories) return;
    try {
      await categoryService.updateCategory(category._id, { status: "ACTIVE" });
      showToast(`Category "${category.name}" activated successfully`, "success");
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to activate category", "error");
    }
  };

  // Prompt Deactivate
  const promptDeactivate = (category) => {
    if (!canManageCategories) return;
    setConfirmDialog({
      isOpen: true,
      categoryId: category._id,
      categoryName: category.name,
      hasProducts: false,
      message: `Are you sure you want to deactivate "${category.name}"? Active products will retain this category, but it will no longer appear for new entries.`,
      loading: false
    });
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await categoryService.deleteCategory(confirmDialog.categoryId, { action: "deactivate" });
      showToast(`Category "${confirmDialog.categoryName}" deactivated successfully`, "success");
      setConfirmDialog({ isOpen: false, categoryId: null, categoryName: "", hasProducts: false, message: "", loading: false });
      fetchCategories();
    } catch (err) {
      console.error("Deactivate error:", err);
      const errorData = err.response?.data;
      if (errorData?.hasProducts) {
        setConfirmDialog({
          isOpen: true,
          categoryId: confirmDialog.categoryId,
          categoryName: confirmDialog.categoryName,
          hasProducts: true,
          message: errorData.message || `This category contains products and cannot be deleted. Would you like to deactivate it instead?`,
          loading: false
        });
      } else {
        showToast(errorData?.message || "Failed to deactivate category", "error");
        setConfirmDialog((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  // Force deactivation when products attached
  const handleConfirmForceDeactivate = async () => {
    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await categoryService.updateCategory(confirmDialog.categoryId, { status: "INACTIVE" });
      showToast(`Category "${confirmDialog.categoryName}" deactivated successfully`, "success");
      setConfirmDialog({ isOpen: false, categoryId: null, categoryName: "", hasProducts: false, message: "", loading: false });
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate category", "error");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === "ACTIVE").length;
    const inactive = categories.filter((c) => c.status === "INACTIVE").length;
    return { total, active, inactive };
  }, [categories]);

  // Filtered & Sorted: Newest created first (createdAt descending)
  const sortedCategories = useMemo(() => {
    const filtered = categories.filter((cat) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "ALL" || cat.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const getCreatedTime = (cat) => {
      if (cat.createdAt) return new Date(cat.createdAt).getTime();
      if (cat._id && typeof cat._id === "string" && cat._id.length === 24) {
        return parseInt(cat._id.substring(0, 8), 16) * 1000;
      }
      return 0;
    };

    return filtered.sort((a, b) => {
      const dateA = getCreatedTime(a);
      const dateB = getCreatedTime(b);
      if (dateB !== dateA) return dateB - dateA;
      return (b._id || "").toString().localeCompare((a._id || "").toString());
    });
  }, [categories, search, statusFilter]);

  return (
    <div className="catalog-page categories-page">
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
        title="Categories"
        description="Organize catalog inventory items into distinct categories."
        actionButton={
          canManageCategories ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              id="btn-add-category"
            >
              <FiPlus />
              <span>Add Category</span>
            </button>
          ) : null
        }
      />

      {/* 2. Summary Cards Grid */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Categories"
          value={formatNumber(metrics.total)}
          icon={FiLayers}
          variant="primary"
        />
        <KpiCard
          label="Active Categories"
          value={formatNumber(metrics.active)}
          icon={FiCheckCircle}
          variant="success"
        />
        <KpiCard
          label="Inactive Categories"
          value={formatNumber(metrics.inactive)}
          icon={FiXCircle}
          variant="neutral"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search categories by name or description..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-category-status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
              ariaLabel="Filter categories by status"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchCategories}
            title="Refresh categories"
            aria-label="Refresh categories list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: "24px" }}>
          <FiAlertCircle style={{ fontSize: "1.25rem", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{error}</div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchCategories}>
            Retry
          </button>
        </div>
      )}

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FiLayers}
            title="No Categories Found"
            description={
              canManageCategories
                ? "No categories have been added yet. Click 'Add Category' to create one."
                : "No categories currently available in catalog."
            }
            actionText={canManageCategories ? "Add Category" : null}
            onAction={canManageCategories ? handleOpenAdd : undefined}
          />
        ) : sortedCategories.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Categories"
            description="No categories match your search filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearch("");
              setStatusFilter("ALL");
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: "25%" }} />
                <col className="col-flex" />
                <col style={{ width: "135px" }} className="col-hide-md" />
                <col style={{ width: "140px" }} />
                <col style={{ width: "250px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left" style={{ width: "25%" }}>Category Name</th>
                  <th className="col-left">Description</th>
                  <th className="col-left col-hide-md" style={{ width: "135px" }}>Created Date</th>
                  <th className="col-left" style={{ width: "140px" }}>Status</th>
                  <th className="col-actions" style={{ width: "250px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => (
                  <tr key={cat._id}>
                    <td className="col-left">
                      <strong className="item-name-cell" title={cat.name}>
                        {cat.name}
                      </strong>
                    </td>
                    <td className="col-left" style={{ color: "var(--text-muted, #64748b)" }} title={cat.description}>
                      <div className="cell-name-wrap">
                        {formatOptional(cat.description)}
                      </div>
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{formatDate(cat.createdAt)}</span>
                    </td>
                    <td className="col-left col-status">
                      <StatusBadge status={cat.status} />
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onView={() => handleOpenDetails(cat)}
                        onEdit={canManageCategories ? () => handleOpenEdit(cat) : undefined}
                        status={cat.status}
                        onActivate={canManageCategories ? () => handleActivateCategory(cat) : undefined}
                        onDeactivate={canManageCategories ? () => promptDeactivate(cat) : undefined}
                        onDelete={canManageCategories ? () => handleOpenDelete(cat) : undefined}
                        viewTitle="View"
                        editTitle="Edit"
                        activateTitle="Activate"
                        deactivateTitle="Deactivate"
                        deleteTitle="Delete"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {sortedCategories.map((cat) => (
                <div key={cat._id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <strong className="mobile-card-title">{cat.name}</strong>
                    <StatusBadge status={cat.status} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field col-span-2">
                      <span className="mobile-card-label">Description</span>
                      <span className="mobile-card-value">{formatOptional(cat.description)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Created Date</span>
                      <span className="mobile-card-value">{formatDate(cat.createdAt)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Status</span>
                      <span className="mobile-card-value">{cat.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => handleOpenDetails(cat)}
                      onEdit={canManageCategories ? () => handleOpenEdit(cat) : undefined}
                      status={cat.status}
                      onActivate={canManageCategories ? () => handleActivateCategory(cat) : undefined}
                      onDeactivate={canManageCategories ? () => promptDeactivate(cat) : undefined}
                      onDelete={canManageCategories ? () => handleOpenDelete(cat) : undefined}
                      viewTitle="View Category"
                      editTitle="Edit Category"
                      activateTitle="Activate Category"
                      deactivateTitle="Deactivate Category"
                      deleteTitle="Delete Category"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Category" : "Add New Category"}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveCategory} autoComplete="off">
          <div className="form-group">
            <label className="form-label required">Category Name</label>
            <input
              type="text"
              name="categoryName"
              id="category-name-input"
              className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
              placeholder="e.g. Footwear, Sports & Fitness, Toys, Kitchenware"
              value={formData.name}
              onChange={handleFormChange}
              maxLength="50"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-form-type="other"
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-control category-description-textarea"
              placeholder="Optional description of this product category"
              rows="3"
              value={formData.description}
              onChange={handleFormChange}
              maxLength="200"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <Select
              name="status"
              options={MODAL_STATUS_OPTIONS}
              value={formData.status}
              onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
            />
          </div>

          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <span className="spinner"></span> : editingId ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({
            isOpen: false,
            categoryId: null,
            categoryName: "",
            hasProducts: false,
            message: "",
            loading: false
          })
        }
        onConfirm={
          confirmDialog.hasProducts ? handleConfirmForceDeactivate : handleConfirmDeactivate
        }
        title={confirmDialog.hasProducts ? "Category Contains Products" : "Deactivate Category"}
        message={confirmDialog.message}
        confirmText={confirmDialog.hasProducts ? "Deactivate Anyway" : "Deactivate"}
        isDanger={true}
        loading={confirmDialog.loading}
      />

      {/* Category Details View Modal */}
      {isDetailsOpen && detailsCategory && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Category Details — ${detailsCategory.name}`}
          maxWidth="560px"
        >
          <div className="category-details-content">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "1.25rem"
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Category Code
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                  <ShortId prefix="CAT" id={detailsCategory._id} />
                </div>
              </div>
              <StatusBadge status={detailsCategory.status} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "1.25rem"
              }}
            >
              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Category Name</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {detailsCategory.name}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Status</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {detailsCategory.status === "ACTIVE" ? "Active" : "Inactive"}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Created Date</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {formatDate(detailsCategory.createdAt)}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Last Updated</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {formatDate(detailsCategory.updatedAt || detailsCategory.createdAt)}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Description</span>
                <div style={{ color: "#334155", fontSize: "0.875rem", marginTop: "4px", lineHeight: "1.5" }}>
                  {detailsCategory.description ? detailsCategory.description : <span style={{ color: "#94a3b8" }}>No description provided</span>}
                </div>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close
              </button>
              {canManageCategories && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleOpenEdit(detailsCategory);
                  }}
                >
                  Edit Category
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Permanent Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message={`Are you sure you want to permanently delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Category"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default Categories;