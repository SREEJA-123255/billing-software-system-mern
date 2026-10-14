import React, { useState, useEffect } from 'react';
import Modal from '../../components/Common/Modal';
import Select from '../../components/Common/Select';

const EMPTY_FORM = {
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  status: 'Active'
};

const SupplierForm = ({ isOpen = true, onClose, onSave, supplier }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Populate form when editing; reset for new supplier
  useEffect(() => {
    if (supplier) {
      setFormData({
        companyName:   supplier.companyName   || '',
        contactPerson: supplier.contactPerson || '',
        phone:         supplier.phone         || '',
        email:         supplier.email         || '',
        address:       supplier.address       || '',
        gstNumber:     supplier.gstNumber     || '',
        status:        supplier.status        || 'Active'
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [supplier, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.companyName.trim())
      newErrors.companyName = 'Company Name is required';

    if (!formData.contactPerson.trim())
      newErrors.contactPerson = 'Contact Person is required';

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

    if (!formData.address.trim())
      newErrors.address = 'Address is required';

    if (formData.gstNumber && formData.gstNumber.trim().length > 0) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.gstNumber.trim())) {
        newErrors.gstNumber = 'Format should be like 29AAAAA0000A1Z5';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Edit Supplier' : 'Add New Supplier'}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid-2">
          {/* Company Name */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required" htmlFor="sup-companyName">
              Company Name
            </label>
            <input
              type="text"
              id="sup-companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="e.g. Sharma Traders Pvt Ltd"
              className={`form-control ${errors.companyName ? 'is-invalid' : ''}`}
            />
            {errors.companyName && <span className="form-error">{errors.companyName}</span>}
          </div>

          {/* Contact Person */}
          <div className="form-group">
            <label className="form-label required" htmlFor="sup-contactPerson">
              Contact Person
            </label>
            <input
              type="text"
              id="sup-contactPerson"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="e.g. Ramesh Sharma"
              className={`form-control ${errors.contactPerson ? 'is-invalid' : ''}`}
            />
            {errors.contactPerson && <span className="form-error">{errors.contactPerson}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label required" htmlFor="sup-phone">
              Phone
            </label>
            <input
              type="text"
              id="sup-phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
            />
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </div>

          {/* Email */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required" htmlFor="sup-email">
              Email
            </label>
            <input
              type="email"
              id="sup-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="supplier@company.com"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {/* Address */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required" htmlFor="sup-address">
              Address
            </label>
            <textarea
              id="sup-address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, Area, City, State, PIN"
              className={`form-control ${errors.address ? 'is-invalid' : ''}`}
              rows="3"
            />
            {errors.address && <span className="form-error">{errors.address}</span>}
          </div>

          {/* GST Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="sup-gstNumber">
              GST Number (Optional)
            </label>
            <input
              type="text"
              id="sup-gstNumber"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              placeholder="29AAAAA0000A1Z5"
              className={`form-control ${errors.gstNumber ? 'is-invalid' : ''}`}
            />
            {errors.gstNumber && <span className="form-error">{errors.gstNumber}</span>}
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label" htmlFor="sup-status">
              Status
            </label>
            <Select
              id="sup-status"
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
            {supplier ? 'Update Supplier' : 'Save Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierForm;
