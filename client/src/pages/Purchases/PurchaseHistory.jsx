import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiEye,
  FiShoppingBag,
  FiPlus,
  FiX,
  FiClipboard
} from 'react-icons/fi';
import purchaseService from '../../services/purchaseService';
import supplierService from '../../services/supplierService';
import Select from '../../components/Common/Select';
import SearchBar from '../../components/Common/SearchBar';
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

const PurchaseHistory = () => {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  // Purchases & Suppliers
  const [historyPurchases, setHistoryPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      purchaseService.getPurchases(),
      supplierService.getSuppliers().catch(() => [])
    ])
      .then(([purchasesData, suppliersData]) => {
        setHistoryPurchases(purchasesData || []);
        setSuppliers(suppliersData || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Filtering
  const filtered = historyPurchases.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(p.purchaseId || p.id || '').toLowerCase().includes(q) ||
      String(p.supplierName || '').toLowerCase().includes(q);

    const matchesSupplier =
      !supplierFilter ||
      p.supplierId === supplierFilter ||
      p.supplierName === supplierFilter;

    const matchesFrom =
      !dateFrom || (p.purchaseDate && p.purchaseDate >= dateFrom);
    const matchesTo = !dateTo || (p.purchaseDate && p.purchaseDate <= dateTo);

    const matchesPayment =
      paymentStatusFilter === 'All' ||
      p.paymentStatus?.toLowerCase() === paymentStatusFilter.toLowerCase();

    return (
      matchesSearch &&
      matchesSupplier &&
      matchesFrom &&
      matchesTo &&
      matchesPayment
    );
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setSupplierFilter('');
    setDateFrom('');
    setDateTo('');
    setPaymentStatusFilter('All');
  };

  const totalValue = filtered.reduce(
    (sum, p) => sum + Number(p.grandTotal || 0),
    0
  );
  const hasFilters =
    searchQuery ||
    supplierFilter ||
    dateFrom ||
    dateTo ||
    paymentStatusFilter !== 'All';

  return (
    <div className="purchases-page">
      {/* Page Header */}
      <div className="page-action-bar">
        <div className="page-heading">
          <h2>Purchase History</h2>
          <p>Audit and inspect historical procurement orders and billing details.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/purchases/new')}
        >
          <FiPlus />
          <span>New Purchase</span>
        </button>
      </div>

      {/* Summary Filter Strip */}
      {historyPurchases.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
            color: '#475569'
          }}
        >
          <span>
            Showing <strong>{filtered.length}</strong> of{' '}
            <strong>{historyPurchases.length}</strong> purchase orders
          </span>
          {filtered.length > 0 && (
            <span>
              Filtered Total:{' '}
              <strong style={{ color: 'var(--color-primary)' }}>
                {fmt(totalValue)}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* Filter Card */}
      <div className="filter-card">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search purchases"
        />

        <div className="filter-group">
          <div style={{ minWidth: "160px", flex: "1 1 160px" }}>
            <Select
              options={[
                { value: "", label: "All Suppliers" },
                ...suppliers.map((s) => ({ value: s.id || s._id, label: s.companyName }))
              ]}
              value={supplierFilter}
              onChange={setSupplierFilter}
              placeholder="Supplier"
              searchable={suppliers.length > 8}
            />
          </div>

          <input
            type="date"
            id="hist-from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="filter-date-input"
            title="From Date"
          />

          <input
            type="date"
            id="hist-to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="filter-date-input"
            title="To Date"
          />

          <div style={{ minWidth: "150px", flex: "1 1 150px" }}>
            <Select
              options={['All', 'Paid', 'Pending', 'Partial', 'Unpaid'].map((s) => ({
                value: s,
                label: s === 'All' ? 'All Statuses' : s
              }))}
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              placeholder="Payment Status"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
            >
              <FiX /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner spinner-primary"></div>
          </div>
        ) : (
          <table className="desktop-table-view">
            <thead>
              <tr>
                <th>Purchase ID</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Grand Total</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="item-id-cell">{p.purchaseId || p.id}</td>
                    <td>{p.purchaseDate || '—'}</td>
                    <td>
                      <div className="item-title-cell">{p.supplierName || '—'}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {(p.items || []).length} item(s)
                      </span>
                    </td>
                    <td>
                      <strong>{fmt(p.grandTotal)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getPaymentBadgeClass(p.paymentStatus)}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/purchases/${p.id}`)}
                        >
                          <FiEye /> View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="state-message-card">
                      <div className="state-message-icon">
                        {hasFilters ? <FiSearch /> : <FiClipboard />}
                      </div>
                      <div className="state-message-title">
                        {hasFilters
                          ? 'No matching purchases found'
                          : 'No purchase history yet'}
                      </div>
                      <div className="state-message-desc">
                        {hasFilters
                          ? 'Try adjusting the filters above.'
                          : 'Purchases will appear here once created.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card List View (< 768px) */}
      <div className="mobile-card-list">
        {filtered.length > 0 ? (
          filtered.map((p) => (
            <div key={p.id} className="mobile-data-card">
              <div className="mobile-data-card-header">
                <div>
                  <div className="item-id-cell">{p.purchaseId || p.id}</div>
                  <div className="mobile-data-card-title">{p.supplierName || '—'}</div>
                </div>
                <span className={`badge ${getPaymentBadgeClass(p.paymentStatus)}`}>
                  {p.paymentStatus}
                </span>
              </div>
              <div className="mobile-data-card-meta">
                <div className="meta-row">
                  <span>Date:</span>
                  <span>{p.purchaseDate || '—'}</span>
                </div>
                <div className="meta-row">
                  <span>Items:</span>
                  <span>{(p.items || []).length} item(s)</span>
                </div>
                <div className="meta-row">
                  <span>Total:</span>
                  <strong>{fmt(p.grandTotal)}</strong>
                </div>
              </div>
              <div className="mobile-data-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/purchases/${p.id}`)}
                >
                  <FiEye /> View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="state-message-card">
            <div className="state-message-icon">
              <FiShoppingBag />
            </div>
            <div className="state-message-title">No purchases found</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistory;
