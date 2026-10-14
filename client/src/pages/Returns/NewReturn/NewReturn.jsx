import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiRotateCcw,
  FiCheckCircle,
  FiAlertTriangle,
  FiPackage,
  FiFileText
} from "react-icons/fi";
import { getInvoices } from "../../../services/invoice";
import { getProducts } from "../../../services/product";
import { getSales } from "../../../services/sales";
import { createReturn, getReturns } from "../../../services/return";
import Toast from "../../../components/Common/Toast";
import Select from "../../../components/Common/Select";
import "../../Catalog.css";
import "./NewReturn.css";

const REASONS = [
  "Damaged Product",
  "Defective Product",
  "Wrong Product",
  "Customer Changed Mind",
  "Other",
];

const REFUND_METHODS = [
  "Original Payment",
  "UPI",
  "Cash",
  "Bank Transfer",
];

function NewReturn() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantityReturned, setQuantityReturned] = useState(1);
  const [returnReason, setReturnReason] = useState(REASONS[0]);
  const [refundMethod, setRefundMethod] = useState(REFUND_METHODS[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invoiceRes, salesRes, productRes, returnsRes] = await Promise.all([
          getInvoices(),
          getSales(),
          getProducts(),
          getReturns(),
        ]);

        const invoiceList = Array.isArray(invoiceRes) ? invoiceRes : invoiceRes?.data || [];
        const salesList = Array.isArray(salesRes) ? salesRes : salesRes?.data || [];
        const productList = Array.isArray(productRes) ? productRes : productRes?.data || [];
        const returnsList = Array.isArray(returnsRes) ? returnsRes : returnsRes?.data || [];

        setInvoices(invoiceList);
        setSales(salesList);
        setProducts(productList);
        setReturns(returnsList);
      } catch (error) {
        setToast({ message: error.message || "Failed to load returns prerequisites", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedInvoice = useMemo(() => {
    return invoices.find(
      (inv) => String(inv._id || inv.id) === String(selectedInvoiceId)
    );
  }, [invoices, selectedInvoiceId]);

  const selectedSale = useMemo(() => {
    if (!selectedInvoice) return null;
    const saleId = String(selectedInvoice.sale?._id || selectedInvoice.sale || "");
    return sales.find((s) => String(s._id || s.id) === saleId);
  }, [sales, selectedInvoice]);

  // Compute sold items from the selected sale / invoice
  const availableItems = useMemo(() => {
    if (!selectedSale || !Array.isArray(selectedSale.items)) return [];

    return selectedSale.items.map((item) => {
      const prodId = String(item.product?._id || item.product || "");
      const product = products.find((p) => String(p._id || p.id) === prodId);
      const productName =
        product?.productName ||
        product?.name ||
        item.product?.productName ||
        item.productName ||
        "Item";

      // Calculate how many of this product have already been returned for this sale
      const alreadyReturned = returns
        .filter(
          (r) =>
            String(r.sale?._id || r.sale) === String(selectedSale._id || selectedSale.id) &&
            String(r.product?._id || r.product) === prodId &&
            r.status === "Completed"
        )
        .reduce((sum, r) => sum + Number(r.quantityReturned || 0), 0);

      const remaining = Math.max(0, Number(item.quantity || 0) - alreadyReturned);

      return {
        productId: prodId,
        productName,
        soldQuantity: Number(item.quantity || 0),
        alreadyReturned,
        remaining,
        price: Number(item.price || 0),
      };
    });
  }, [selectedSale, products, returns]);

  const selectedItem = useMemo(() => {
    return availableItems.find((i) => i.productId === selectedProductId);
  }, [availableItems, selectedProductId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSale) {
      setToast({ message: "Please select an invoice or sale", type: "error" });
      return;
    }

    if (!selectedProductId) {
      setToast({ message: "Please select a product to return", type: "error" });
      return;
    }

    const qty = Number(quantityReturned);
    if (!qty || qty < 1) {
      setToast({ message: "Returned quantity must be at least 1", type: "error" });
      return;
    }

    if (selectedItem && qty > selectedItem.remaining) {
      setToast({
        message: `Cannot return ${qty} unit(s). Only ${selectedItem.remaining} available to return.`,
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        saleId: selectedSale._id || selectedSale.id,
        productId: selectedProductId,
        quantityReturned: qty,
        reason: returnReason,
        refundMethod,
        notes,
      };

      await createReturn(payload);
      setToast({
        message: "Return processed and stock replenished successfully!",
        type: "success",
      });
      setTimeout(() => {
        navigate("/returns");
      }, 700);
    } catch (err) {
      setToast({ message: err.message || "Failed to process return", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="catalog-page new-return-container">
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
          <h2>Process Product Return</h2>
          <p>Record customer returned goods and replenish units back into available stock.</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/returns")}
        >
          <FiArrowLeft />
          <span>Back to Returns</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Return Order Details</span>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading-state" style={{ padding: "2rem", textAlign: "center" }}>
              <div className="spinner spinner-primary"></div>
              <p style={{ marginTop: "0.75rem", color: "#64748b" }}>Loading invoice records...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Step 1: Select Invoice */}
              <div className="form-group">
                <label className="form-label required">1. Select Invoice</label>
                <Select
                  options={[
                    { value: "", label: "-- Choose Invoice to Return From --" },
                    ...invoices.map((inv) => ({
                      value: inv._id || inv.id,
                      label: `${inv.invoiceNumber || inv.id} · ${inv.customerDetails?.name || inv.customer || "Customer"} · ₹${inv.grandTotal ?? inv.amount}`
                    }))
                  ]}
                  value={selectedInvoiceId}
                  onChange={(val) => {
                    setSelectedInvoiceId(val);
                    setSelectedProductId("");
                    setQuantityReturned(1);
                  }}
                  placeholder="Choose Invoice"
                  searchable={invoices.length > 8}
                />
              </div>

              {/* Step 2: Select Product from Sale */}
              {selectedInvoice && (
                <div className="form-group">
                  <label className="form-label required">2. Select Product</label>
                  <Select
                    options={[
                      { value: "", label: "-- Choose Product --" },
                      ...availableItems.map((item) => ({
                        value: item.productId,
                        label: `${item.productName} (Sold: ${item.soldQuantity}, Returnable: ${item.remaining})`,
                        disabled: item.remaining === 0
                      }))
                    ]}
                    value={selectedProductId}
                    onChange={(val) => {
                      setSelectedProductId(val);
                      setQuantityReturned(1);
                    }}
                    placeholder="Choose Product"
                    searchable={availableItems.length > 8}
                  />
                </div>
              )}

              {/* Step 3: Quantity, Reason & Refund Method */}
              {selectedItem && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Quantity to Return</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max={selectedItem.remaining}
                      value={quantityReturned}
                      onChange={(e) => setQuantityReturned(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px" }}>
                      Max Returnable: <strong>{selectedItem.remaining}</strong> units
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Return Reason</label>
                    <Select
                      options={REASONS.map((r) => ({ value: r, label: r }))}
                      value={returnReason}
                      onChange={setReturnReason}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Refund Method</label>
                    <Select
                      options={REFUND_METHODS.map((m) => ({ value: m, label: m }))}
                      value={refundMethod}
                      onChange={setRefundMethod}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes / Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional return notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="new-return-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate("/returns")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedProductId || submitting}
                  id="btn-confirm-return"
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: "1rem", height: "1rem" }}></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      <span>Confirm Return</span>
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

export default NewReturn;