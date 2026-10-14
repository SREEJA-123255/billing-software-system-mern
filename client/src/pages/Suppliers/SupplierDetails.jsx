import React from 'react';
import Modal from '../../components/Common/Modal';
import '../Purchases/Purchases.css';

const SupplierDetails = ({ isOpen = true, onClose, supplier }) => {
  if (!supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Profile"
      maxWidth="560px"
    >
      <div className="profile-detail-grid">
        <div className="profile-detail-item">
          <span className="profile-detail-label">Supplier ID</span>
          <span className="profile-detail-value" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>
            {supplier.supplierId || supplier.id}
          </span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Status</span>
          <div>
            <span className={`badge ${supplier.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
              <span className="badge-dot"></span>
              {supplier.status}
            </span>
          </div>
        </div>

        <div className="profile-detail-item full-width">
          <span className="profile-detail-label">Company Name</span>
          <span className="profile-detail-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {supplier.companyName}
          </span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Contact Person</span>
          <span className="profile-detail-value">{supplier.contactPerson}</span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Phone</span>
          <span className="profile-detail-value">{supplier.phone}</span>
        </div>

        <div className="profile-detail-item full-width">
          <span className="profile-detail-label">Email</span>
          <span className="profile-detail-value">{supplier.email || 'N/A'}</span>
        </div>

        <div className="profile-detail-item full-width">
          <span className="profile-detail-label">Address</span>
          <span className="profile-detail-value">{supplier.address}</span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">GST Number</span>
          <span className="profile-detail-value">
            {supplier.gstNumber ? (
              <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                {supplier.gstNumber}
              </code>
            ) : (
              'Not Provided'
            )}
          </span>
        </div>

        <div className="profile-detail-item">
          <span className="profile-detail-label">Member Since</span>
          <span className="profile-detail-value">{supplier.createdAt || '—'}</span>
        </div>
      </div>

      <div className="modal-footer-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};

export default SupplierDetails;
