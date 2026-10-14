import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiRotateCcw,
  FiCheckCircle,
  FiPackage,
  FiRefreshCw
} from "react-icons/fi";
import { getReturns } from "../../services/return";
import { getSales } from "../../services/sales";
import { getInvoices } from "../../services/invoice";
import { getCustomers } from "../../services/customer";
import Modal from "../../components/Common/Modal";
import Toast from "../../components/Common/Toast";
import Select from "../../components/Common/Select";
import SearchBar from "../../components/Common/SearchBar";
import PageHeader from "../../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../../components/Common/KpiCard";
import TableActions from "../../components/Common/TableActions";
import StatusBadge from "../../components/Common/StatusBadge";
import QuantityCell from "../../components/Common/QuantityCell";
import { SkeletonTable } from "../../components/Common/Skeleton";
import EmptyState from "../../components/Common/EmptyState";
import { formatNumber, formatDate, formatOptional } from "../../utils/formatters";
import "../Catalog.css";
import "./Return.css";

const STATUS_OPTIONS = [
  { value: "All Status", label: "All Statuses" },
  { value: "Completed", label: "Completed" },
  { value: "Rejected", label: "Rejected" }
];

const formatInvoiceDisplayNumber = (rawNum) => {
  if (!rawNum) return "—";
  const str = String(rawNum).trim();
  if (/^INV-\d{1,6}$/i.test(str)) {
    return str;
  }
  if (/^INV-[A-Z0-9]{3,8}$/i.test(str)) {
    return str;
  }
  if (str.length > 10) {
    const clean = str.replace(/[^a-zA-Z0-9]/g, "");
    const tail = clean.slice(-5).toUpperCase();
    return `INV-${tail}`;
  }
  return str;
};

