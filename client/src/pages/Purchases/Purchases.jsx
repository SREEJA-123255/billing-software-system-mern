import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiShoppingBag,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import Toast from '../../components/Common/Toast';
import Select from '../../components/Common/Select';
import SearchBar from '../../components/Common/SearchBar';
import StatusBadge from '../../components/Common/StatusBadge';
import PageHeader from '../../components/Common/PageHeader';
import { KpiGrid, KpiCard } from '../../components/Common/KpiCard';
import TableActions from '../../components/Common/TableActions';
import ShortId from '../../components/Common/ShortId';
import { SkeletonTable } from '../../components/Common/Skeleton';
import EmptyState from '../../components/Common/EmptyState';
import QuantityCell from '../../components/Common/QuantityCell';
import {
  formatCurrency,
  formatKpiCurrency,
  formatNumber,
  formatDate,
  formatOptional
} from '../../utils/formatters';
import purchaseService from '../../services/purchaseService';
import supplierService from '../../services/supplierService';
import './Purchases.css';

const PAYMENT_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Partial', label: 'Partially Paid' }
];

const Purchases = () => {
  const navigate = useNavigate();

  // State
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deactivateDialog, setDeactivateDialog] = useState({
    isOpen: false,
    purchase: null,
    loading: false
  });

  // Load purchases
  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await purchaseService.getPurchases();
      setPurchases(data || []);
    } catch (err) {
      console.error('Failed to load purchases:', err);
      setError(
        err.response?.data?.message ||
          'Unable to load purchases. Please make sure the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setSuppliers([]);
    }
  };

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Filtering & Sorting (Latest updated / created on top)
  const filteredPurchases = purchases
    .filter((purchase) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(purchase.purchaseId || purchase.id || '')
          .toLowerCase()
          .includes(q) ||
        String(purchase.supplierName || '')
          .toLowerCase()
          .includes(q);

      const matchesSupplier =
        !supplierFilter ||
        purchase.supplierId === supplierFilter ||
        purchase.supplierName === supplierFilter;

      const matchesPaymentStatus =
        paymentStatusFilter === 'All' ||
        String(purchase.paymentStatus || '').toLowerCase() === paymentStatusFilter.toLowerCase();

      return matchesSearch && matchesSupplier && matchesPaymentStatus;
    })
    .sort((a, b) => {
      const getCreatedTime = (p) => {
        if (p.createdAt) return new Date(p.createdAt).getTime();
        if (p.purchaseDate) return new Date(p.purchaseDate).getTime();
        if (p.id && typeof p.id === 'string' && p.id.length === 24) {
          return parseInt(p.id.substring(0, 8), 16) * 1000;
        }
        if (p._id && typeof p._id === 'string' && p._id.length === 24) {
          return parseInt(p._id.substring(0, 8), 16) * 1000;
        }
        return 0;
      };
      const timeA = getCreatedTime(a);
      const timeB = getCreatedTime(b);
      if (timeB !== timeA) return timeB - timeA;
      return String(b.purchaseId || '').localeCompare(String(a.purchaseId || ''));
    });

  // Metrics
  const totalCount = purchases.length;
  const totalValue = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.grandTotal || 0),
    0
  );
  const paidCount = purchases.filter(
    (purchase) => String(purchase.paymentStatus || '').toLowerCase() === 'paid'
  ).length;
  const unsettledCount = purchases.filter(
    (purchase) => String(purchase.paymentStatus || '').toLowerCase() !== 'paid'
  ).length;

  const handleOpenDelete = (purchase) => {
    setPurchaseToDelete(purchase);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return;
    try {
      setIsDeleting(true);
      await purchaseService.deletePurchase(purchaseToDelete.id || purchaseToDelete._id);
      showToast('Purchase order deleted successfully.', 'success');
      setIsDeleteOpen(false);
      setPurchaseToDelete(null);
      await loadPurchases();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete purchase order.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const promptDeactivate = (purchase) => {
    setDeactivateDialog({
      isOpen: true,
      purchase,
      loading: false
    });
  };

  const handleConfirmDeactivate = async () => {
    const purchase = deactivateDialog.purchase;
    if (!purchase) return;
    try {
      setDeactivateDialog((prev) => ({ ...prev, loading: true }));
      await purchaseService.updatePurchaseStatus(purchase.id || purchase._id, 'INACTIVE');
      showToast(`Purchase order "${purchase.purchaseId || purchase.id}" deactivated successfully.`, 'success');
      setDeactivateDialog({ isOpen: false, purchase: null, loading: false });
      await loadPurchases();
    } catch (err) {
      console.error('Deactivate purchase error:', err);
      showToast(err.response?.data?.message || 'Failed to deactivate purchase order.', 'error');
      setDeactivateDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleActivatePurchase = async (purchase) => {
    try {
      await purchaseService.updatePurchaseStatus(purchase.id || purchase._id, 'ACTIVE');
      showToast(`Purchase order "${purchase.purchaseId || purchase.id}" activated successfully.`, 'success');
      await loadPurchases();
    } catch (err) {
      console.error('Activate purchase error:', err);
      showToast(err.response?.data?.message || 'Failed to activate purchase order.', 'error');
    }
  };

  return (
    <div className="purchases-page">
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
        title="Purchases"
        description="Record supplier inventory receipts, track purchase costs, and pay invoices."
        actionButton={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/purchases/new')}
            id="btn-new-purchase"
          >
            <FiPlus />
            <span>New Purchase</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Total Purchases"
          value={formatNumber(totalCount)}
          icon={FiShoppingBag}
          variant="primary"
        />
        <KpiCard
          label="Purchase Expenditure"
          value={formatKpiCurrency(totalValue)}
          icon={FiDollarSign}
          variant="success"
        />
        <KpiCard
          label="Paid Orders"
          value={formatNumber(paidCount)}
          icon={FiCheckCircle}
          variant="blue"
        />
        <KpiCard
          label="Pending / Unsettled"
          value={formatNumber(unsettledCount)}
          icon={FiClock}
          variant="warning"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card purchases-filter-card">
        <div className="filter-row-top">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search purchases by order ID or supplier name..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-supplier">
            <Select
              id="filter-purchase-supplier"
              options={[
                { value: '', label: 'All Suppliers' },
                ...suppliers.map((s) => ({ value: s.id, label: s.companyName }))
              ]}
              value={supplierFilter}
              onChange={setSupplierFilter}
              placeholder="Supplier"
              ariaLabel="Filter purchases by supplier"
              searchable={suppliers.length > 8}
            />
          </div>

          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-purchase-status"
              options={PAYMENT_STATUS_OPTIONS}
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              placeholder="Status"
              ariaLabel="Filter purchases by status"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={() => {
              loadPurchases();
              loadSuppliers();
            }}
            title="Refresh purchases"
            aria-label="Refresh purchases list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '24px' }}>
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadPurchases}>
            Retry
          </button>
        </div>
      )}

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={FiShoppingBag}
            title="No Purchases Recorded"
            description="Create your first stock replenishment purchase order."
            actionText="New Purchase"
            onAction={() => navigate('/purchases/new')}
          />
        ) : filteredPurchases.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No Matching Purchases"
            description="No purchase records match your search criteria."
            actionText="Clear Filters"
            onAction={() => {
              setSearchQuery('');
              setSupplierFilter('');
              setPaymentStatusFilter('All');
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table">
              <colgroup>
                <col style={{ width: '13%' }} />
                <col style={{ width: '11%' }} className="col-hide-md" />
                <col style={{ width: '21%' }} />
                <col style={{ width: '8%' }} className="col-hide-md" />
                <col style={{ width: '13%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-left col-purchase-id" style={{ width: '13%' }}>Order ID</th>
                  <th className="col-left col-date col-hide-md" style={{ width: '11%' }}>Date</th>
                  <th className="col-left col-supplier" style={{ width: '21%' }}>Supplier</th>
                  <th className="col-right col-items col-hide-md" style={{ width: '8%' }}>Items</th>
                  <th className="col-right col-total" style={{ width: '13%' }}>Grand Total</th>
                  <th className="col-left col-status" style={{ width: '12%' }}>Status</th>
                  <th className="col-actions" style={{ width: '22%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id || purchase._id}>
                    <td className="col-left col-code col-purchase-id">
                      <span className="table-id-badge" style={{ cursor: 'pointer' }} onClick={() => navigate(`/purchases/${purchase.id || purchase._id}`)}>
                        {purchase.purchaseId || purchase.id || purchase._id}
                      </span>
                    </td>
                    <td className="col-left col-date col-hide-md">
                      <span className="table-date">{formatDate(purchase.purchaseDate)}</span>
                    </td>
                    <td className="col-left col-supplier">
                      <strong className="item-name-cell" title={purchase.supplierName}>
                        {formatOptional(purchase.supplierName)}
                      </strong>
                    </td>
                    <td className="col-right col-number col-items col-hide-md">
                      <QuantityCell quantity={purchase.items?.length || 0} />
                    </td>
                    <td className="col-right col-money col-total">
                      <span className="table-amount">{formatCurrency(purchase.grandTotal)}</span>
                    </td>
                    <td className="col-left col-status">
                      {purchase.status === 'INACTIVE' ? (
                        <StatusBadge status="INACTIVE" />
                      ) : (
                        <StatusBadge status={purchase.paymentStatus} />
                      )}
                    </td>
                    <td className="col-actions">
                      <TableActions
                        onView={() => navigate(`/purchases/${purchase.id || purchase._id}`)}
                        onEdit={() => navigate(`/purchases/${purchase.id || purchase._id}/edit`)}
                        status={purchase.status || 'ACTIVE'}
                        onActivate={() => handleActivatePurchase(purchase)}
                        onDeactivate={() => promptDeactivate(purchase)}
                        onDelete={() => handleOpenDelete(purchase)}
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
              {filteredPurchases.map((purchase) => (
                <div key={purchase.id || purchase._id} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <span className="table-id-badge">{purchase.purchaseId || purchase.id}</span>
                      <strong className="mobile-card-title" style={{ display: 'block', marginTop: '2px' }}>
                        {formatOptional(purchase.supplierName)}
                      </strong>
                    </div>
                    {purchase.status === 'INACTIVE' ? (
                      <StatusBadge status="INACTIVE" />
                    ) : (
                      <StatusBadge status={purchase.paymentStatus} />
                    )}
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Order Date</span>
                      <span className="mobile-card-value">{formatDate(purchase.purchaseDate)}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Items Count</span>
                      <span className="mobile-card-value">{formatNumber(purchase.items?.length || 0)} items</span>
                    </div>
                    <div className="mobile-card-field col-span-2">
                      <span className="mobile-card-label">Grand Total</span>
                      <strong className="mobile-card-value" style={{ color: 'var(--brand-primary, #6366f1)', fontSize: '1.125rem' }}>
                        {formatCurrency(purchase.grandTotal)}
                      </strong>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <TableActions
                      isMobileCard
                      onView={() => navigate(`/purchases/${purchase.id || purchase._id}`)}
                      onEdit={() => navigate(`/purchases/${purchase.id || purchase._id}/edit`)}
                      status={purchase.status || 'ACTIVE'}
                      onActivate={() => handleActivatePurchase(purchase)}
                      onDeactivate={() => promptDeactivate(purchase)}
                      onDelete={() => handleOpenDelete(purchase)}
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

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={deactivateDialog.isOpen}
        onClose={() => setDeactivateDialog({ isOpen: false, purchase: null, loading: false })}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Purchase Order"
        message={`Are you sure you want to deactivate purchase order "${deactivateDialog.purchase?.purchaseId || deactivateDialog.purchase?.id}"? Related inventory stock additions will be reverted.`}
        confirmText="Deactivate"
        isDanger={true}
        loading={deactivateDialog.loading}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order "${purchaseToDelete?.purchaseId || purchaseToDelete?.id}"? This change cannot be undone.`}
        confirmText="Delete Order"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default Purchases;