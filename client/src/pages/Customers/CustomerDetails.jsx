import React, { useState, useEffect } from 'react';
import { FiShoppingBag } from 'react-icons/fi';
import Modal from '../../components/Common/Modal';
import customerService from '../../services/customerService';
import '../Purchases/Purchases.css';

export const CustomerDetails = ({ isOpen = true, onClose, customer }) => {
  const [history, setHistory] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && customer?.id) {
      setLoading(true);
      setError(null);

      customerService
        .getCustomerHistory(customer.id)
        .then((res) => {
          setHistory(res.purchases || []);
          setTotalSpent(res.totalAmount || 0);
          setHistoryCount(res.count || 0);
        })
        .catch((err) => {
          console.error('Failed to load customer history:', err);
          setError('Failed to fetch purchase history.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setHistory([]);
      setTotalSpent(0);
      setHistoryCount(0);
      setError(null);
    }
  }, [isOpen, customer?.id]);

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Profile & Purchase History"
      maxWidth="680px"
    >
      <div className="profile-detail-grid">
        <div className="profile-detail-item">
          <span className="profile-detail-label">Customer ID</span>
          <span className="profile-detail-value" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>
            {customer.id}
          </span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Status</span>
          <div>
            <span className={`badge ${customer.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
              <span className="badge-dot"></span>
              {customer.status}
            </span>
          </div>
        </div>

        <div className="profile-detail-item full-width">
          <span className="profile-detail-label">Full Name</span>
          <span className="profile-detail-value" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {customer.name}
          </span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Phone</span>
          <span className="profile-detail-value">{customer.phone}</span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Email</span>
          <span className="profile-detail-value">{customer.email || 'N/A'}</span>
        </div>

        <div className="profile-detail-item full-width">
          <span className="profile-detail-label">Address</span>
          <span className="profile-detail-value">{customer.address || 'N/A'}</span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">GST Number</span>
          <span className="profile-detail-value">
            {customer.gstNumber ? (
              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                {customer.gstNumber}
              </code>
            ) : (
              'Not Provided (Consumer)'
            )}
          </span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Total Spend</span>
          <span className="profile-detail-value" style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: '1.1rem' }}>
            {loading ? 'Calculating...' : `₹ ${Number(totalSpent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>

      {/* Purchase History Section */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a' }}>
            <FiShoppingBag /> Customer Purchase History
            <span style={{ fontSize: '0.75rem', background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {historyCount} record{historyCount === 1 ? '' : 's'}
            </span>
          </h4>
        </div>

        {loading ? (
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
            Loading purchase history...
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        ) : history.length > 0 ? (
          <div className="items-table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <table className="desktop-table-view" style={{ fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th>Purchase ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="item-id-cell">
                      {item.purchaseId || item.id}
                    </td>
                    <td>{item.purchaseDate || 'N/A'}</td>
                    <td>{item.items?.length || 1} item(s)</td>
                    <td style={{ fontWeight: 600 }}>
                      ₹ {Number(item.totalAmount || item.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${item.paymentStatus === 'Paid' ? 'badge-active' : 'badge-payment-pending'}`}>
                        {item.paymentStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
            No purchase history found for this customer yet.
          </div>
        )}
      </div>

      <div className="modal-footer-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close Profile
        </button>
      </div>
    </Modal>
  );
};

export default CustomerDetails;