function Returns() {
  const navigate = useNavigate();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const fetchReturnsData = async () => {
    setLoading(true);
    try {
      const data = await getReturns();
      const returnData = Array.isArray(data) ? data : data?.data || [];

      const toList = (res) => (Array.isArray(res) ? res : res?.data || []);

      const [salesList, invoicesList, customersList] = await Promise.all([
        getSales().then(toList).catch(() => []),
        getInvoices().then(toList).catch(() => []),
        getCustomers().then(toList).catch(() => []),
      ]);

      const saleMap = Object.fromEntries(
        salesList.map((sale) => [String(sale._id || sale.id), sale])
      );
      const invoiceMap = Object.fromEntries(
        invoicesList.map((inv) => [String(inv.sale?._id || inv.sale || ""), inv])
      );
      const customerMap = Object.fromEntries(
        customersList.map((cust) => [String(cust._id || cust.id), cust])
      );

      const mappedReturns = returnData.map((item) => {
        const saleId = String(item.sale?._id || item.sale || "");
        const productId = String(item.product?._id || item.product || "");
        const sale = saleMap[saleId];
        const invoice = invoiceMap[saleId];

        const customerId = sale ? String(sale.customer?._id || sale.customer || "") : "";
        const customer = customerMap[customerId];

        const soldItem = sale?.items?.find(
          (si) => String(si.product?._id || si.product) === productId
        );

        const productName =
          item.product?.productName ||
          item.product?.name ||
          soldItem?.product?.productName ||
          soldItem?.productName ||
          "Product Item";

        return {
          ...item,
          id: item._id
            ? `RET-${String(item._id).slice(-6).toUpperCase()}`
            : item.id,
          rawId: item._id,
          saleIdFormatted: saleId ? `SALE-${saleId.slice(-6).toUpperCase()}` : "—",
          rawSaleId: saleId,
          invoiceNumber: invoice?.invoiceNumber || "—",
          displayInvoiceNumber: formatInvoiceDisplayNumber(invoice?.invoiceNumber),
          customerName: customer?.name || (typeof sale?.customer === "object" && sale?.customer?.name) || "Walk-in Customer",
          productName,
          quantityReturned: Number(item.quantityReturned || 0),
          reason: item.reason || "Customer Return",
          status: item.status || "Completed",
          date: item.createdAt ? formatDate(item.createdAt) : "—",
        };
      });

      setReturns(mappedReturns);
    } catch (error) {
      setToast({ message: error.message || "Failed to load returns", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnsData();
  }, []);

  const filteredReturns = useMemo(() => {
    return returns.filter((item) => {
      const searchText = search.toLowerCase().trim();
      const matchesSearch =
        String(item.id || "").toLowerCase().includes(searchText) ||
        String(item.saleIdFormatted || "").toLowerCase().includes(searchText) ||
        String(item.invoiceNumber || "").toLowerCase().includes(searchText) ||
        String(item.customerName || "").toLowerCase().includes(searchText) ||
        String(item.productName || "").toLowerCase().includes(searchText);

      const matchesStatus = status === "All Status" || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [returns, search, status]);

  const totalCompleted = returns.filter((r) => r.status === "Completed").length;
  const totalUnits = returns.reduce((sum, r) => sum + Number(r.quantityReturned || 0), 0);

  return (
    <div className="catalog-page returns-page-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Returns"
        description="Process customer product returns, refunds, and warehouse stock restocking."
        actionButton={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/returns/new")}
            id="btn-new-return"
          >
            <FiPlus />
            <span>Process Return</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Returns"
          value={formatNumber(returns.length)}
          icon={FiRotateCcw}
          variant="primary"
        />
        <KpiCard
          label="Completed & Restocked"
          value={formatNumber(totalCompleted)}
          icon={FiCheckCircle}
          variant="success"
        />
        <KpiCard
          label="Units Restocked"
          value={formatNumber(totalUnits)}
          icon={FiPackage}
          variant="blue"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search returns by return ID, sale ID, invoice, or customer..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              placeholder="Status"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchReturnsData}
            title="Refresh returns"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-container returns-table-card">
        {loading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={FiRotateCcw}
            title="No Returns Recorded"
            description="Process product returns to restock warehouse inventory."
            actionText="Process Return"
            onAction={() => navigate("/returns/new")}
          />
        ) : filteredReturns.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Returns"
            description="No returns match your active search filters."
            actionText="Clear Filters"
            onAction={() => {
              setSearch("");
              setStatus("All Status");
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} className="col-hide-md" />
                <col style={{ width: "11%" }} className="col-hide-md" />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "11%" }} className="col-hide-md" />
                <col style={{ width: "11%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-ret-id" style={{ width: "11%" }}>Return ID</th>
                  <th className="col-left col-sale-id col-hide-md" style={{ width: "11%" }}>Sale ID</th>
                  <th className="col-left col-invoice-num col-hide-md" style={{ width: "11%" }}>Invoice #</th>
                  <th className="col-left col-customer" style={{ width: "14%" }}>Customer</th>
                  <th className="col-left col-product" style={{ width: "13%" }}>Product</th>
                  <th className="col-left col-qty" style={{ width: "6%" }}>Qty</th>
                  <th className="col-left col-date col-hide-md" style={{ width: "11%" }}>Date</th>
                  <th className="col-left col-status" style={{ width: "11%" }}>Status</th>
                  <th className="col-actions" style={{ width: "12%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((item) => (
                  <tr key={item.id}>
                    <td className="col-left col-code col-ret-id">
                      <span
                        className="table-id-badge"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedReturn(item)}
                        title="View return details"
                      >
                        {item.id}
                      </span>
                    </td>
                    <td className="col-left col-code col-sale-id col-hide-md">
                      <span className="table-code">{item.saleIdFormatted}</span>
                    </td>
                    <td className="col-left col-code col-invoice-num col-hide-md">
                      <span className="invoice-chip" title={item.invoiceNumber || "—"}>
                        {item.displayInvoiceNumber || item.invoiceNumber || "—"}
                      </span>
                    </td>
                    <td className="col-left col-customer">
                      <strong className="item-name-cell" title={item.customerName}>
                        {item.customerName}
                      </strong>
                    </td>
                    <td className="col-left col-product">
                      <strong className="item-name-cell" title={item.productName}>
                        {item.productName}
                      </strong>
                    </td>
                    <td className="col-left col-qty">
                      <QuantityCell quantity={item.quantityReturned} />
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{item.date}</span>
                    </td>
                    <td className="col-left col-status">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onView={() => setSelectedReturn(item)}
                        viewTitle="View"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {filteredReturns.map((item) => (
                <div key={item.id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <button
                        type="button"
                        className="table-id-badge"
                        onClick={() => setSelectedReturn(item)}
                      >
                        {item.id}
                      </button>
                      <strong className="mobile-card-title" style={{ display: "block", marginTop: "4px" }}>
                        {item.productName}
                      </strong>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Customer</span>
                      <span className="mobile-card-value">{item.customerName}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Returned Qty</span>
                      <span className="mobile-card-value" style={{ fontWeight: 700 }}>
                        {item.quantityReturned} units
                      </span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Sale / Invoice</span>
                      <span className="mobile-card-value">{item.saleIdFormatted} · {item.invoiceNumber}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Date</span>
                      <span className="mobile-card-value">{item.date}</span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => setSelectedReturn(item)}
                      viewTitle="View Details"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Return Details Modal */}
      {selectedReturn && (
        <Modal
          isOpen={!!selectedReturn}
          onClose={() => setSelectedReturn(null)}
          title={`Return Details - ${selectedReturn.id}`}
          maxWidth="550px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border-color, #e2e8f0)"
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Original Sale</span>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {selectedReturn.saleIdFormatted}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Invoice Number</span>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {selectedReturn.invoiceNumber || "—"}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Customer</span>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedReturn.customerName}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Return Date</span>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedReturn.date}</div>
              </div>
            </div>

            <div style={{ padding: "0.75rem 0", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Product Name</span>
                <strong style={{ color: "#0f172a" }}>{selectedReturn.productName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Units Restocked</span>
                <span className="badge badge-active">{selectedReturn.quantityReturned} units</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Reason Given</span>
                <span style={{ color: "#334155", fontStyle: "italic" }}>"{selectedReturn.reason}"</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedReturn(null)}
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

export default Returns;