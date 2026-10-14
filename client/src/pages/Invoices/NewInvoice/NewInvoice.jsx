import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiFileText,
  FiAlertCircle,
  FiShoppingBag
} from "react-icons/fi";
import { createInvoice, getInvoices } from "../../../services/invoice";
import { getSales } from "../../../services/sales";
import Toast from "../../../components/Common/Toast";
import Select from "../../../components/Common/Select";
import "../../Catalog.css";
import "./NewInvoice.css";

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function NewInvoice() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sales, setSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesResponse, invoicesResponse] = await Promise.all([
        getSales(),
        getInvoices(),
      ]);

      const salesData = Array.isArray(salesResponse)
        ? salesResponse
        : salesResponse?.data || [];
      const invoicesData = Array.isArray(invoicesResponse)
        ? invoicesResponse
        : invoicesResponse?.data || [];

      setSales(salesData);
      setInvoices(invoicesData);

      // Pre-select if forwarded from Sales page
      if (location.state?.preselectedSaleId) {
        setSelectedSaleId(String(location.state.preselectedSaleId));
      }
    } catch (error) {
      setToast({
        message: error.message || "Failed to load sales and invoices",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const invoicedSaleIds = useMemo(
    () =>
      new Set(
        invoices.map((inv) => String(inv.sale?._id || inv.sale || ""))
      ),
    [invoices]
  );

  const availableSales = useMemo(
    () =>
      sales.filter(
        (sale) => !invoicedSaleIds.has(String(sale._id || sale.id))
      ),
    [sales, invoicedSaleIds]
  );

  const selectedSale = useMemo(() => {
    return sales.find((sale) => String(sale._id || sale.id) === String(selectedSaleId));
  }, [sales, selectedSaleId]);

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!selectedSaleId) {
      setToast({ message: "Please select a sale to invoice", type: "warning" });
      return;
    }

    setGenerating(true);
    try {
      await createInvoice({ saleId: selectedSaleId });
      setToast({ message: "Invoice generated successfully!", type: "success" });
      setTimeout(() => {
        navigate("/invoices");
      }, 700);
    } catch (err) {
      setToast({ message: err.message || "Failed to generate invoice", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="catalog-page new-invoice-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* Header */}
      <div className="catalog-action-bar">
        <div className="catalog-heading">
          <h2>Generate Invoice</h2>
          <p>Create an official GST tax invoice for an unbilled sales transaction.</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/invoices")}
        >
          <FiArrowLeft />
          <span>Back to Invoices</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Select Sale Transaction</span>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading-state" style={{ padding: "2rem", textAlign: "center" }}>
              <div className="spinner spinner-primary"></div>
              <p style={{ marginTop: "0.75rem", color: "#64748b" }}>Loading sales data...</p>
            </div>
          ) : (
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label className="form-label required">Choose Uninvoiced Sale</label>
                <Select
                  options={[
                    { value: "", label: "-- Select a Sale to Generate Invoice --" },
                    ...availableSales.map((sale) => {
                      const idLabel = sale._id
                        ? `SALE-${String(sale._id).slice(-6).toUpperCase()}`
                        : sale.id;
                      const customerName =
                        typeof sale.customer === "object"
                          ? sale.customer?.name
                          : sale.customer || "Customer";
                      const amountLabel = formatCurrency(sale.grandTotal ?? sale.amount);
                      const dateLabel = sale.createdAt
                        ? new Date(sale.createdAt).toLocaleDateString("en-IN")
                        : "";

                      return {
                        value: sale._id || sale.id,
                        label: `${idLabel} · ${customerName} · ${amountLabel} (${dateLabel})`
                      };
                    })
                  ]}
                  value={selectedSaleId}
                  onChange={setSelectedSaleId}
                  placeholder="Select a Sale"
                  searchable={availableSales.length > 8}
                />
                {availableSales.length === 0 && (
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.375rem" }}>
                    All existing sales are already invoiced. Create a new sale to generate an invoice.
                  </div>
                )}
              </div>

              {/* Preview Selected Sale */}
              {selectedSale && (
                <div className="sale-preview-card" style={{ marginTop: "1.25rem" }}>
                  <div className="sale-preview-header">
                    <div>
                      <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>
                        {selectedSale._id
                          ? `SALE-${String(selectedSale._id).slice(-6).toUpperCase()}`
                          : selectedSale.id}
                      </strong>
                      <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                        Date:{" "}
                        {selectedSale.createdAt
                          ? new Date(selectedSale.createdAt).toLocaleDateString("en-IN")
                          : "Today"}
                      </div>
                    </div>
                    <span className="badge badge-active">
                      {selectedSale.paymentStatus || "Paid"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Customer</span>
                      <div>
                        <strong>
                          {typeof selectedSale.customer === "object"
                            ? selectedSale.customer?.name
                            : selectedSale.customer}
                        </strong>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Payment Method</span>
                      <div>{selectedSale.paymentMethod || "Cash"}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Grand Total</span>
                      <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a" }}>
                        {formatCurrency(selectedSale.grandTotal ?? selectedSale.amount)}
                      </div>
                    </div>
                  </div>

                  {Array.isArray(selectedSale.items) && (
                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>
                        Items ({selectedSale.items.length})
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                        {selectedSale.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                            <span>
                              {item.product?.productName || item.product?.name || item.productName || `Product #${idx + 1}`} × {item.quantity}
                            </span>
                            <strong>{formatCurrency(item.total)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="new-invoice-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate("/invoices")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedSaleId || generating}
                  id="btn-confirm-generate-invoice"
                >
                  {generating ? (
                    <>
                      <div className="spinner" style={{ width: "1rem", height: "1rem" }}></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      <span>Confirm & Generate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewInvoice;