import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiPackage,
  FiAlertTriangle,
  FiAlertCircle,
  FiLayers
} from "react-icons/fi";
import productService from "../services/productService";
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
import { formatCurrency, formatNumber, formatOptional } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import { canManage } from "../config/permissions";
import "./Catalog.css";
import "./Products.css";

const emptyForm = {
  productName: "",
  sku: "",
  category: "",
  purchasePrice: "",
  sellingPrice: "",
  taxRate: 0,
  stockQuantity: "",
  minimumStock: "",
  status: "ACTIVE"
};

const Products = () => {
  const { currentUser } = useAuth();
  const canManageProducts = canManage(currentUser?.role, "products");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Details Modal State
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Delete Confirmation Dialog State
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ message: "", type: "info" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Fetch Categories
  const fetchCategoriesList = async () => {
    try {
      const res = await categoryService.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch categories list:", err);
    }
  };

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (lowStockOnly) params.lowStock = "true";

      const data = await productService.getProducts(params);
      let list = Array.isArray(data) ? data : data.products || [];

      if (lowStockOnly) {
        list = list.filter(
          (p) => Number(p.stockQuantity ?? 0) <= Number(p.minimumStock ?? 0)
        );
      }

      setProducts(list);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load products. Please check your network connection."
      );
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, lowStockOnly]);

  useEffect(() => {
    fetchCategoriesList();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchProducts]);

  const activeSortedCategories = useMemo(() => {
    return categories
      .filter((c) => c.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [categories]);

  const filterCategoryOptions = useMemo(() => {
    const sorted = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return [
      { value: "ALL", label: "All Categories" },
      ...sorted.map((c) => ({ value: c._id, label: c.name }))
    ];
  }, [categories]);

  const formCategoryOptions = useMemo(() => {
    if (!editingId) {
      return activeSortedCategories.map((c) => ({ value: c._id, label: c.name }));
    }
    const savedCatId = formData.category;
    const isAlreadyPresent = activeSortedCategories.some((c) => c._id === savedCatId);
    if (!isAlreadyPresent && savedCatId) {
      const savedCat = categories.find((c) => c._id === savedCatId);
      if (savedCat) {
        const combined = [
          ...activeSortedCategories,
          { ...savedCat, name: `${savedCat.name} (Deactivated)` }
        ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
        return combined.map((c) => ({ value: c._id, label: c.name }));
      }
    }
    return activeSortedCategories.map((c) => ({ value: c._id, label: c.name }));
  }, [activeSortedCategories, categories, editingId, formData.category]);

  const handleOpenAdd = () => {
    if (!canManageProducts) return;
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    if (!canManageProducts) return;
    setEditingId(prod._id);
    const catId = typeof prod.category === "object" ? prod.category?._id : prod.category;
    setFormData({
      productName: prod.productName || "",
      sku: prod.sku || "",
      category: catId || "",
      purchasePrice: prod.purchasePrice ?? "",
      sellingPrice: prod.sellingPrice ?? "",
      taxRate: prod.taxRate ?? 0,
      stockQuantity: prod.stockQuantity ?? "",
      minimumStock: prod.minimumStock ?? "",
      status: prod.status || "ACTIVE"
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "sku" ? value.toUpperCase() : value
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.productName.trim()) {
      errors.productName = "Product name is required";
    }
    if (!formData.sku.trim()) {
      errors.sku = "SKU is required";
    } else if (formData.sku.trim().length > 20) {
      errors.sku = "SKU must be at most 20 characters";
    }
    if (!formData.category) {
      errors.category = "Please select a category";
    }
    if (formData.purchasePrice === "" || Number(formData.purchasePrice) < 0) {
      errors.purchasePrice = "Purchase price cannot be negative";
    }
    if (formData.sellingPrice === "" || Number(formData.sellingPrice) < 0) {
      errors.sellingPrice = "Selling price cannot be negative";
    }
    if (formData.stockQuantity === "" || Number(formData.stockQuantity) < 0) {
      errors.stockQuantity = "Stock quantity cannot be negative";
    }
    if (formData.minimumStock === "" || Number(formData.minimumStock) < 0) {
      errors.minimumStock = "Minimum stock cannot be negative";
    }

    if (!editingId) {
      const cleanName = formData.productName.trim().toLowerCase();
      const cleanSku = formData.sku.trim().toUpperCase();

      const existingName = products.find(
        (p) => p.productName.trim().toLowerCase() === cleanName
      );
      if (existingName) {
        errors.productName = "Product name already exists";
      }

      const existingSku = products.find(
        (p) => p.sku.trim().toUpperCase() === cleanSku
      );
      if (existingSku) {
        errors.sku = "SKU already exists";
      }
    }

    return errors;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        productName: formData.productName.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        taxRate: Number(formData.taxRate),
        stockQuantity: Number(formData.stockQuantity),
        minimumStock: Number(formData.minimumStock),
        status: formData.status
      };

      if (editingId) {
        await productService.updateProduct(editingId, payload);
        showToast("Product updated successfully", "success");
      } else {
        await productService.createProduct(payload);
        showToast("Product created successfully", "success");
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error("Save product error:", err);
      const msg = err.response?.data?.message || "Failed to save product";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDetails = (prod) => {
    setDetailsProduct(prod);
    setIsDetailsOpen(true);
  };

  const handleToggleStatus = async (prod) => {
    if (!canManageProducts) return;
    const isCurrentlyActive = String(prod.status || "").toUpperCase() === "ACTIVE";
    const nextStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    try {
      await productService.updateProductStatus(prod._id, nextStatus);
      showToast(
        `Product "${prod.productName}" status changed to ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}`,
        "success"
      );
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update product status", "error");
    }
  };

  const handleOpenDelete = (prod) => {
    if (!canManageProducts) return;
    setProductToDelete(prod);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canManageProducts || !productToDelete) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(productToDelete._id);
      showToast(`Product "${productToDelete.productName}" deleted successfully`, "success");
      setIsDeleteOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      console.error("Delete product error:", err);
      showToast(err.response?.data?.message || "Failed to delete product", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryName = (cat) => {
    if (!cat) return "Uncategorized";
    if (typeof cat === "object" && cat.name) return cat.name;
    const found = categories.find((c) => c._id === cat);
    return found ? found.name : "Uncategorized";
  };

  const summaryMetrics = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter(
      (p) => Number(p.stockQuantity ?? 0) <= Number(p.minimumStock ?? 0)
    ).length;
    const activeCats = categories.filter((c) => c.status === "ACTIVE").length;
    return {
      totalProducts: total,
      lowStockCount: lowStock,
      activeCategories: activeCats
    };
  }, [products, categories]);

  return (
    <div className="catalog-page products-page">
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
        title="Products"
        description="Manage product catalog items, sell prices, cost prices, tax rates, and inventory status."
        actionButton={
          canManageProducts ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              id="btn-add-product"
              aria-label="Add New Product"
            >
              <FiPlus />
              <span>Add New Product</span>
            </button>
          ) : null
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Products"
          value={formatNumber(summaryMetrics.totalProducts)}
          icon={FiPackage}
          variant="primary"
        />
        <KpiCard
          label="Low Stock Alerts"
          value={formatNumber(summaryMetrics.lowStockCount)}
          icon={FiAlertTriangle}
          variant={summaryMetrics.lowStockCount > 0 ? "warning" : "blue"}
        />
        <KpiCard
          label="Active Categories"
          value={formatNumber(summaryMetrics.activeCategories)}
          icon={FiLayers}
          variant="success"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            id="products-search-bar"
            value={search}
            onChange={setSearch}
            placeholder="Search products by name or SKU..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-category">
            <Select
              id="filter-product-category"
              options={filterCategoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Category"
              ariaLabel="Filter products by category"
              searchable={categories.length > 8}
            />
          </div>

          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-product-status"
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
              ariaLabel="Filter products by status"
            />
          </div>

          <label className={`filter-control-item filter-checkbox-lowstock ${lowStockOnly ? "lowstock-active" : ""}`}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              aria-label="Filter low stock products only"
            />
            <span>Low Stock Only</span>
          </label>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchProducts}
            title="Refresh products list"
            aria-label="Refresh products list"
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
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchProducts}>
            Retry
          </button>
        </div>
      )}

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={FiPackage}
            title="No Products Found"
            description={
              canManageProducts
                ? "No products in your catalog yet. Click 'Add New Product' to get started."
                : "No products currently available in catalog."
            }
            actionLabel={canManageProducts ? "Add New Product" : null}
            onAction={canManageProducts ? handleOpenAdd : undefined}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table" aria-label="Products Catalog">
              <colgroup>
                <col style={{ width: "100px" }} />
                <col className="col-flex" />
                <col style={{ width: "115px" }} className="prod-hide-tablet" />
                <col style={{ width: "120px" }} className="prod-hide-tablet" />
                <col style={{ width: "120px" }} />
                <col style={{ width: "95px" }} className="prod-hide-tablet" />
                <col style={{ width: "135px" }} />
                <col style={{ width: "115px" }} />
                <col style={{ width: "245px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="col-left" style={{ width: "100px" }}>Code</th>
                  <th scope="col" className="col-left">Product / SKU</th>
                  <th scope="col" className="col-left prod-hide-tablet" style={{ width: "115px" }}>Category</th>
                  <th scope="col" className="col-right prod-hide-tablet" style={{ width: "120px" }}>Cost Price</th>
                  <th scope="col" className="col-right" style={{ width: "120px" }}>Sell Price</th>
                  <th scope="col" className="col-right prod-hide-tablet" style={{ width: "95px" }}>Tax Rate</th>
                  <th scope="col" className="col-center" style={{ width: "135px" }}>Stock (Units)</th>
                  <th scope="col" className="col-left" style={{ width: "115px" }}>Status</th>
                  <th scope="col" className="col-actions" style={{ width: "245px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const isLow = Number(prod.stockQuantity ?? 0) <= Number(prod.minimumStock ?? 0);
                  return (
                    <tr key={prod._id}>
                      <td className="col-left col-code">
                        <ShortId prefix="PRD" id={prod._id} />
                      </td>
                      <td className="col-left prod-col-name">
                        <div className="product-title-group">
                          <strong className="product-name-text" title={prod.productName}>
                            {prod.productName}
                          </strong>
                          <span className="product-sku-badge" title={`SKU: ${prod.sku}`}>
                            SKU: {prod.sku}
                          </span>
                        </div>
                      </td>
                      <td className="col-left prod-hide-tablet">
                        <span className="product-category-chip" title={getCategoryName(prod.category)}>
                          {getCategoryName(prod.category)}
                        </span>
                      </td>
                      <td className="col-right col-money prod-hide-tablet">
                        <span className="table-amount" style={{ color: "#64748b" }}>
                          {formatCurrency(prod.purchasePrice)}
                        </span>
                      </td>
                      <td className="col-right col-money">
                        <span className="table-amount" style={{ fontWeight: 600, color: "#0f172a" }}>
                          {formatCurrency(prod.sellingPrice)}
                        </span>
                      </td>
                      <td className="col-right prod-hide-tablet">
                        <span className="table-amount">{prod.taxRate || 0}%</span>
                      </td>
                      <td className="col-center">
                        <div className="product-stock-cell">
                          <div className="stock-quantity-row">
                            {isLow && (
                              <FiAlertTriangle
                                className="stock-alert-icon"
                                size={12}
                                title="Low Stock Warning"
                              />
                            )}
                            <span className={`stock-quantity-text ${isLow ? "stock-low" : "stock-ok"}`}>
                              {formatNumber(prod.stockQuantity)}
                            </span>
                          </div>
                          <span className="stock-min-label">
                            Min: {formatNumber(prod.minimumStock)}
                          </span>
                        </div>
                      </td>
                      <td className="col-left col-status">
                        <StatusBadge status={prod.status} />
                      </td>
                      <td className="col-actions">
                        <TableActions
                          onView={() => handleOpenDetails(prod)}
                          onEdit={canManageProducts ? () => handleOpenEdit(prod) : undefined}
                          status={prod.status}
                          onActivate={canManageProducts ? () => handleToggleStatus(prod) : undefined}
                          onDeactivate={canManageProducts ? () => handleToggleStatus(prod) : undefined}
                          onDelete={canManageProducts ? () => handleOpenDelete(prod) : undefined}
                          viewTitle="View Product Details"
                          editTitle="Edit Product"
                          activateTitle="Activate"
                          deactivateTitle="Deactivate"
                          deleteTitle="Delete Product"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {products.map((prod) => {
                const isLow = Number(prod.stockQuantity ?? 0) <= Number(prod.minimumStock ?? 0);
                return (
                  <div key={prod._id} className="mobile-card-item">
                    <div className="mobile-card-header">
                      <div>
                        <ShortId prefix="PRD" id={prod._id} />
                        <strong className="mobile-card-title" style={{ display: "block", marginTop: "2px" }}>
                          {prod.productName}
                        </strong>
                        <span className="product-sku-badge" style={{ marginTop: "4px" }}>
                          SKU: {prod.sku}
                        </span>
                      </div>
                      <StatusBadge status={prod.status} />
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Category</span>
                        <span className="mobile-card-value">{getCategoryName(prod.category)}</span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Selling Price</span>
                        <strong className="mobile-card-value" style={{ color: "#0f172a" }}>
                          {formatCurrency(prod.sellingPrice)}
                        </strong>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Cost Price</span>
                        <span className="mobile-card-value" style={{ color: "#64748b" }}>
                          {formatCurrency(prod.purchasePrice)}
                        </span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Tax Rate</span>
                        <span className="mobile-card-value">{prod.taxRate || 0}%</span>
                      </div>
                      <div className="mobile-card-field" style={{ gridColumn: "span 2" }}>
                        <span className="mobile-card-label">Stock Status</span>
                        <div style={{ marginTop: "4px" }}>
                          {isLow ? (
                            <span className="stock-badge stock-badge-low">
                              <FiAlertTriangle className="stock-alert-icon" size={11} />
                              <span>Low Stock: {formatNumber(prod.stockQuantity)} units (Min: {formatNumber(prod.minimumStock)})</span>
                            </span>
                          ) : (
                            <span className="stock-badge stock-badge-ok">
                              <span>In Stock: {formatNumber(prod.stockQuantity)} units (Min: {formatNumber(prod.minimumStock)})</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-footer">
                      <TableActions
                        isMobileCard
                        onView={() => handleOpenDetails(prod)}
                        onEdit={canManageProducts ? () => handleOpenEdit(prod) : undefined}
                        status={prod.status}
                        onActivate={canManageProducts ? () => handleToggleStatus(prod) : undefined}
                        onDeactivate={canManageProducts ? () => handleToggleStatus(prod) : undefined}
                        onDelete={canManageProducts ? () => handleOpenDelete(prod) : undefined}
                        viewTitle="View Product Details"
                        editTitle="Edit Product"
                        activateTitle="Activate"
                        deactivateTitle="Deactivate"
                        deleteTitle="Delete Product"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Product" : "Add New Product"}
        maxWidth="680px"
      >
        <form onSubmit={handleSaveProduct}>
          <div className="modal-two-col-grid">
            <div className="form-group">
              <label className="form-label required">Product Name</label>
              <input
                type="text"
                name="productName"
                className={`form-control ${formErrors.productName ? "is-invalid" : ""}`}
                placeholder="e.g. Wireless Mouse"
                value={formData.productName}
                onChange={handleFormChange}
                autoFocus
              />
              {formErrors.productName && <div className="form-error">{formErrors.productName}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">SKU Code</label>
              <input
                type="text"
                name="sku"
                className={`form-control ${formErrors.sku ? "is-invalid" : ""}`}
                placeholder="e.g. ELEC-001"
                maxLength={20}
                value={formData.sku}
                onChange={handleFormChange}
              />
              {formErrors.sku && <div className="form-error">{formErrors.sku}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">Category</label>
              <Select
                name="category"
                options={formCategoryOptions}
                value={formData.category}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, category: val }));
                  if (formErrors.category) {
                    setFormErrors((prev) => ({ ...prev, category: null }));
                  }
                }}
                placeholder="Select category"
              />
              {formErrors.category && <div className="form-error">{formErrors.category}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">Purchase Cost (₹)</label>
              <input
                type="number"
                name="purchasePrice"
                min="0"
                step="0.01"
                className={`form-control ${formErrors.purchasePrice ? "is-invalid" : ""}`}
                placeholder="0.00"
                value={formData.purchasePrice}
                onChange={handleFormChange}
              />
              {formErrors.purchasePrice && <div className="form-error">{formErrors.purchasePrice}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">Selling Price (₹)</label>
              <input
                type="number"
                name="sellingPrice"
                min="0"
                step="0.01"
                className={`form-control ${formErrors.sellingPrice ? "is-invalid" : ""}`}
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={handleFormChange}
              />
              {formErrors.sellingPrice && <div className="form-error">{formErrors.sellingPrice}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Tax Rate (%)</label>
              <Select
                name="taxRate"
                options={[
                  { value: 0, label: "0% (Exempt)" },
                  { value: 5, label: "5% GST" },
                  { value: 12, label: "12% GST" },
                  { value: 18, label: "18% GST" },
                  { value: 28, label: "28% GST" }
                ]}
                value={formData.taxRate}
                onChange={(val) => setFormData((prev) => ({ ...prev, taxRate: Number(val) }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Initial Stock</label>
              <input
                type="number"
                name="stockQuantity"
                min="0"
                step="1"
                className={`form-control ${formErrors.stockQuantity ? "is-invalid" : ""}`}
                placeholder="0"
                value={formData.stockQuantity}
                onChange={handleFormChange}
              />
              {formErrors.stockQuantity && <div className="form-error">{formErrors.stockQuantity}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">Min Stock Alert</label>
              <input
                type="number"
                name="minimumStock"
                min="0"
                step="1"
                className={`form-control ${formErrors.minimumStock ? "is-invalid" : ""}`}
                placeholder="5"
                value={formData.minimumStock}
                onChange={handleFormChange}
              />
              {formErrors.minimumStock && <div className="form-error">{formErrors.minimumStock}</div>}
            </div>

            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Status</label>
              <Select
                name="status"
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" }
                ]}
                value={formData.status}
                onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
              />
            </div>
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
              {isSaving ? <span className="spinner"></span> : editingId ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Details View Modal */}
      {isDetailsOpen && detailsProduct && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Product Details — ${detailsProduct.productName}`}
          maxWidth="640px"
        >
          <div className="product-details-content">
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
                  Product Code & SKU
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                  <ShortId prefix="PRD" id={detailsProduct._id} />
                  <span className="product-sku-badge" style={{ fontSize: "0.8rem", padding: "2px 8px" }}>
                    SKU: {detailsProduct.sku}
                  </span>
                </div>
              </div>
              <StatusBadge status={detailsProduct.status} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
                marginBottom: "1.25rem"
              }}
            >
              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Product Name</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {detailsProduct.productName}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Category</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  <span className="product-category-chip">{getCategoryName(detailsProduct.category)}</span>
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Cost / Purchase Price</span>
                <div style={{ fontWeight: 700, color: "#475569", fontSize: "1.05rem", marginTop: "2px" }}>
                  {formatCurrency(detailsProduct.purchasePrice)}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Selling Price</span>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "1.05rem", marginTop: "2px" }}>
                  {formatCurrency(detailsProduct.sellingPrice)}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tax Rate (GST)</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {detailsProduct.taxRate || 0}% GST
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Estimated Gross Margin</span>
                <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {formatCurrency(Math.max(0, Number(detailsProduct.sellingPrice || 0) - Number(detailsProduct.purchasePrice || 0)))}
                  {Number(detailsProduct.sellingPrice) > 0 && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b", marginLeft: "6px" }}>
                      ({Math.round(((Number(detailsProduct.sellingPrice) - Number(detailsProduct.purchasePrice)) / Number(detailsProduct.sellingPrice)) * 100)}%)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Current Stock</span>
                <div style={{ fontWeight: 700, color: Number(detailsProduct.stockQuantity ?? 0) <= Number(detailsProduct.minimumStock ?? 0) ? "#dc2626" : "#16a34a", fontSize: "1.05rem", marginTop: "2px" }}>
                  {formatNumber(detailsProduct.stockQuantity)} units
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Minimum Stock Threshold</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {formatNumber(detailsProduct.minimumStock)} units
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
              {canManageProducts && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleOpenEdit(detailsProduct);
                  }}
                >
                  Edit Product
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
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.productName}"? This action cannot be undone.`}
        confirmText="Delete Product"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default Products;