import React, { useState, useEffect } from 'react';
import {
  FiSearch,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';
import supplierService from '../../services/supplierService';
import SupplierForm from './SupplierForm';
import SupplierDetails from './SupplierDetails';
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
import './Suppliers.css';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsSupplier, setDetailsSupplier] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to load suppliers.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Metrics
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.status === 'Active').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'Inactive').length;

  // Filtering
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(s.supplierId || s.id || '').toLowerCase().includes(q) ||
      String(s.companyName || '').toLowerCase().includes(q) ||
      String(s.contactPerson || '').toLowerCase().includes(q) ||
      String(s.phone || '').toLowerCase().includes(q) ||
      String(s.email || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleOpenAdd = () => {
    setSelectedSupplier(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (supplier) => {
    setDetailsSupplier(supplier);
    setIsDetailsOpen(true);
  };

  const handleOpenDelete = (supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = async (supplier) => {
    try {
      const newStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
      await supplierService.toggleSupplierStatus(supplier.id);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? { ...s, status: newStatus } : s))
      );
      showToast(`Supplier status changed to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle supplier status', 'error');
    }
  };

  const handleSaveSupplier = async (formData) => {
    try {
      if (selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.id, formData);
        showToast(`Supplier "${formData.companyName}" updated successfully!`, 'success');
      } else {
        await supplierService.createSupplier(formData);
        showToast(`Supplier "${formData.companyName}" added successfully!`, 'success');
      }
      setIsFormOpen(false);
      await loadSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save supplier.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      setIsDeleting(true);
      await supplierService.deleteSupplier(supplierToDelete.id);
      showToast(`Supplier "${supplierToDelete.companyName}" deleted successfully.`, 'success');
      setIsDeleteOpen(false);
      setSupplierToDelete(null);
      await loadSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete supplier.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="suppliers-page">
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
        title="Suppliers"
        description="Manage vendor details, contact persons, tax numbers, and supply contracts."
        actionButton={
          <button
            type="button"
            id="supplier-add-btn"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            <FiPlus />
            <span>Add Supplier</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Suppliers"
          value={formatNumber(totalCount)}
          icon={FiTruck}
          variant="primary"
        />
        <KpiCard
          label="Active Suppliers"
          value={formatNumber(activeCount)}
          icon={FiCheckCircle}
          variant="success"
        />
        <KpiCard
          label="Inactive Suppliers"
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
            placeholder="Search suppliers by code, company, contact, or email..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-supplier-status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
              ariaLabel="Filter suppliers by status"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={loadSuppliers}
            title="Refresh supplier list"
            aria-label="Refresh supplier list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={FiTruck}
            title="No Suppliers Found"
            description="No suppliers registered yet. Click 'Add Supplier' to create your first partner profile."
            actionText="Add Supplier"
            onAction={handleOpenAdd}
          />
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Suppliers"
            description="No suppliers match your search filters."
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
                <col style={{ width: '110px' }} />
                <col className="col-flex" />
                <col style={{ width: '140px' }} className="col-hide-md" />
                <col style={{ width: '120px' }} className="col-hide-md" />
                <col style={{ width: '170px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '235px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left" style={{ width: '110px' }}>Supplier ID</th>
                  <th className="col-left">Company Name</th>
                  <th className="col-left col-hide-md" style={{ width: '140px' }}>Contact Person</th>
                  <th className="col-left col-hide-md" style={{ width: '120px' }}>Phone</th>
                  <th className="col-left col-sup-email" style={{ width: '170px' }}>Email</th>
                  <th className="col-left col-status col-sup-status" style={{ width: '120px' }}>Status</th>
                  <th className="col-actions col-sup-actions" style={{ width: '235px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="col-left col-code">
                      <ShortId prefix="SUP" id={supplier.id} />
                    </td>
                    <td className="col-left">
                      <strong className="item-name-cell" title={supplier.companyName}>{supplier.companyName}</strong>
                      {supplier.address && (
                        <div className="table-muted-mono cell-truncate-single" title={supplier.address}>
                          {supplier.address}
                        </div>
                      )}
                    </td>
                    <td className="col-left col-hide-md">
                      <span className="table-date">{formatOptional(supplier.contactPerson)}</span>
                    </td>
                    <td className="col-left col-hide-md">
                      <span className="table-phone">{supplier.phone}</span>
                    </td>
                    <td className="col-left col-email-cell col-sup-email">
                      <span className="cell-truncate-single" title={supplier.email || '—'}>{formatOptional(supplier.email)}</span>
                    </td>
                    <td className="col-left col-status col-sup-status">
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td className="col-actions col-sup-actions">
                      <TableActions
                        onView={() => handleOpenDetails(supplier)}
                        onEdit={() => handleOpenEdit(supplier)}
                        status={supplier.status}
                        onActivate={() => handleToggleStatus(supplier)}
                        onDeactivate={() => handleToggleStatus(supplier)}
                        onDelete={() => handleOpenDelete(supplier)}
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
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <ShortId prefix="SUP" id={supplier.id} />
                      <strong className="mobile-card-title" style={{ display: 'block', marginTop: '2px' }}>
                        {supplier.companyName}
                      </strong>
                    </div>
                    <StatusBadge status={supplier.status} />
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Contact Person</span>
                      <span className="mobile-card-value">{formatOptional(supplier.contactPerson)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Phone</span>
                      <span className="mobile-card-value">{supplier.phone}</span>
                    </div>
                    <div className="mobile-card-field col-span-2">
                      <span className="mobile-card-label">Email</span>
                      <span className="mobile-card-value">{formatOptional(supplier.email)}</span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => handleOpenDetails(supplier)}
                      onEdit={() => handleOpenEdit(supplier)}
                      status={supplier.status}
                      onActivate={() => handleToggleStatus(supplier)}
                      onDeactivate={() => handleToggleStatus(supplier)}
                      onDelete={() => handleOpenDelete(supplier)}
                      viewTitle="View Details"
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
        <SupplierForm
          isOpen={isFormOpen}
          supplier={selectedSupplier}
          onSave={handleSaveSupplier}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Supplier Details Modal */}
      {isDetailsOpen && (
        <SupplierDetails
          isOpen={isDetailsOpen}
          supplier={detailsSupplier}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier Record"
        message={`Are you sure you want to delete "${supplierToDelete?.companyName}"? This action cannot be undone.`}
        confirmText="Delete Supplier"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default Suppliers;
