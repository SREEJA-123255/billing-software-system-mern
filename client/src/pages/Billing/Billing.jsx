import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiFileText,
  FiUser
} from "react-icons/fi";
import { getCustomers } from "../../services/customer";
import { getProducts } from "../../services/product";
import { createSale } from "../../services/sales";
import { createInvoice } from "../../services/invoice";
import Toast from "../../components/Common/Toast";
import Select from "../../components/Common/Select";
import PageHeader from "../../components/Common/PageHeader";
import { SkeletonCards } from "../../components/Common/Skeleton";
import { formatCurrency, formatOptional } from "../../utils/formatters";
import "../Catalog.css";
import "./Billing.css";

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Card", label: "Card" },
  { value: "BankTransfer", label: "Bank Transfer" },
  { value: "Credit", label: "Credit" }
];

const PAYMENT_STATUSES = [
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Partial", label: "Partially Paid" }
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percent (%)" },
  { value: "fixed", label: "Fixed (₹)" }
];

const TAX_RATES = [
  { value: 0, label: "0% (Exempt)" },
  { value: 5, label: "5% GST" },
  { value: 12, label: "12% GST" },
  { value: 18, label: "18% GST" },
  { value: 28, label: "28% GST" }
];

function Billing() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);

  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customerResponse, productResponse] = await Promise.all([
          getCustomers(),
          getProducts(),
        ]);

        const customerData = Array.isArray(customerResponse)
          ? customerResponse
          : customerResponse?.data || [];
        const productData = Array.isArray(productResponse)
          ? productResponse
          : productResponse?.data || [];

        setCustomers(
          customerData.map((c) => ({
            id: c._id || c.id,
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            address: c.address || "",
            gstNumber: c.gstNumber || "",
          }))
        );

        setProducts(
          productData.map((p) => ({
            id: p._id || p.id,
            name: p.productName || p.name,
            price: Number(p.sellingPrice ?? p.price ?? 0),
            stock: Number(p.stockQuantity ?? p.stock ?? 0),
          }))
        );
      } catch (error) {
        setToast({ message: error.message || "Failed to load catalog data", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: String(c.id),
      label: c.name,
      subtitle: [c.phone, c.address].filter(Boolean).join(" · ")
    }));
  }, [customers]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: String(p.id),
      label: p.name,
      subtitle: `${formatCurrency(p.price)} · Stock: ${p.stock} units`,
      disabled: p.stock <= 0
    }));
  }, [products]);

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));
  const selectedProduct = products.find((p) => String(p.id) === String(productId));

  const handleAddToCart = () => {
    if (!selectedProduct) {
      setToast({ message: "Please select a product first", type: "warning" });
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      setToast({ message: "Quantity must be at least 1", type: "warning" });
      return;
    }

    const existingItem = cart.find((item) => item.productId === selectedProduct.id);
    const existingQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = existingQuantity + qty;

    if (newTotalQuantity > selectedProduct.stock) {
      setToast({
        message: `Only ${selectedProduct.stock} units available for ${selectedProduct.name}`,
        type: "error",
      });
      return;
    }

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === selectedProduct.id
            ? {
              ...item,
              quantity: newTotalQuantity,
              total: newTotalQuantity * item.price,
            }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: qty,
          price: selectedProduct.price,
          total: qty * selectedProduct.price,
          stock: selectedProduct.stock,
        },
      ]);
    }

    setProductId("");
    setQuantity(1);
  };

  const handleRemoveFromCart = (prodId) => {
    setCart((current) => current.filter((item) => item.productId !== prodId));
  };

  const handleUpdateQuantity = (prodId, newQty) => {
    const val = Number(newQty);
    if (val < 1) return;

    const item = cart.find((i) => i.productId === prodId);
    if (!item) return;

    if (val > item.stock) {
      setToast({
        message: `Only ${item.stock} units available for ${item.productName}`,
        type: "warning",
      });
      return;
    }

    setCart(
      cart.map((i) =>
        i.productId === prodId
          ? {
            ...i,
            quantity: val,
            total: val * i.price,
          }
          : i
      )
    );
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue || 0);
    if (val <= 0) return 0;
    if (discountType === "percentage") {
      return Math.min((subtotal * val) / 100, subtotal);
    }
    return Math.min(val, subtotal);
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = Math.max(subtotal - discountAmount, 0);

  const taxAmount = useMemo(() => {
    const val = Number(tax || 0);
    if (val <= 0) return 0;
    return (taxableAmount * val) / 100;
  }, [taxableAmount, tax]);

  const grandTotal = taxableAmount + taxAmount;

  const handleCreateSaleAndInvoice = async () => {
    if (!selectedCustomer) {
      setToast({ message: "Please select a customer", type: "warning" });
      return;
    }

    if (cart.length === 0) {
      setToast({ message: "Cart is empty. Add at least one item.", type: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      const salePayload = {
        customer: selectedCustomer.id,
        items: cart.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        discount: {
          type: discountType,
          value: Number(discountValue || 0),
        },
        taxRate: Number(tax || 0),
        paymentMethod,
        paymentStatus,
      };

      const sale = await createSale(salePayload);
      const saleId = sale._id || sale.id;

      // Automatically generate invoice (also records payment directly)
      let createdInvoice = null;
      try {
        createdInvoice = await createInvoice({ saleId });
      } catch (invErr) {
        console.warn("Invoice generation warning:", invErr.message);
      }

      setToast({
        message: "Billing completed & payment recorded directly!",
        type: "success"
      });
      setCart([]);
      setCustomerId("");
      setProductId("");
      setQuantity(1);

      setTimeout(() => {
        navigate("/payments", {
          state: {
            fromBilling: true,
            customerName: selectedCustomer?.name,
            invoiceNumber: createdInvoice?.invoiceNumber,
            message: `Billing completed for ${selectedCustomer?.name || "customer"}! Payment recorded directly.`
          }
        });
      }, 700);
    } catch (err) {
      setToast({ message: err.message || "Failed to complete billing", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="catalog-page billing-container">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="POS Fast Checkout"
        description="Quick retail point-of-sale register for swift customer billing and instant invoice creation."
        actionButton={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/sales")}
          >
            <FiFileText />
            <span>View All Sales</span>
          </button>
        }
      />

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="pos-billing-grid">
          {/* LEFT COLUMN: Customer (1), Add Item (2), Order Items Cart (3) */}
          <div className="pos-left-col">
            {/* 1. Customer Selection Card */}
            <div className="card pos-card-customer">
              <div className="card-header">
                <span className="card-title">1. Customer</span>
              </div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Customer</label>
                  <Select
                    options={customerOptions}
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="Choose customer"
                    searchable={true}
                  />
                </div>

                {selectedCustomer && (
                  <div className="selected-customer-box">
                    <div>
                      <strong>{selectedCustomer.name}</strong>
                      <div className="selected-customer-meta">
                        {formatOptional(selectedCustomer.phone)} {selectedCustomer.address ? `· ${selectedCustomer.address}` : ""}
                      </div>
                    </div>
                    <span className="badge badge-active">Selected</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Add Item to Cart Card */}
            <div className="card pos-card-add-item">
              <div className="card-header">
                <span className="card-title">2. Add Item</span>
              </div>
              <div className="card-body">
                <div className="pos-add-item-grid">
                  <div className="form-group pos-product-group" style={{ marginBottom: 0 }}>
                    <label className="form-label required">Product</label>
                    <Select
                      options={productOptions}
                      value={productId}
                      onChange={setProductId}
                      placeholder="Select a product"
                      searchable={true}
                    />
                  </div>

                  <div className="form-group pos-qty-group" style={{ marginBottom: 0 }}>
                    <label className="form-label required">Qty</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max={selectedProduct ? selectedProduct.stock : undefined}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary pos-add-btn"
                    onClick={handleAddToCart}
                    disabled={!selectedProduct}
                  >
                    <FiPlus />
                    <span>Add Item</span>
                  </button>
                </div>

                {selectedProduct && (
                  <div className="selected-product-stock-hint" style={{ color: selectedProduct.stock <= 5 ? "var(--color-danger, #ef4444)" : "#64748b" }}>
                    Stock: <strong>{selectedProduct.stock}</strong> units · Price: <strong>{formatCurrency(selectedProduct.price)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Order Items (Cart) Card */}
            <div className="card pos-card-cart">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="card-title">3. Order Items ({cart.length})</span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setCart([])}
                  >
                    Clear Cart
                  </button>
                )}
              </div>
              <div className="card-body" style={{ padding: "0.75rem 1rem" }}>
                {cart.length === 0 ? (
                  <div className="pos-cart-empty-box">
                    <FiShoppingCart size={32} style={{ color: "#94a3b8", marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontWeight: 500, fontSize: "0.875rem" }}>
                      Cart is empty. Select products above to add to order.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Cart Table (>= 768px) */}
                    <div className="pos-cart-scroll-area desktop-cart-view">
                      <table className="pos-cart-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>Product</th>
                            <th style={{ width: "95px", textAlign: "right" }}>Price</th>
                            <th style={{ width: "75px", textAlign: "center" }}>Qty</th>
                            <th style={{ width: "105px", textAlign: "right" }}>Total</th>
                            <th style={{ width: "44px", textAlign: "center" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.productId}>
                              <td style={{ textAlign: "left" }}>
                                <strong className="pos-cart-prod-name">{item.productName}</strong>
                                <div className="pos-cart-prod-meta">Stock: {item.stock}</div>
                              </td>
                              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                {formatCurrency(item.price)}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="number"
                                  className="form-control pos-cart-qty-input"
                                  min="1"
                                  max={item.stock}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.productId, e.target.value)}
                                />
                              </td>
                              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                <strong>{formatCurrency(item.total)}</strong>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  className="btn-action-icon btn-action-delete"
                                  onClick={() => handleRemoveFromCart(item.productId)}
                                  title="Remove item"
                                  aria-label="Remove item"
                                >
                                  <FiTrash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cart Items List (< 768px) */}
                    <div className="mobile-cart-list">
                      {cart.map((item) => (
                        <div key={item.productId} className="mobile-cart-item">
                          <div className="mobile-cart-item-header">
                            <div className="mobile-cart-item-info">
                              <strong className="mobile-cart-item-name">{item.productName}</strong>
                              <span className="mobile-cart-item-unit-price">{formatCurrency(item.price)} each</span>
                            </div>
                            <button
                              type="button"
                              className="btn-action-icon btn-action-delete mobile-cart-delete-btn"
                              onClick={() => handleRemoveFromCart(item.productId)}
                              title="Remove item"
                              aria-label="Remove item"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                          <div className="mobile-cart-item-footer">
                            <div className="mobile-cart-qty-ctrl">
                              <span className="mobile-cart-qty-label">Qty:</span>
                              <input
                                type="number"
                                className="form-control mobile-cart-qty-input"
                                min="1"
                                max={item.stock}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.productId, e.target.value)}
                              />
                              <span className="mobile-cart-stock-label">(max {item.stock})</span>
                            </div>
                            <div className="mobile-cart-item-total">
                              {formatCurrency(item.total)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ONE Sticky Summary Panel (4. Payment & Checkout) */}
          <div className="pos-right-col">
            <div className="card pos-sticky-payment-panel">
              <div className="card-header">
                <span className="card-title">4. Payment & Checkout</span>
              </div>
              <div className="card-body pos-payment-panel-body">
                {/* Discount */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount</label>
                  <div className="pos-discount-input-group">
                    <Select
                      options={DISCOUNT_TYPES}
                      value={discountType}
                      onChange={setDiscountType}
                    />
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.01"}
                      max={discountType === "percentage" ? 100 : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* GST Tax Rate */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">GST Tax</label>
                  <Select
                    options={TAX_RATES}
                    value={tax}
                    onChange={(val) => setTax(Number(val))}
                  />
                </div>

                {/* Payment Method */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Payment Method</label>
                  <Select
                    options={PAYMENT_METHODS}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                </div>

                {/* Payment Status */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Payment Status</label>
                  <Select
                    options={PAYMENT_STATUSES}
                    value={paymentStatus}
                    onChange={setPaymentStatus}
                  />
                </div>

                {/* Bill Breakdown Box */}
                <div className="pos-bill-summary-box">
                  <div className="pos-bill-summary-row">
                    <span>Subtotal</span>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(subtotal)}</strong>
                  </div>
                  <div className="pos-bill-summary-row">
                    <span>Discount</span>
                    <strong style={{ color: "var(--color-danger, #ef4444)", fontVariantNumeric: "tabular-nums" }}>
                      -{formatCurrency(discountAmount)}
                    </strong>
                  </div>
                  <div className="pos-bill-summary-row">
                    <span>GST ({tax}%)</span>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>+{formatCurrency(taxAmount)}</strong>
                  </div>
                  <div className="pos-bill-summary-row grand-total">
                    <span>Grand Total</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* Desktop Complete Sale Button */}
                <button
                  type="button"
                  className="btn btn-primary pos-desktop-complete-btn"
                  disabled={cart.length === 0 || !customerId || isSubmitting}
                  onClick={handleCreateSaleAndInvoice}
                  id="btn-pos-complete-sale"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: "1rem", height: "1rem" }}></div>
                      <span>Processing Sale...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      <span>Complete Sale & Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar (< 768px) */}
      <div className="pos-mobile-sticky-bar">
        <div className="pos-mobile-sticky-total">
          <span className="pos-mobile-sticky-total-label">Grand Total</span>
          <span className="pos-mobile-sticky-total-amount">{formatCurrency(grandTotal)}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary pos-mobile-sticky-btn"
          disabled={cart.length === 0 || !customerId || isSubmitting}
          onClick={handleCreateSaleAndInvoice}
        >
          {isSubmitting ? "Processing..." : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}

export default Billing;