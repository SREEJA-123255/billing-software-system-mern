import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiShoppingBag,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import purchaseService, {
  generatePurchaseId
} from '../../services/purchaseService';
import supplierService from '../../services/supplierService';
import productService from '../../services/productService';
import Select from '../../components/Common/Select';
import './Purchases.css';

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partial', 'Unpaid'];

const createEmptyItem = () => ({
  productId: '',
  productName: '',
  quantity: 1,
  purchasePrice: 0,
  tax: 0,
  discount: 0
});

const PurchaseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Form State
  const [purchaseId, setPurchaseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState([createEmptyItem()]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [notes, setNotes] = useState('');

  // Suppliers & Products
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // General State
  const [loading, setLoading] = useState(false);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load Suppliers
  const loadSuppliers = useCallback(async () => {
    try {
      setLoadingSuppliers(true);
      setError('');
      const data = await supplierService.getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(
        err.response?.data?.message ||
          'Unable to load suppliers. Please check network connection.'
      );
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  // Load Products
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await productService.getProducts();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Load Purchase When Editing
  const loadPurchase = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingPurchase(true);
      setError('');
      const purchase = await purchaseService.getPurchaseById(id);

      setPurchaseId(purchase.purchaseId || '');
      setSupplierId(
        typeof purchase.supplierId === 'object'
          ? purchase.supplierId?._id
          : purchase.supplierId || ''
      );
      setPurchaseDate(
        purchase.purchaseDate || new Date().toISOString().split('T')[0]
      );
      setPaymentStatus(purchase.paymentStatus || 'Pending');
      setDiscountAmount(Number(purchase.discountAmount || 0));
      setTaxAmount(Number(purchase.taxAmount || 0));
      setNotes(purchase.notes || '');

      const loadedItems = (purchase.items || []).map((item) => ({
        productId:
          typeof item.productId === 'object'
            ? item.productId?._id || ''
            : item.productId || '',
        productName: item.productName || '',
        quantity: Number(item.quantity || 1),
        purchasePrice: Number(item.purchasePrice || 0),
        tax: Number(item.tax || 0),
        discount: Number(item.discount || 0)
      }));

      setItems(loadedItems.length > 0 ? loadedItems : [createEmptyItem()]);
    } catch (err) {
      console.error('Failed to load purchase:', err);
      setError(
        err.response?.data?.message || 'Unable to load purchase order details.'
      );
    } finally {
      setLoadingPurchase(false);
    }
  }, [id]);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, [loadSuppliers, loadProducts]);

  useEffect(() => {
    if (isEditMode) {
      loadPurchase();
    } else {
      setPurchaseId('');
      setItems([createEmptyItem()]);
    }
  }, [isEditMode, loadPurchase]);

  // Generate Purchase ID for New Order
  useEffect(() => {
    const generateId = async () => {
      if (isEditMode) return;
      try {
        const purchases = await purchaseService.getPurchases();
        const newId = generatePurchaseId(purchases);
        setPurchaseId(newId);
      } catch (err) {
        console.error('Unable to generate purchase ID:', err);
        setPurchaseId(`PUR-${Date.now()}`);
      }
    };

    generateId();
  }, [isEditMode]);

  // Calculations
  const calculateItemSubtotal = (item) => {
    const quantity = Number(item.quantity || 0);
    const purchasePrice = Number(item.purchasePrice || 0);
    return quantity * purchasePrice;
  };

  const calculateItemTax = (item) => {
    const itemSubtotal = calculateItemSubtotal(item);
    const taxRate = Number(item.tax || 0);
    return (itemSubtotal * taxRate) / 100;
  };

  const calculateItemTotal = (item) => {
    const itemSubtotal = calculateItemSubtotal(item);
    const tax = calculateItemTax(item);
    return itemSubtotal + tax;
  };

  const subtotal = items.reduce(
    (total, item) => total + calculateItemSubtotal(item),
    0
  );

  const calculatedItemTax = items.reduce(
    (total, item) => total + calculateItemTax(item),
    0
  );

  const finalTax = calculatedItemTax;
  const discount = Number(discountAmount || 0);
  const grandTotal = Math.max(0, subtotal - discount + finalTax);

  const handleItemChange = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleProductChange = (index, productId) => {
    const selectedProduct = products.find(
      (product) => String(product._id || product.id) === String(productId)
    );

    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              productName:
                selectedProduct?.productName || selectedProduct?.name || '',
              purchasePrice:
                selectedProduct?.purchasePrice ||
                selectedProduct?.price ||
                item.purchasePrice ||
                0,
              tax:
                selectedProduct?.taxRate ||
                selectedProduct?.tax ||
                item.tax ||
                0
            }
          : item
      )
    );
  };

  const validateForm = () => {
    if (!purchaseId.trim()) {
      return 'Purchase ID is required.';
    }

    if (!supplierId) {
      return 'Please select a supplier.';
    }

    if (!purchaseDate) {
      return 'Purchase date is required.';
    }

    if (!items.length) {
      return 'At least one purchase item is required.';
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      if (!item.productId) {
        return `Product is required for item #${index + 1}.`;
      }

      if (Number(item.quantity) <= 0 || !item.quantity) {
        return `Quantity must be greater than 0 for item #${index + 1}.`;
      }

      if (Number(item.purchasePrice) < 0 || item.purchasePrice === '') {
        return `Purchase price cannot be negative for item #${index + 1}.`;
      }

      if (Number(item.tax || 0) < 0) {
        return `Tax cannot be negative for item #${index + 1}.`;
      }
    }

    if (discount < 0) {
      return 'Discount cannot be negative.';
    }

    if (discount > subtotal) {
      return 'Discount cannot be greater than subtotal.';
    }

    if (finalTax < 0) {
      return 'Tax cannot be negative.';
    }

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return 'Please select a valid payment status.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);

      const backendItems = items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),
        tax: Number(item.tax || 0)
      }));

      const payload = {
        purchaseId: purchaseId.trim(),
        supplierId,
        purchaseDate,
        items: backendItems,
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        tax: Number(finalTax.toFixed(2)),
        totalAmount: Number(grandTotal.toFixed(2)),
        paymentStatus: paymentStatus.toLowerCase(),
        notes: notes.trim()
      };

      if (isEditMode) {
        await purchaseService.updatePurchase(id, payload);
        setSuccessMessage('Purchase order updated successfully.');
      } else {
        await purchaseService.createPurchase(payload);
        setSuccessMessage('Purchase order created successfully.');
      }

      setTimeout(() => {
        navigate('/purchases');
      }, 1000);
    } catch (err) {
      console.error('Failed to submit purchase:', err);
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        setError(
          err.errors
            .map((e) => e.message || e.msg || String(e))
            .join(' ')
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to save purchase. Please try again.'
        );
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPurchase) {
    return (
      <div className="purchases-page">
        <div className="state-message-card" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-primary" style={{ width: '2.5rem', height: '2.5rem' }}></div>
          <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Loading purchase order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchases-page">
      {/* Page Header */}
      <div className="page-action-bar">
        <div className="page-heading">
          <h2>{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
          <p>Configure supplier procurement details, line items, and invoice totals.</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/purchases')}
        >
          <FiArrowLeft />
          <span>Back to List</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger">
          <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <FiCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1: General Info Card */}
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-section-title">
            <span>Purchase Information</span>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
              * Required fields
            </span>
          </div>

          <div className="purchase-form-info-grid">
            <div className="form-group">
              <label className="form-label required" htmlFor="purch-order-id">
                Purchase ID
              </label>
              <input
                type="text"
                id="purch-order-id"
                value={purchaseId}
                onChange={(e) => setPurchaseId(e.target.value)}
                className="form-control"
                placeholder="PUR-001"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="purch-supplier">
                Supplier
              </label>
              <Select
                id="purch-supplier"
                options={[
                  { value: "", label: "Select a Supplier" },
                  ...suppliers.map((s) => ({
                    value: s.id,
                    label: `${s.companyName}${s.contactPerson ? ` (${s.contactPerson})` : ''}`
                  }))
                ]}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Select a Supplier"
                searchable={suppliers.length > 8}
              />
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="purch-date">
                Purchase Date
              </label>
              <input
                type="date"
                id="purch-date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="purch-status">
                Payment Status
              </label>
              <Select
                id="purch-status"
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

        {/* Section 2: Items Table Card */}
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-section-title">
            <span>Purchase Items</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addItem}
            >
              <FiPlus /> Add Item
            </button>
          </div>

          <div className="items-table-wrapper desktop-only">
            <table className="desktop-table-view">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>#</th>
                  <th style={{ minWidth: '220px' }}>Product *</th>
                  <th style={{ width: '90px' }}>Quantity *</th>
                  <th style={{ width: '120px' }}>Price (₹) *</th>
                  <th style={{ width: '80px' }}>Tax (%)</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ width: '115px', textAlign: 'right' }}>Line Total</th>
                  <th style={{ width: '44px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const lineSubtotal = calculateItemSubtotal(item);
                  const lineTotal = calculateItemTotal(item);

                  return (
                    <tr key={index}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{index + 1}</td>
                      <td>
                        <Select
                          options={[
                            { value: "", label: "Select Product" },
                            ...products.map((p) => ({
                              value: p._id || p.id,
                              label: p.productName || p.name || 'Unnamed Product',
                              subtitle: p.sku ? `SKU: ${p.sku}` : ''
                            })),
                            ...(item.productId && !products.some((p) => String(p._id || p.id) === String(item.productId))
                              ? [{
                                  value: item.productId,
                                  label: item.productName || 'Selected Product',
                                  subtitle: ''
                                }]
                              : [])
                          ]}
                          value={item.productId}
                          onChange={(val) => handleProductChange(index, val)}
                          placeholder="Select Product"
                          menuWidth="360px"
                          autoFlip={false}
                          searchable={products.length > 5}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', e.target.value)
                          }
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(e) =>
                            handleItemChange(index, 'purchasePrice', e.target.value)
                          }
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.tax}
                          onChange={(e) =>
                            handleItemChange(index, 'tax', e.target.value)
                          }
                          className="form-control"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td style={{ fontWeight: 600, color: '#334155', textAlign: 'right' }}>
                        ₹ {lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="action-icon-btn delete"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          title="Remove item"
                          style={{ opacity: items.length === 1 ? 0.3 : 1 }}
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

          {/* Mobile Line Items View (< 768px) */}
          <div className="mobile-items-view">
            {items.map((item, index) => {
              const lineSubtotal = calculateItemSubtotal(item);
              const lineTotal = calculateItemTotal(item);

              return (
                <div key={index} className="purchase-line-card">
                  <div className="purchase-line-card-header">
                    <span className="purchase-line-badge">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeItem(index)}
                        title="Remove item"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FiTrash2 />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label required" style={{ fontSize: '0.75rem' }}>
                      Product
                    </label>
                    <Select
                      options={[
                        { value: '', label: 'Select Product' },
                        ...products.map((p) => ({
                          value: p._id || p.id,
                          label: p.productName || p.name || 'Unnamed Product',
                          subtitle: p.sku ? `SKU: ${p.sku}` : ''
                        })),
                        ...(item.productId && !products.some((p) => String(p._id || p.id) === String(item.productId))
                          ? [{
                              value: item.productId,
                              label: item.productName || 'Selected Product',
                              subtitle: ''
                            }]
                          : [])
                      ]}
                      value={item.productId}
                      onChange={(val) => handleProductChange(index, val)}
                      placeholder="Select Product"
                      searchable={products.length > 5}
                    />
                  </div>

                  <div className="purchase-line-inputs-grid">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label required" style={{ fontSize: '0.75rem' }}>
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', e.target.value)
                        }
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label required" style={{ fontSize: '0.75rem' }}>
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.purchasePrice}
                        onChange={(e) =>
                          handleItemChange(index, 'purchasePrice', e.target.value)
                        }
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>
                        Tax (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.tax}
                        onChange={(e) =>
                          handleItemChange(index, 'tax', e.target.value)
                        }
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="purchase-line-totals-footer">
                    <div className="purchase-line-subtotal">
                      <span className="purchase-line-label">Subtotal</span>
                      <span className="purchase-line-val">
                        ₹ {lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="purchase-line-total">
                      <span className="purchase-line-label">Line Total</span>
                      <strong className="purchase-line-total-val">
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Notes & Summary Card */}
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '2rem'
            }}
          >
            {/* Notes */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="purch-notes">
                  Order Notes & Terms
                </label>
                <textarea
                  id="purch-notes"
                  rows="4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional instructions or delivery terms..."
                  className="form-control"
                />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="order-summary-box" style={{ width: '100%', maxWidth: '380px', marginTop: 0 }}>
              <div className="order-summary-row">
                <span>Items Subtotal:</span>
                <strong>₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>

              <div className="order-summary-row">
                <span>Total Tax:</span>
                <span style={{ color: 'var(--color-danger)' }}>
                  + ₹ {finalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="order-summary-row" style={{ alignItems: 'center' }}>
                <span>Order Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="form-control"
                  style={{
                    width: '120px',
                    padding: '0.375rem 0.625rem',
                    textAlign: 'right',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div className="order-summary-row total-row">
                <span>Grand Total:</span>
                <span style={{ color: 'var(--color-primary)' }}>
                  ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="form-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.875rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/purchases')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : isEditMode ? (
              'Update Purchase Order'
            ) : (
              'Save Purchase Order'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseForm;