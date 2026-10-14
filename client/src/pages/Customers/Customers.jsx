import React, { useState, useEffect } from 'react';
import {
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';
import customerService from '../../services/customerService';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import Toast from '../../components/Common/Toast';
import Select from '../../components/Common/Select';
import SearchBar from '../../components/Common/SearchBar';
import PageHeader from '../../components/Common/PageHeader';
import { KpiGrid, KpiCard } from '../../components/Common/KpiCard';
import TableActions from '../../components/Common/TableActions';
import ShortId from '../../components/Common/ShortId';
import StatusBadge from '../../components/Common/StatusBadge';
import EmptyState from '../../components/Common/EmptyState';
import { SkeletonTable } from '../../components/Common/Skeleton';
import { formatNumber, formatOptional } from '../../utils/formatters';
import '../Purchases/Purchases.css';
import './Customers.css';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load customer data
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerService.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to load customers.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Metrics
  const totalCount = customers.length;
  const activeCount = customers.filter((c) => c.status === 'Active').length;
  const inactiveCount = customers.filter((c) => c.status === 'Inactive').length;

  // Real-time filtering
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q) ||
      String(c.email || '').toLowerCase().includes(q) ||
      String(c.gstNumber || '').toLowerCase().includes(q) ||
      String(c.id || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (customer) => {
    setDetailsCustomer(customer);
    setIsDetailsOpen(true);
  };

  const handleOpenDelete = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = async (customer) => {
    try {
      await customerService.toggleCustomerStatus(customer.id);
      await loadCustomers();
      const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
      showToast(`Customer status updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle status.', 'error');
    }
  };

  const handleSaveCustomer = async (formData) => {
    try {
      if (selectedCustomer) {
        await customerService.updateCustomer(selectedCustomer.id, formData);
        showToast(`Customer "${formData.name}" updated successfully!`, 'success');
      } else {
        await customerService.createCustomer(formData);
        showToast(`Customer "${formData.name}" created successfully!`, 'success');
      }
      setIsFormOpen(false);
      await loadCustomers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save customer.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      setIsDeleting(true);
      await customerService.deleteCustomer(customerToDelete.id);
      showToast(`Customer "${customerToDelete.name}" deleted.`, 'success');
      setIsDeleteOpen(false);
      setCustomerToDelete(null);
      await loadCustomers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete customer.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="customers-page">
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Customers"
        description="Manage customer accounts, contact details, GST numbers, and order histories."
        actionButton={
          <button
            type="button"
            id="customer-add-btn"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            <FiPlus />
            <span>Add Customer</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Customers"
          value={formatNumber(totalCount)}
          icon={FiUsers}
          variant="primary"
        />
        <KpiCard
          label="Active Customers"
          value={formatNumber(activeCount)}
          icon={FiCheckCircle}
          variant="success"
        />
        <KpiCard
          label="Inactive Customers"
          value={formatNumber(inactiveCount)}
          icon={FiXCircle}
          variant="neutral"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search customers by code, name, phone, email, or GST..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-customer-status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
              ariaLabel="Filter customers by status"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={loadCustomers}
            title="Refresh customer list"
            aria-label="Refresh customer list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="No Customers Found"
            description="No customers have been registered yet. Click 'Add Customer' to create one."
            actionText="Add Customer"
            onAction={handleOpenAdd}
          />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Customers"
            description="No customers match your search criteria."
            actionText="Clear Filters"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('All');
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} className="col-hide-md" />
                <col style={{ width: '17%' }} />
                <col style={{ width: '13%' }} className="col-hide-md" />
                <col style={{ width: '12%' }} />
                <col style={{ width: '19%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-cus-code" style={{ width: '10%' }}>Customer ID</th>
                  <th className="col-left col-cus-details" style={{ width: '18%' }}>Customer Details</th>
                  <th className="col-left col-cus-phone col-hide-md" style={{ width: '11%' }}>Phone</th>
                  <th className="col-left col-cus-email" style={{ width: '17%' }}>Email</th>
                  <th className="col-left col-cus-gst col-hide-md" style={{ width: '13%' }}>GST Number</th>
                  <th className="col-left col-cus-status" style={{ width: '12%' }}>Status</th>
                  <th className="col-actions col-cus-actions" style={{ width: '19%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="col-left col-code col-cus-code">
                      <ShortId prefix="CUS" id={customer.id} />
                    </td>
                    <td className="col-left col-details-cell col-cus-details">
                      <strong className="item-name-cell" title={customer.name}>{customer.name}</strong>
                      {customer.address && (
                        <div className="table-muted-mono cell-truncate-single" title={customer.address} style={{ marginTop: '2px', fontSize: '0.75rem', color: '#64748b' }}>
                          {customer.address}
                        </div>
                      )}
                    </td>
                    <td className="col-left col-hide-md col-cus-phone">
                      <span className="table-phone">{customer.phone}</span>
                    </td>
                    <td className="col-left col-email-cell col-cus-email">
                      <span className="cell-truncate-single" title={customer.email || '—'}>{formatOptional(customer.email)}</span>
                    </td>
                    <td className="col-left col-hide-md col-gst-cell col-cus-gst">
                      <span className="table-gst">{formatOptional(customer.gstNumber)}</span>
                    </td>
                    <td className="col-left col-status col-cus-status">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="col-actions col-cus-actions">
                      <TableActions
                        onView={() => handleOpenDetails(customer)}
                        onEdit={() => handleOpenEdit(customer)}
                        status={customer.status}
                        onActivate={() => handleToggleStatus(customer)}
                        onDeactivate={() => handleToggleStatus(customer)}
                        onDelete={() => handleOpenDelete(customer)}
                        viewTitle="View"
                        editTitle="Edit"
                        activateTitle="Activate"
                        deactivateTitle="Deactivate"
                        deleteTitle="Delete"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards View (< 768px) */}
            <div className="universal-mobile-cards">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <ShortId prefix="CUS" id={customer.id} />
                      <strong className="mobile-card-title" style={{ display: 'block', marginTop: '2px' }}>
                        {customer.name}
                      </strong>
                    </div>
                    <StatusBadge status={customer.status} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Phone</span>
                      <span className="mobile-card-value">{customer.phone}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Email</span>
                      <span className="mobile-card-value">{formatOptional(customer.email)}</span>
                    </div>
                    <div className="mobile-card-field col-span-2">
                      <span className="mobile-card-label">GST Number</span>
                      <span className="mobile-card-value">{formatOptional(customer.gstNumber)}</span>
                    </div>
                    {customer.address && (
                      <div className="mobile-card-field col-span-2">
                        <span className="mobile-card-label">Address</span>
                        <span className="mobile-card-value">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => handleOpenDetails(customer)}
                      onEdit={() => handleOpenEdit(customer)}
                      status={customer.status}
                      onActivate={() => handleToggleStatus(customer)}
                      onDeactivate={() => handleToggleStatus(customer)}
                      onDelete={() => handleOpenDelete(customer)}
                      viewTitle="View History"
                      editTitle="Edit"
                      activateTitle="Activate"
                      deactivateTitle="Deactivate"
                      deleteTitle="Delete"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <CustomerForm
          isOpen={isFormOpen}
          customer={selectedCustomer}
          onSave={handleSaveCustomer}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Details / History Modal */}
      {isDetailsOpen && (
        <CustomerDetails
          isOpen={isDetailsOpen}
          customer={detailsCustomer}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Customer Record"
        message={`Are you sure you want to delete customer "${customerToDelete?.name}"? This action cannot be reversed.`}
        confirmText="Delete Customer"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default Customers;
