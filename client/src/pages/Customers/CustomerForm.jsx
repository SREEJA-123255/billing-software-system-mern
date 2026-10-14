import React, { useState, useEffect } from 'react';
import Modal from '../../components/Common/Modal';
import Select from '../../components/Common/Select';

export const CustomerForm = ({ isOpen = true, onClose, onSave, customer, isQuickAdd = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    status: 'Active'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        gstNumber: customer.gstNumber || '',
        status: customer.status || 'Active'
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
        status: 'Active'
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Customer Name is required';
    }

    if (!isQuickAdd) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone Number is required';
      } else if (!/^(?:\+\d{1,3}[\s-]?)?(?:[0-9]{10}|[0-9]{5}[\s-][0-9]{5})$/.test(formData.phone.trim())) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email Address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = 'Enter a valid email address';
      }

      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
    } else {
      if (formData.phone && formData.phone.trim()) {
        if (!/^(?:\+\d{1,3}[\s-]?)?(?:[0-9]{10}|[0-9]{5}[\s-][0-9]{5})$/.test(formData.phone.trim())) {
          newErrors.phone = 'Phone number must be 10 digits';
        }
      }
      if (formData.email && formData.email.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
          newErrors.email = 'Enter a valid email address';
        }
      }
    }

    if (formData.gstNumber && formData.gstNumber.trim().length > 0) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.gstNumber.trim())) {
        newErrors.gstNumber = 'Format should be like 36ABCDE1234F1Z5';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : (isQuickAdd ? 'Add New Customer (Quick)' : 'Add New Customer')}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid-2">
          {/* Customer Name */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required" htmlFor="customer-name">
              Customer Name
            </label>
            <input
              type="text"
              id="customer-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Ravi Kumar"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className={`form-label ${isQuickAdd ? '' : 'required'}`} htmlFor="customer-phone">
              Phone Number {isQuickAdd && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>}
            </label>
            <input
              type="text"
              id="customer-phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
            />
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className={`form-label ${isQuickAdd ? '' : 'required'}`} htmlFor="customer-email">
              Email Address {isQuickAdd && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>}
            </label>
            <input
              type="email"
              id="customer-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ravi@gmail.com"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {/* Address */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className={`form-label ${isQuickAdd ? '' : 'required'}`} htmlFor="customer-address">
              Address {isQuickAdd && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>}
            </label>
            <textarea
              id="customer-address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="House/Street, Area, City, State"
              className={`form-control ${errors.address ? 'is-invalid' : ''}`}
              rows="3"
            />
            {errors.address && <span className="form-error">{errors.address}</span>}
          </div>

          {/* GST Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="customer-gstNumber">
              GST Number (Optional)
            </label>
            <input
              type="text"
              id="customer-gstNumber"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              placeholder="36ABCDE1234F1Z5"
              className={`form-control ${errors.gstNumber ? 'is-invalid' : ''}`}
            />
            {errors.gstNumber && <span className="form-error">{errors.gstNumber}</span>}
          </div>

          {/* Account Status */}
          <div className="form-group">
            <label className="form-label" htmlFor="customer-status">
              Account Status
            </label>
            <Select
              id="customer-status"
              name="status"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" }
              ]}
              value={formData.status}
              onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
            />
          </div>
        </div>

        <div className="modal-footer-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {customer ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerForm;
