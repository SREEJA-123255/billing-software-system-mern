import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FiArchive,
  FiPackage,
  FiAlertTriangle,
  FiCheckCircle,
  FiSearch,
  FiRefreshCw,
  FiSliders,
  FiAlertCircle,
  FiLayers
} from "react-icons/fi";
import inventoryService from "../services/inventoryService";
import categoryService from "../services/categoryService";
import Modal from "../components/Common/Modal";
import Toast from "../components/Common/Toast";
import StatusBadge from "../components/Common/StatusBadge";
import Select from "../components/Common/Select";
import SearchBar from "../components/Common/SearchBar";
import PageHeader from "../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../components/Common/KpiCard";
import TableActions from "../components/Common/TableActions";
import QuantityCell from "../components/Common/QuantityCell";
import { SkeletonTable } from "../components/Common/Skeleton";
import EmptyState from "../components/Common/EmptyState";
import { formatCurrency, formatNumber, formatOptional } from "../utils/formatters";
import "./Catalog.css";
import "./Inventory.css";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    inStockCount: 0,
    activeCategories: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Adjust Stock Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [operation, setOperation] = useState("add");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Toast
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
      console.error("Categories fetch error:", err);
    }
  };

  // Fetch Inventory Summary
  const fetchSummary = async () => {
    try {
      const data = await inventoryService.getSummary();
      setSummary({
        totalProducts: data.totalProducts || 0,
        totalStock: data.totalStock || 0,
        lowStockCount: data.lowStockCount || 0,
        inStockCount: data.inStockCount || 0,
        activeCategories: data.activeCategories || 0
      });
    } catch (err) {
      console.error("Summary error:", err);
    }
  };

  // Fetch Inventory Items
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (lowStockOnly) params.lowStock = "true";

      const data = await inventoryService.getInventoryItems(params);
      let list = Array.isArray(data) ? data : [];

      if (lowStockOnly) {
        list = list.filter(
          (p) => Number(p.stockQuantity ?? 0) <= Number(p.minimumStock ?? 0)
        );
      }

      setInventory(list);
    } catch (err) {
      console.error("Inventory fetch error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load inventory. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, lowStockOnly]);

  useEffect(() => {
    fetchSummary();
    fetchCategoriesList();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchInventory();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchInventory]);

  const filterCategoryOptions = useMemo(() => {
    const sorted = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return [
      { value: "ALL", label: "All Categories" },
      ...sorted.map((c) => ({ value: c._id, label: c.name }))
    ];
  }, [categories]);

  const getCategoryName = (cat) => {
    if (!cat) return "Uncategorized";
    if (typeof cat === "object" && cat.name) return cat.name;
    const found = categories.find((c) => c._id === cat);
    return found ? found.name : "Uncategorized";
  };

  const openAdjustModal = (item) => {
    setSelectedProduct(item);
    setOperation("add");
    setAdjustQuantity("");
    setShowAdjustModal(true);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustQuantity, 10);
    if (!qty || qty <= 0) {
      showToast("Quantity must be a positive integer greater than 0", "error");
      return;
    }

    if (operation === "subtract" && qty > selectedProduct.stockQuantity) {
      showToast(
        `Cannot reduce by ${qty} units. Maximum available to subtract is ${selectedProduct.stockQuantity}.`,
        "error"
      );
      return;
    }

    setAdjusting(true);
    try {
      await inventoryService.adjustStock(selectedProduct._id, {
        operation,
        quantity: qty
      });

      showToast(`Stock updated for ${selectedProduct.productName}`, "success");
      setShowAdjustModal(false);
      fetchInventory();
      fetchSummary();
    } catch (err) {
      console.error("Adjust error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to adjust stock", "error");
    } finally {
      setAdjusting(false);
    }
  };

  const previewNewStock = useMemo(() => {
    if (!selectedProduct) return 0;
    const qty = parseInt(adjustQuantity, 10) || 0;
    if (operation === "add") {
      return selectedProduct.stockQuantity + qty;
    }
    return Math.max(0, selectedProduct.stockQuantity - qty);
  }, [selectedProduct, operation, adjustQuantity]);

  return (
    <div className="catalog-page inventory-page">
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
        title="Inventory"
        description="Track warehouse stock, threshold alert levels, and inventory adjustments."
        actionButton={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              fetchInventory();
              fetchSummary();
            }}
          >
            <FiRefreshCw />
            <span>Sync Stock</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Total Products"
          value={formatNumber(summary.totalProducts)}
          icon={FiPackage}
          variant="primary"
        />
        <KpiCard
          label="Total Stock Units"
          value={formatNumber(summary.totalStock)}
          icon={FiArchive}
          variant="success"
        />
        <KpiCard
          label="Low Stock Alerts"
          value={formatNumber(summary.lowStockCount)}
          icon={FiAlertTriangle}
          variant={summary.lowStockCount > 0 ? "warning" : "blue"}
        />
        <KpiCard
          label="Active Categories"
          value={formatNumber(summary.activeCategories)}
          icon={FiLayers}
          variant="blue"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search inventory by product name or SKU..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-category">
            <Select
              id="filter-inventory-category"
              options={filterCategoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Category"
              ariaLabel="Filter inventory by category"
              searchable={categories.length > 8}
            />
          </div>

          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-inventory-status"
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
              ariaLabel="Filter inventory by status"
            />
          </div>

          <label
            className={`filter-control-item filter-checkbox-lowstock ${lowStockOnly ? "lowstock-active" : ""}`}
          >
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              aria-label="Filter low stock items only"
            />
            <span>Low Stock Only</span>
          </label>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={() => {
              fetchInventory();
              fetchSummary();
            }}
            title="Refresh inventory"
            aria-label="Refresh inventory list"
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
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchInventory}>
            Retry
          </button>
        </div>
      )}

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : inventory.length === 0 ? (
          <EmptyState
            icon={FiArchive}
            title="No Inventory Items Found"
            description="No inventory items match your current filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearch("");
              setCategoryFilter("ALL");
              setStatusFilter("ALL");
              setLowStockOnly(false);
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col className="col-flex" />
                <col style={{ width: "160px" }} className="col-hide-md" />
                <col style={{ width: "140px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "150px" }} className="col-hide-md" />
                <col style={{ width: "120px" }} className="col-hide-md" />
                <col style={{ width: "95px" }} />
                <col style={{ width: "148px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left">Product & SKU</th>
                  <th className="col-left col-hide-md" style={{ width: "160px" }}>Category</th>
                  <th className="col-right" style={{ width: "140px" }}>Selling Price</th>
                  <th className="col-center" style={{ width: "180px" }}>Available Stock (Units)</th>
                  <th className="col-center col-hide-md" style={{ width: "150px" }}>Min Level (Units)</th>
                  <th className="col-left col-hide-md" style={{ width: "120px" }}>Stock Health</th>
                  <th className="col-left" style={{ width: "95px" }}>Status</th>
                  <th className="col-actions" style={{ width: "148px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item._id}>
                    <td className="col-left">
                      <div className="item-name-cell" title={item.productName}>{item.productName}</div>
                      <div className="table-muted-mono">
                        SKU: {item.sku}
                      </div>
                    </td>
                    <td className="col-left col-hide-md">
                      <span className="inventory-category-chip" title={getCategoryName(item.category)}>
                        {getCategoryName(item.category)}
                      </span>
                    </td>
                    <td className="col-right col-money">
                      <span className="table-amount">{formatCurrency(item.sellingPrice)}</span>
                    </td>
                    <td className="col-center">
                      <QuantityCell quantity={item.stockQuantity} isLowStock={item.lowStock} />
                    </td>
                    <td className="col-center col-hide-md">
                      <QuantityCell quantity={item.minimumStock} />
                    </td>
                    <td className="col-left col-status col-hide-md">
                      <StatusBadge status={item.stockQuantity <= 0 ? "Out of Stock" : item.lowStock ? "Low Stock" : "In Stock"} />
                    </td>
                    <td className="col-left col-status">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onAdjust={() => openAdjustModal(item)}
                        adjustTitle="Adjust Stock"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {inventory.map((item) => (
                <div key={item._id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <strong className="mobile-card-title">{item.productName}</strong>
                      <div className="table-muted-mono">SKU: {item.sku}</div>
                    </div>
                    <StatusBadge status={item.lowStock ? "Low Stock" : "In Stock"} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Category</span>
                      <span className="mobile-card-value">{getCategoryName(item.category)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Selling Price</span>
                      <strong className="mobile-card-value">{formatCurrency(item.sellingPrice)}</strong>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Available Stock</span>
                      <span className="mobile-card-value" style={{ fontWeight: 700, color: item.lowStock ? "var(--color-danger, #ef4444)" : "inherit" }}>
                        {formatNumber(item.stockQuantity)} units
                      </span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Min Alert Level</span>
                      <span className="mobile-card-value">{formatNumber(item.minimumStock)} units</span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onAdjust={() => openAdjustModal(item)}
                      adjustTitle="Adjust Stock"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <Modal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          title={`Adjust Stock — ${selectedProduct.productName}`}
          maxWidth="500px"
        >
          <form onSubmit={handleAdjustStock}>
            <div
              style={{
                background: "#f8fafc",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color, #e2e8f0)",
                marginBottom: "1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem"
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Current Stock</span>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>
                  {formatNumber(selectedProduct.stockQuantity)} units
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Projected Stock</span>
                <div
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: previewNewStock <= selectedProduct.minimumStock ? "#dc2626" : "#16a34a"
                  }}
                >
                  {formatNumber(previewNewStock)} units
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Action</label>
              <Select
                options={[
                  { value: "add", label: "Add Stock (Restock / Return)" },
                  { value: "subtract", label: "Deduct Stock (Damage / Correction)" }
                ]}
                value={operation}
                onChange={setOperation}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-control"
                placeholder="Enter units quantity"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAdjustModal(false)}
                disabled={adjusting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={adjusting}
              >
                {adjusting ? <span className="spinner"></span> : operation === "add" ? "Confirm Addition" : "Confirm Deduction"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Inventory;