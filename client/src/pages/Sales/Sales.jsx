import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiFileText,
  FiShoppingBag,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiRefreshCw
} from "react-icons/fi";
import { getSales } from "../../services/sales";
import { getInvoices } from "../../services/invoice";
import { getCustomers } from "../../services/customer";
import Modal from "../../components/Common/Modal";
import Toast from "../../components/Common/Toast";
import Select from "../../components/Common/Select";
import StatusBadge from "../../components/Common/StatusBadge";
import SearchBar from "../../components/Common/SearchBar";
import PageHeader from "../../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../../components/Common/KpiCard";
import TableActions from "../../components/Common/TableActions";
import QuantityCell from "../../components/Common/QuantityCell";
import { SkeletonCards, SkeletonTable } from "../../components/Common/Skeleton";
import EmptyState from "../../components/Common/EmptyState";
import { formatCurrency, formatKpiCurrency, formatNumber, formatDate, formatOptional } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";
import { canManage } from "../../config/permissions";
import "../Catalog.css";
import "./Sales.css";

const STATUS_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "Paid", label: "Paid" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Pending", label: "Pending" }
];

function Sales() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManageSales = canManage(currentUser?.role, "sales");

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedSale, setSelectedSale] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const getTotalItems = (items) => {
    if (Array.isArray(items)) {
      return items.reduce((total, item) => {
        const quantity = Number(
          item.quantity ?? item.qty ?? item.returnQuantity ?? 0
        );
        return total + (Number.isFinite(quantity) ? quantity : 0);
      }, 0);
    }
    return Number(items || 0);
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const [salesRes, invoicesRes, customerRes] = await Promise.all([
        getSales().catch(() => []),
        getInvoices().catch(() => []),
        getCustomers().catch(() => [])
      ]);

      const salesData = Array.isArray(salesRes) ? salesRes : salesRes?.data || [];
      const invoicesData = Array.isArray(invoicesRes) ? invoicesRes : invoicesRes?.data || [];
      const customerList = Array.isArray(customerRes) ? customerRes : customerRes?.data || [];

      const customerMap = Object.fromEntries(
        customerList.map((c) => [String(c._id || c.id), c])
      );

      // Map invoices by sale ID reference
      const invoiceBySaleIdMap = {};
      invoicesData.forEach((inv) => {
        const saleRef = String(inv.sale?._id || inv.sale || "");
        if (saleRef) {
          invoiceBySaleIdMap[saleRef] = inv;
        }
      });

      const formattedSales = salesData.map((sale) => {
        const customerId = String(sale.customer?._id || sale.customer || "");
        const customer = customerMap[customerId];
        const customerName = customer?.name || (typeof sale.customer === "object" && sale.customer?.name ? sale.customer.name : customerId || "Walk-in Customer");
        const customerPhone = customer?.phone || (typeof sale.customer === "object" && sale.customer?.phone ? sale.customer.phone : "");

        const subtotal = Number(sale.subtotal || 0);
        const discountValue = Number(sale.discount?.value || 0);
        const discountAmount =
          sale.discount?.type === "percentage"
            ? (subtotal * discountValue) / 100
            : discountValue;

        // Derive payment status & revenue strictly from the invoice & payments
        const linkedInv = invoiceBySaleIdMap[String(sale._id)] || invoiceBySaleIdMap[String(sale.id)];
        let derivedStatus = sale.paymentStatus || "Pending";
        let effectiveAmount = Number(sale.grandTotal ?? sale.amount ?? 0);

        if (linkedInv) {
          const invPaid = Number(linkedInv.paidAmount ?? 0);
          const invTotal = Number(linkedInv.grandTotal ?? linkedInv.amount ?? 0);
          if (linkedInv.paymentStatus === "Paid" || (invTotal > 0 && invPaid >= invTotal)) {
            derivedStatus = "Paid";
          } else if (linkedInv.paymentStatus === "Partial" || invPaid > 0) {
            derivedStatus = "Partially Paid";
          } else {
            derivedStatus = "Pending";
          }
          if (invTotal > 0) {
            effectiveAmount = invTotal;
          }
        } else {
          // Check matching demo invoice by customer and timestamp proximity
          const matchingInv = invoicesData.find((inv) => {
            const invCust = String(inv.customerDetails?.name || inv.customer || "");
            if (invCust && customerName && invCust === customerName) {
              const diff = Math.abs(new Date(inv.createdAt).getTime() - new Date(sale.createdAt).getTime());
              return diff < 10000;
            }
            return false;
          });
          if (matchingInv) {
            const invPaid = Number(matchingInv.paidAmount ?? 0);
            const invTotal = Number(matchingInv.grandTotal ?? matchingInv.amount ?? 0);
            if (matchingInv.paymentStatus === "Paid" || (invTotal > 0 && invPaid >= invTotal)) {
              derivedStatus = "Paid";
            } else if (matchingInv.paymentStatus === "Partial" || invPaid > 0) {
              derivedStatus = "Partially Paid";
            } else {
              derivedStatus = "Pending";
            }
            if (invTotal > 0) {
              effectiveAmount = invTotal;
            }
          }
        }

        return {
          ...sale,
          id: sale._id ? `SALE-${String(sale._id).slice(-6).toUpperCase()}` : sale.id,
          rawId: sale._id,
          customer: customerName,
          phone: customerPhone,
          date: sale.createdAt ? formatDate(sale.createdAt) : "—",
          totalItemsCount: getTotalItems(sale.items),
          amount: effectiveAmount,
          tax: Number(sale.tax || 0),
          discount: discountAmount,
          paymentStatus: derivedStatus
        };
      });

      setSales(formattedSales);
    } catch (error) {
      setToast({ message: error.message || "Failed to load sales", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        String(sale.id || "").toLowerCase().includes(searchText) ||
        String(sale.customer || "").toLowerCase().includes(searchText) ||
        String(sale.phone || "").includes(searchText);

      const matchesStatus =
        status === "All" ||
        sale.paymentStatus === status ||
        (status === "Pending" && (sale.paymentStatus === "Pending" || sale.paymentStatus === "Partially Paid"));

      return matchesSearch && matchesStatus;
    });
  }, [sales, search, status]);

  const totalAmount = sales.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0
  );

  const paidSales = sales.filter((s) => s.paymentStatus === "Paid").length;
  const pendingSales = sales.filter((s) => s.paymentStatus !== "Paid").length;

  const getSubtotal = (sale) => {
    return (
      Number(sale.amount || 0) -
      Number(sale.tax || 0) +
      Number(sale.discount || 0)
    );
  };

  return (
    <div className="catalog-page sales-page-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Sales"
        description="Track customer sales orders, items sold, and payment status."
        actionButton={
          canManageSales ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/sales/new")}
              id="btn-new-sale"
            >
              <FiPlus />
              <span>New Sale</span>
            </button>
          ) : null
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Total Sales"
          value={formatNumber(sales.length)}
          icon={FiShoppingBag}
          variant="primary"
        />
        <KpiCard
          label="Total Revenue"
          value={formatKpiCurrency(totalAmount)}
          icon={FiTrendingUp}
          variant="success"
        />
        <KpiCard
          label="Paid Orders"
          value={formatNumber(paidSales)}
          icon={FiCheckCircle}
          variant="blue"
        />
        <KpiCard
          label="Pending / Partial"
          value={formatNumber(pendingSales)}
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
            placeholder="Search sales by ID, customer name or phone..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-sales-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              placeholder="Status"
              ariaLabel="Filter sales by status"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchSalesData}
            title="Refresh sales list"
            aria-label="Refresh sales list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-container sales-table-card">
        {loading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={FiShoppingBag}
            title="No Sales Recorded"
            description={
              canManageSales
                ? "Create your first retail sales transaction using fast checkout."
                : "No sales records found."
            }
            actionText={canManageSales ? "New Sale" : undefined}
            onAction={canManageSales ? () => navigate("/sales/new") : undefined}
          />
        ) : filteredSales.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Sales"
            description="No sales matched your search and filter criteria."
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
                <col style={{ width: "11%" }} className="col-hide-md" />
                <col style={{ width: "19%" }} />
                <col style={{ width: "13%" }} className="col-hide-md" />
                <col style={{ width: "8%" }} className="col-hide-md" />
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "9%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-sale-id" style={{ width: "13%" }}>Sale ID</th>
                  <th className="col-left col-date col-hide-md" style={{ width: "11%" }}>Date</th>
                  <th className="col-left col-customer" style={{ width: "19%" }}>Customer</th>
                  <th className="col-left col-phone col-hide-md" style={{ width: "13%" }}>Phone</th>
                  <th className="col-right col-items col-hide-md" style={{ width: "8%" }}>Items</th>
                  <th className="col-right col-amount" style={{ width: "15%" }}>Amount</th>
                  <th className="col-left col-status" style={{ width: "12%" }}>Status</th>
                  <th className="col-actions" style={{ width: "9%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="col-left col-code col-sale-id">
                      <span
                        className="table-id-badge"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedSale(sale)}
                        title="View sale breakdown"
                      >
                        {sale.id}
                      </span>
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{sale.date}</span>
                    </td>
                    <td className="col-left col-customer">
                      <strong className="item-name-cell" title={sale.customer}>{sale.customer}</strong>
                    </td>
                    <td className="col-left col-phone col-hide-md">
                      <span className="table-phone">{formatOptional(sale.phone)}</span>
                    </td>
                    <td className="col-right col-number col-items col-hide-md">
                      <QuantityCell quantity={sale.totalItemsCount} />
                    </td>
                    <td className="col-right col-money col-amount">
                      <span className="table-amount">{formatCurrency(sale.amount)}</span>
                    </td>
                    <td className="col-left col-status">
                      <StatusBadge status={sale.paymentStatus} />
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onView={() => setSelectedSale(sale)}
                        viewTitle="View"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <span className="table-id-badge" style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {sale.id}
                      </span>
                      <strong className="mobile-card-title" style={{ display: "block", marginTop: "4px" }}>
                        {sale.customer}
                      </strong>
                    </div>
                    <StatusBadge status={sale.paymentStatus} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Date</span>
                      <span className="mobile-card-value">{sale.date}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Items Count</span>
                      <span className="mobile-card-value">{sale.totalItemsCount} units</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Payment Method</span>
                      <span className="mobile-card-value">{sale.paymentMethod || "Cash"}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Total Amount</span>
                      <span className="mobile-card-value" style={{ fontWeight: 800, color: "var(--brand-primary, #4f46e5)", fontSize: "0.9375rem" }}>
                        {formatCurrency(sale.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard={true}
                      onView={() => setSelectedSale(sale)}
                      viewTitle="View Sale Details"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Sale Details - ${selectedSale.id}`}
        >
          <div className="sale-details-modal">
            <div className="sale-details-grid">
              <div className="sale-detail-item">
                <span className="sale-detail-label">Customer Name</span>
                <span className="sale-detail-value">{selectedSale.customer}</span>
              </div>
              <div className="sale-detail-item">
                <span className="sale-detail-label">Contact Phone</span>
                <span className="sale-detail-value">{selectedSale.phone || "—"}</span>
              </div>
              <div className="sale-detail-item">
                <span className="sale-detail-label">Transaction Date</span>
                <span className="sale-detail-value">{selectedSale.date}</span>
              </div>
              <div className="sale-detail-item">
                <span className="sale-detail-label">Payment Status</span>
                <div>
                  <StatusBadge status={selectedSale.paymentStatus} />
                </div>
              </div>
            </div>

            <div className="sale-items-box">
              <div className="sale-items-header">
                <span>Purchased Items ({selectedSale.items?.length || 0})</span>
                <span>Total</span>
              </div>
              {selectedSale.items?.map((item, idx) => (
                <div key={idx} className="sale-item-row">
                  <div className="sale-item-info">
                    <strong className="sale-item-name">
                      {item.product?.productName || item.product?.name || `Item #${idx + 1}`}
                    </strong>
                    <span className="sale-item-meta">
                      {item.quantity} × {formatCurrency(item.price)}
                    </span>
                  </div>
                  <strong className="sale-item-total">
                    {formatCurrency(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="sale-summary-card">
              <div className="sale-summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(getSubtotal(selectedSale))}</strong>
              </div>
              <div className="sale-summary-row">
                <span>Discount</span>
                <strong style={{ color: "var(--color-danger, #ef4444)" }}>
                  -{formatCurrency(selectedSale.discount)}
                </strong>
              </div>
              <div className="sale-summary-row">
                <span>GST Tax</span>
                <strong>+{formatCurrency(selectedSale.tax)}</strong>
              </div>
              <div className="sale-summary-row grand-total">
                <span>Grand Total</span>
                <span>{formatCurrency(selectedSale.amount)}</span>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", minHeight: "42px", justifyContent: "center" }}
                onClick={() => setSelectedSale(null)}
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

export default Sales;