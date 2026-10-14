import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiShoppingBag,
  FiUser,
  FiDollarSign,
  FiPercent,
  FiCheckCircle
} from "react-icons/fi";
import { getCustomers } from "../../../services/customer";
import { getProducts } from "../../../services/product";
import { createSale } from "../../../services/sales";
import { createInvoice } from "../../../services/invoice";
import customerService from "../../../services/customerService";
import productService from "../../../services/productService";
import categoryService from "../../../services/categoryService";
import CustomerForm from "../../Customers/CustomerForm";
import Modal from "../../../components/Common/Modal";
import Toast from "../../../components/Common/Toast";
import Select from "../../../components/Common/Select";
import "../../Catalog.css";
import "./NewSale.css";

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "BankTransfer", "Credit"];
const PAYMENT_STATUSES = ["Paid", "Pending", "Partial"];

const mapProduct = (product) => ({
  id: product._id || product.id,
  name: product.productName || product.name,
  price: Number(product.sellingPrice ?? product.price ?? 0),
  stock: Number(product.stockQuantity ?? product.stock ?? 0),
});

function NewSale() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // New Product Modal State
  const [categories, setCategories] = useState([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    productName: "",
    sku: "",
    category: "",
    sellingPrice: "",
    purchasePrice: "0",
    stockQuantity: "100",
    taxRate: 0
  });
  const [productFormErrors, setProductFormErrors] = useState({});

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  const [items, setItems] = useState([
    {
      id: Date.now(),
      productId: "",
      quantity: 1,
      price: 0,
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customerResponse, productResponse, categoryResponse] = await Promise.all([
          getCustomers(),
          getProducts(),
          categoryService.getCategories().catch(() => ({ data: [] }))
        ]);

        const customerData = Array.isArray(customerResponse)
          ? customerResponse
          : customerResponse?.data || [];

        const productData = Array.isArray(productResponse)
          ? productResponse
          : productResponse?.data || [];

        const categoryData = Array.isArray(categoryResponse?.data)
          ? categoryResponse.data
          : Array.isArray(categoryResponse)
          ? categoryResponse
          : [];

        const formattedCustomers = customerData.map((customer) => ({
          id: customer._id || customer.id,
          name: customer.name,
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
          gstNumber: customer.gstNumber || "",
        }));

        const formattedProducts = productData.map(mapProduct);

        setCustomers(formattedCustomers);
        setProducts(formattedProducts);
        setCategories(categoryData);
      } catch (error) {
        setToast({ message: error.message || "Failed to load catalog data", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    const safeAmount = Number(amount || 0);
    return `₹${safeAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const selectedCustomer = customers.find(
    (customer) => String(customer.id) === String(customerId)
  );

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      return total + Number(item.quantity || 0) * Number(item.price || 0);
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const value = Number(discountValue || 0);
    if (value <= 0) return 0;
    if (discountType === "percentage") {
      return Math.min(subtotal, (subtotal * Math.min(100, Math.max(0, value))) / 100);
    }
    return Math.min(subtotal, Math.max(0, value));
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    const safeTaxRate = Math.max(0, Number(taxRate || 0));
    return (taxableAmount * safeTaxRate) / 100;
  }, [taxableAmount, taxRate]);

  const grandTotal = taxableAmount + taxAmount;

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        productId: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const removeItem = (id) => {
    if (items.length === 1) {
      setToast({ message: "Sale must contain at least one item", type: "warning" });
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleProductChange = (id, selectedProductId) => {
    const product = products.find((p) => String(p.id) === String(selectedProductId));
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              productId: selectedProductId,
              price: product ? product.price : 0,
              quantity: item.quantity || 1,
            }
          : item
      )
    );
  };

  const handleQuantityChange = (id, newQuantity) => {
    const val = Number(newQuantity);
    setItems((current) =>
      current.map((item) => {
        if (item.id === id) {
          const product = products.find((p) => String(p.id) === String(item.productId));
          if (product && val > product.stock) {
            setToast({
              message: `Only ${product.stock} units available for ${product.name}`,
              type: "warning",
            });
          }
          return { ...item, quantity: val };
        }
        return item;
      })
    );
  };

  const handlePriceChange = (id, newPrice) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, price: Number(newPrice) } : item
      )
    );
  };

  const handleSaveNewCustomer = async (formData) => {
    try {
      const created = await customerService.createCustomer(formData);
      const newCustomer = {
        id: created.id || created._id,
        name: created.name,
        phone: created.phone || "",
        email: created.email || "",
        address: created.address || "",
        gstNumber: created.gstNumber || ""
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      setCustomerId(newCustomer.id);
      setIsCustomerModalOpen(false);
      setToast({
        message: `Customer "${newCustomer.name}" created and selected!`,
        type: "success"
      });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || err.message || "Failed to create customer",
        type: "error"
      });
    }
  };

  const handleOpenNewProductModal = () => {
    const randomSku = `PRD-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const defaultCat = categories.length > 0 ? (categories[0]._id || categories[0].id) : "";
    setNewProductForm({
      productName: "",
      sku: randomSku,
      category: defaultCat,
      sellingPrice: "",
      purchasePrice: "0",
      stockQuantity: "100",
      taxRate: 0
    });
    setProductFormErrors({});
    setIsProductModalOpen(true);
  };

  const handleSaveNewProduct = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newProductForm.productName.trim()) {
      errors.productName = "Product name is required";
    }
    const sPrice = Number(newProductForm.sellingPrice);
    if (!newProductForm.sellingPrice || isNaN(sPrice) || sPrice < 0) {
      errors.sellingPrice = "Valid selling price is required";
    }

    let catId = newProductForm.category;
    if (!catId && categories.length > 0) {
      catId = categories[0]._id || categories[0].id;
    }

    if (!catId) {
      try {
        const catRes = await categoryService.createCategory({
          name: "General",
          description: "Default retail category"
        });
        const createdCat = catRes.data || catRes.category || catRes;
        catId = createdCat._id || createdCat.id;
        setCategories([createdCat]);
      } catch (catErr) {
        errors.category = "Please select or create a category";
      }
    }

    if (Object.keys(errors).length > 0) {
      setProductFormErrors(errors);
      return;
    }

    setIsCreatingProduct(true);
    try {
      const generatedSku = newProductForm.sku.trim() || `PRD-${Date.now().toString(36).slice(-5).toUpperCase()}`;
      const payload = {
        productName: newProductForm.productName.trim(),
        sku: generatedSku,
        category: catId,
        sellingPrice: sPrice,
        purchasePrice: Number(newProductForm.purchasePrice || 0),
        stockQuantity: Number(newProductForm.stockQuantity || 100),
        taxRate: Number(newProductForm.taxRate || 0),
        status: "ACTIVE"
      };

      const res = await productService.createProduct(payload);
      const createdProd = res.product || res.data || res;
      const formattedProd = mapProduct(createdProd);

      setProducts((prev) => [formattedProd, ...prev]);

      // Assign to current item or add new line item
      setItems((prevItems) => {
        const emptyItemIndex = prevItems.findIndex((it) => !it.productId);
        if (emptyItemIndex !== -1) {
          return prevItems.map((it, idx) =>
            idx === emptyItemIndex
              ? { ...it, productId: formattedProd.id, price: formattedProd.price }
              : it
          );
        } else {
          return [
            ...prevItems,
            {
              id: Date.now(),
              productId: formattedProd.id,
              quantity: 1,
              price: formattedProd.price
            }
          ];
        }
      });

      setIsProductModalOpen(false);
      setToast({
        message: `Product "${formattedProd.name}" created and added to sale!`,
        type: "success"
      });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || err.message || "Failed to create product",
        type: "error"
      });
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerId) {
      setToast({ message: "Please select a customer", type: "error" });
      return;
    }

    if (items.length === 0) {
      setToast({ message: "Please add at least one product", type: "error" });
      return;
    }

    for (const item of items) {
      if (!item.productId) {
        setToast({ message: "Please select a product for each line item", type: "error" });
        return;
      }
      if (!item.quantity || Number(item.quantity) < 1) {
        setToast({ message: "Quantity must be at least 1", type: "error" });
        return;
      }
      const product = products.find((p) => String(p.id) === String(item.productId));
      if (product && Number(item.quantity) > product.stock) {
        setToast({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}`,
          type: "error",
        });
        return;
      }
    }

    // Check duplicate products
    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      setToast({
        message: "Same product appears more than once. Adjust its quantity instead.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const salePayload = {
        customer: customerId,
        items: items.map((item) => ({
          product: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
        discount: {
          type: discountType,
          value: Number(discountValue || 0),
        },
        taxRate: Number(taxRate || 0),
        paymentMethod,
        paymentStatus,
      };

      const res = await createSale(salePayload);
      const saleId = res._id || res.id;

      // Automatically generate invoice & auto-record payment directly
      let createdInvoice = null;
      try {
        createdInvoice = await createInvoice({ saleId });
      } catch (invErr) {
        console.warn("Invoice generation warning:", invErr.message);
      }

      setToast({
        message: "Sale created & payment recorded successfully!",
        type: "success"
      });

      setTimeout(() => {
        navigate("/payments", {
          state: {
            fromBilling: true,
            customerName: selectedCustomer?.name,
            invoiceNumber: createdInvoice?.invoiceNumber,
            message: `Sale registered for ${selectedCustomer?.name || "customer"}! Payment recorded directly.`
          }
        });
      }, 700);
    } catch (err) {
      setToast({ message: err.message || "Failed to create sale", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="catalog-page newsale-container">
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
          <h2>Create New Sale</h2>
          <p>Register a new retail transaction, deduct inventory, and calculate totals.</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/sales")}
        >
          <FiArrowLeft />
          <span>Back to Sales</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="newsale-grid">
          {/* Left Column: Customer & Items */}
          <div className="newsale-col-main">
            {/* Customer Card */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="card-title">1. Customer Details</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                  onClick={() => setIsCustomerModalOpen(true)}
                  id="btn-add-customer-sale"
                >
                  <FiPlus />
                  <span>New Customer</span>
                </button>
              </div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                    <label className="form-label required" style={{ marginBottom: 0 }}>Select Customer</label>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--brand-primary, #6366f1)",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: 0
                      }}
                      onClick={() => setIsCustomerModalOpen(true)}
                    >
                      <FiPlus size={14} /> + Add New Customer
                    </button>
                  </div>
                  <Select
                    options={[
                      { value: "", label: "-- Choose Customer --" },
                      ...customers.map((c) => ({
                        value: c.id,
                        label: c.name,
                        subtitle: c.phone ? `Phone: ${c.phone}` : ""
                      }))
                    ]}
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="Choose Customer"
                    searchable={customers.length > 5}
                  />
                </div>

                {selectedCustomer ? (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.875rem 1rem",
                      background: "#f8fafc",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#0f172a" }}>{selectedCustomer.name}</strong>
                      <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                        Phone: {selectedCustomer.phone || "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                      Address: {selectedCustomer.address || "—"}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      fontSize: "0.8125rem",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-subtle, #f8fafc)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px dashed var(--border-color, #e2e8f0)"
                    }}
                  >
                    <span>Not in list? Add new customer</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setIsCustomerModalOpen(true)}
                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                    >
                      <FiPlus size={12} /> Add Customer
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Card */}
            <div className="card">
              <div className="card-header" style={{ justifyContent: "space-between", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <span className="card-title">2. Products & Quantities ({items.length})</span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    onClick={handleOpenNewProductModal}
                    id="btn-add-new-product"
                  >
                    <FiPlus />
                    <span>New Product</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={addItem}
                  >
                    <FiPlus />
                    <span>Add Line Item</span>
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: "0.75rem", overflow: "visible" }}>
                {/* Desktop Table View */}
                <div className="newsale-items-table-container desktop-items-view">
                  <table className="data-table items-table">
                    <thead>
                      <tr>
                        <th style={{ width: "42%" }}>PRODUCT</th>
                        <th style={{ width: "18%" }}>PRICE (₹)</th>
                        <th style={{ width: "15%" }}>QTY</th>
                        <th style={{ width: "17%" }}>TOTAL (₹)</th>
                        <th style={{ width: "8%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const product = products.find((p) => String(p.id) === String(item.productId));
                        const itemTotal = Number(item.quantity || 0) * Number(item.price || 0);

                        return (
                          <tr key={item.id}>
                            <td className="col-product">
                              <Select
                                options={[
                                  { value: "", label: "-- Choose Product --" },
                                  ...products.map((p) => ({
                                    value: p.id,
                                    label: p.name,
                                    subtitle: `Stock: ${p.stock} units • ₹${Number(p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                                    disabled: p.stock <= 0
                                  }))
                                ]}
                                value={item.productId}
                                onChange={(val) => handleProductChange(item.id, val)}
                                placeholder="Choose Product"
                                searchable={products.length > 5}
                                menuWidth="min(480px, 92vw)"
                              />
                              {product && (
                                <div style={{ fontSize: "0.75rem", color: product.stock <= 5 ? "var(--color-danger)" : "#64748b", marginTop: "3px" }}>
                                  Available in Stock: <strong>{product.stock}</strong> units
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <strong>{formatCurrency(itemTotal)}</strong>
                            </td>
                            <td className="item-row-action">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm btn-icon"
                                onClick={() => removeItem(item.id)}
                                title="Remove line item"
                                disabled={items.length === 1}
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="mobile-items-view">
                  {items.map((item, index) => {
                    const product = products.find((p) => String(p.id) === String(item.productId));
                    const itemTotal = Number(item.quantity || 0) * Number(item.price || 0);

                    return (
                      <div key={item.id} className="newsale-item-card">
                        <div className="newsale-item-card-header">
                          <span className="newsale-item-number">Line Item #{index + 1}</span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm btn-icon"
                              onClick={() => removeItem(item.id)}
                              title="Remove item"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>

                        <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                          <label className="form-label required" style={{ fontSize: "0.75rem" }}>Select Product</label>
                          <Select
                            options={[
                              { value: "", label: "-- Choose Product --" },
                              ...products.map((p) => ({
                                value: p.id,
                                label: p.name,
                                subtitle: `Stock: ${p.stock} units • ₹${Number(p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                                disabled: p.stock <= 0
                              }))
                            ]}
                            value={item.productId}
                            onChange={(val) => handleProductChange(item.id, val)}
                            placeholder="Choose Product"
                            searchable={products.length > 5}
                          />
                          {product && (
                            <div style={{ fontSize: "0.75rem", color: product.stock <= 5 ? "var(--color-danger)" : "#64748b", marginTop: "4px" }}>
                              Available Stock: <strong>{product.stock}</strong> units
                            </div>
                          )}
                        </div>

                        <div className="newsale-item-card-inputs">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.75rem" }}>Price (₹)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.75rem" }}>Qty</label>
                            <input
                              type="number"
                              className="form-control"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.75rem" }}>Line Total</label>
                            <div className="newsale-item-total-box">
                              {formatCurrency(itemTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Helper prompt to add custom / new product */}
                <div
                  style={{
                    marginTop: "0.875rem",
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-subtle, #f8fafc)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px dashed var(--border-color, #e2e8f0)"
                  }}
                >
                  <span>Product not found in catalog?</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleOpenNewProductModal}
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    <FiPlus size={12} /> Add New Product
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment, Taxes & Totals */}
          <div className="newsale-col-side">
            {/* Payment & Discount Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">3. Discounts & Taxes</span>
              </div>
              <div className="card-body">
                {/* Discount */}
                <div className="form-group">
                  <label className="form-label">Discount</label>
                  <div className="newsale-discount-group">
                    <Select
                      options={[
                        { value: "percentage", label: "Percent (%)" },
                        { value: "fixed", label: "Fixed (₹)" }
                      ]}
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

                {/* Tax Rate */}
                <div className="form-group">
                  <label className="form-label">Tax Rate (GST %)</label>
                  <Select
                    options={[
                      { value: 0, label: "0% (Exempt)" },
                      { value: 5, label: "5% GST" },
                      { value: 12, label: "12% GST" },
                      { value: 18, label: "18% GST" },
                      { value: 28, label: "28% GST" }
                    ]}
                    value={taxRate}
                    onChange={(val) => setTaxRate(Number(val))}
                  />
                </div>

                {/* Payment Method */}
                <div className="form-group">
                  <label className="form-label required">Payment Method</label>
                  <Select
                    options={PAYMENT_METHODS.map((method) => ({
                      value: method,
                      label: method
                    }))}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                </div>

                {/* Payment Status */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Payment Status</label>
                  <Select
                    options={PAYMENT_STATUSES.map((status) => ({
                      value: status,
                      label: status
                    }))}
                    value={paymentStatus}
                    onChange={setPaymentStatus}
                  />
                </div>
              </div>
            </div>

            {/* Bill Summary Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">4. Bill Summary</span>
              </div>
              <div className="card-body">
                <div className="totals-breakdown">
                  <div className="totals-row">
                    <span>Subtotal</span>
                    <strong>{formatCurrency(subtotal)}</strong>
                  </div>
                  <div className="totals-row">
                    <span>Discount</span>
                    <strong style={{ color: "var(--color-danger)" }}>
                      -{formatCurrency(discountAmount)}
                    </strong>
                  </div>
                  <div className="totals-row">
                    <span>Taxable Amount</span>
                    <span>{formatCurrency(taxableAmount)}</span>
                  </div>
                  <div className="totals-row">
                    <span>GST Tax ({taxRate}%)</span>
                    <strong>+{formatCurrency(taxAmount)}</strong>
                  </div>
                  <div className="totals-row grand-total">
                    <span>Grand Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "1.25rem", padding: "0.875rem" }}
                  disabled={submitting}
                  id="btn-submit-sale"
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: "1rem", height: "1rem" }}></div>
                      <span>Processing Sale...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      <span>Confirm & Create Sale</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {isCustomerModalOpen && (
        <CustomerForm
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSave={handleSaveNewCustomer}
          isQuickAdd={true}
        />
      )}

      {/* Quick Add Product Modal */}
      {isProductModalOpen && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title="Add New Product (Quick)"
          maxWidth="640px"
        >
          <form onSubmit={handleSaveNewProduct}>
            <div className="modal-two-col-grid">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label required">Product Name</label>
                <input
                  type="text"
                  className={`form-control ${productFormErrors.productName ? "is-invalid" : ""}`}
                  placeholder="e.g. Wireless Mouse"
                  value={newProductForm.productName}
                  onChange={(e) => {
                    setNewProductForm((prev) => ({ ...prev, productName: e.target.value }));
                    if (productFormErrors.productName) setProductFormErrors((p) => ({ ...p, productName: null }));
                  }}
                  autoFocus
                  required
                />
                {productFormErrors.productName && <div className="form-error">{productFormErrors.productName}</div>}
              </div>

              <div className="form-group">
                <label className="form-label required">Selling Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`form-control ${productFormErrors.sellingPrice ? "is-invalid" : ""}`}
                  placeholder="0.00"
                  value={newProductForm.sellingPrice}
                  onChange={(e) => {
                    setNewProductForm((prev) => ({ ...prev, sellingPrice: e.target.value }));
                    if (productFormErrors.sellingPrice) setProductFormErrors((p) => ({ ...p, sellingPrice: null }));
                  }}
                  required
                />
                {productFormErrors.sellingPrice && <div className="form-error">{productFormErrors.sellingPrice}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Cost / Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={newProductForm.purchasePrice}
                  onChange={(e) => setNewProductForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Category</label>
                <Select
                  options={
                    categories.length > 0
                      ? categories.map((c) => ({ value: c._id || c.id, label: c.name }))
                      : [{ value: "", label: "General" }]
                  }
                  value={newProductForm.category}
                  onChange={(val) => {
                    setNewProductForm((prev) => ({ ...prev, category: val }));
                    if (productFormErrors.category) setProductFormErrors((p) => ({ ...p, category: null }));
                  }}
                  placeholder="Select Category"
                />
                {productFormErrors.category && <div className="form-error">{productFormErrors.category}</div>}
              </div>

              <div className="form-group">
                <label className="form-label required">Initial Stock Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={newProductForm.stockQuantity}
                  onChange={(e) => setNewProductForm((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">SKU Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. ELEC-001"
                  value={newProductForm.sku}
                  onChange={(e) => setNewProductForm((prev) => ({ ...prev, sku: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GST Tax Rate</label>
                <Select
                  options={[
                    { value: 0, label: "0% (Exempt)" },
                    { value: 5, label: "5% GST" },
                    { value: 12, label: "12% GST" },
                    { value: 18, label: "18% GST" },
                    { value: 28, label: "28% GST" }
                  ]}
                  value={newProductForm.taxRate}
                  onChange={(val) => setNewProductForm((prev) => ({ ...prev, taxRate: Number(val) }))}
                />
              </div>
            </div>

            <div className="modal-footer-actions" style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsProductModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreatingProduct}
              >
                {isCreatingProduct ? "Creating..." : "Save & Add to Sale"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default NewSale;