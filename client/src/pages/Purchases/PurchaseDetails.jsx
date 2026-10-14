import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSearch, FiEdit2, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import purchaseService from '../../services/purchaseService';
import './Purchases.css';

const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const getPaymentBadgeClass = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'badge-payment-paid';
  if (s === 'pending') return 'badge-payment-pending';
  if (s === 'partial') return 'badge-payment-partial';
  return 'badge-payment-unpaid';
};

const PurchaseDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    purchaseService
      .getPurchaseById(id)
      .then((data) => {
        if (data) {
          setPurchase(data);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load purchase details:', err);
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Not found state
  if (notFound) {
    return (
      <div className="purchases-page">
        <div className="state-message-card" style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="state-message-icon">
            <FiSearch />
          </div>
          <div className="state-message-title">Purchase Not Found</div>
          <div className="state-message-desc">
            The purchase order you are looking for does not exist or may have been deleted.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => navigate('/purchases')}
          >
            <FiArrowLeft /> Back to Purchases
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !purchase) {
    return (
      <div className="purchases-page">
        <div className="state-message-card" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-primary" style={{ width: '2.5rem', height: '2.5rem' }}></div>
          <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Loading purchase details...</p>
        </div>
      </div>
    );
  }

  const items = purchase.items || [];

  return (
    <div className="purchases-page">
      {/* Page Header */}
      <div className="page-action-bar">
        <div className="page-heading">
          <h2>Purchase Details</h2>
          <p>
            Invoice-style overview for purchase order{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {purchase.purchaseId || purchase.id}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/purchases')}
          >
            <FiArrowLeft />
            <span>Back</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/purchases/${purchase.id}/edit`)}
          >
            <FiEdit2 />
            <span>Edit Order</span>
          </button>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="card" style={{ padding: '1.75rem' }}>
        {/* Invoice Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              className="stat-icon-wrapper stat-icon-primary"
              style={{ width: '44px', height: '44px' }}
            >
              <FiShoppingBag size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Purchase Order
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Procurement & Inward Stock Voucher
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                Order ID
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                {purchase.purchaseId || purchase.id}
              </span>
            </div>
            <span
              className={`badge ${getPaymentBadgeClass(purchase.paymentStatus)}`}
              style={{ fontSize: '0.875rem', padding: '0.35rem 0.875rem' }}
            >
              {purchase.paymentStatus}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="profile-detail-grid" style={{ marginBottom: '1.75rem' }}>
          <div className="profile-detail-item">
            <span className="profile-detail-label">Purchase Date</span>
            <span className="profile-detail-value">{purchase.purchaseDate || '—'}</span>
          </div>

          <div className="profile-detail-item">
            <span className="profile-detail-label">Supplier Name</span>
            <span className="profile-detail-value" style={{ fontWeight: 700 }}>
              {purchase.supplierName || '—'}
            </span>
            {purchase.supplierId && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                {purchase.supplierId}
              </span>
            )}
          </div>

          <div className="profile-detail-item">
            <span className="profile-detail-label">Total Line Items</span>
            <span className="profile-detail-value">{items.length} item(s)</span>
          </div>

          <div className="profile-detail-item">
            <span className="profile-detail-label">Created At</span>
            <span className="profile-detail-value">
              {purchase.createdAt
                ? new Date(purchase.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : '—'}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h4
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '0.875rem'
            }}
          >
            Order Items
          </h4>
          <div className="items-table-wrapper desktop-only">
            <table className="desktop-table-view">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>#</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Purchase Price</th>
                  <th>Tax (%)</th>
                  <th>Discount (%)</th>
                  <th>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div className="item-title-cell">{item.productName || '—'}</div>
                        {item.productId && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                            {item.productId}
                          </div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{fmt(item.purchasePrice)}</td>
                      <td>{Number(item.tax || 0).toFixed(1)}%</td>
                      <td>{Number(item.discount || 0).toFixed(1)}%</td>
                      <td>{fmt(item.subtotal)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{fmt(item.total)}</strong>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No line items in this purchase order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Items View (< 768px) */}
          <div className="mobile-items-view">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} className="purchase-line-card">
                  <div className="purchase-line-card-header">
                    <div>
                      <strong className="mobile-card-title">{item.productName || '—'}</strong>
                      {item.productId && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                          {item.productId}
                        </div>
                      )}
                    </div>
                    <span className="purchase-line-badge">Item #{idx + 1}</span>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Quantity</span>
                      <span className="mobile-card-value">{item.quantity}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Purchase Price</span>
                      <span className="mobile-card-value">{fmt(item.purchasePrice)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Tax</span>
                      <span className="mobile-card-value">{Number(item.tax || 0).toFixed(1)}%</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Line Total</span>
                      <strong className="mobile-card-value">{fmt(item.total)}</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                No line items in this purchase order.
              </div>
            )}
          </div>
        </div>

        {/* Footer Notes & Summary Totals */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.5rem',
            paddingTop: '1rem'
          }}
        >
          {purchase.notes ? (
            <div style={{ flex: 1, minWidth: '240px' }}>
              <span className="profile-detail-label">Notes & Remarks</span>
              <p
                style={{
                  marginTop: '0.35rem',
                  fontSize: '0.875rem',
                  color: '#475569',
                  background: '#f8fafc',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.5
                }}
              >
                {purchase.notes}
              </p>
            </div>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}

          <div className="order-summary-box" style={{ width: '100%', maxWidth: '380px', marginTop: 0 }}>
            <div className="order-summary-row">
              <span>Subtotal:</span>
              <span>{fmt(purchase.subtotal)}</span>
            </div>
            <div className="order-summary-row">
              <span>Tax Amount:</span>
              <span style={{ color: 'var(--color-danger)' }}>+ {fmt(purchase.taxAmount)}</span>
            </div>
            <div className="order-summary-row">
              <span>Discount:</span>
              <span style={{ color: 'var(--color-success)' }}>− {fmt(purchase.discountAmount)}</span>
            </div>
            <div className="order-summary-row total-row">
              <span>Grand Total:</span>
              <span style={{ color: 'var(--color-primary)' }}>{fmt(purchase.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetails;
