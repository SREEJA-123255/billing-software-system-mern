import React, { useState, useEffect, useCallback, useMemo } from "react";
import userService from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "../../components/Common/Badges";
import StatusBadge from "../../components/Common/StatusBadge";
import UserModal from "./UserModal";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import Toast from "../../components/Common/Toast";
import Select from "../../components/Common/Select";
import SearchBar from "../../components/Common/SearchBar";
import PageHeader from "../../components/Common/PageHeader";
import { KpiGrid, KpiCard } from "../../components/Common/KpiCard";
import TableActions from "../../components/Common/TableActions";
import ShortId from "../../components/Common/ShortId";
import { SkeletonTable } from "../../components/Common/Skeleton";
import EmptyState from "../../components/Common/EmptyState";
import { formatNumber, formatDate, formatOptional } from "../../utils/formatters";
import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiAlertCircle
} from "react-icons/fi";
import "./Users.css";

const ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Roles" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "MANAGER", label: "MANAGER" },
  { value: "CASHIER", label: "CASHIER" },
  { value: "STAFF", label: "STAFF" }
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" }
];

const UserManagement = () => {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // View Details Modal State
  const [detailsUser, setDetailsUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status toggle confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    user: null,
    targetStatus: "INACTIVE",
    loading: false
  });

  // Toast state
  const [toast, setToast] = useState({ message: "", type: "info" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const extractPrimitive = (val) => {
        if (!val || val === "ALL") return undefined;
        if (typeof val === "string") return val.trim() || undefined;
        if (typeof val === "object") {
          const inner = val?.target?.value ?? val?.value;
          if (typeof inner === "string" && inner && inner !== "ALL") return inner.trim();
        }
        return undefined;
      };

      const res = await userService.getUsers({
        search: search.trim() || undefined,
        role: extractPrimitive(roleFilter),
        status: extractPrimitive(statusFilter),
        page,
        limit: 20
      });

      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { total: 0, pages: 1, limit: 20 });
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load users. Please check your network connection and retry."
      );
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchUsers]);

  const handleRoleChange = (val) => {
    const clean = typeof val === "object" && val?.target ? val.target.value : (typeof val === "object" && val?.value ? val.value : val);
    setRoleFilter(typeof clean === "string" ? clean : "ALL");
    setPage(1);
  };

  const handleStatusChange = (val) => {
    const clean = typeof val === "object" && val?.target ? val.target.value : (typeof val === "object" && val?.value ? val.value : val);
    setStatusFilter(typeof clean === "string" ? clean : "ALL");
    setPage(1);
  };

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleOpenDetails = (user) => {
    setDetailsUser(user);
    setIsDetailsOpen(true);
  };

  const handleOpenDelete = (user) => {
    if (user.role === "ADMIN") {
      showToast("The System Administrator account cannot be deleted.", "error");
      return;
    }
    const uid = user.id || user._id;
    if (uid === currentUser?.id || user.email === currentUser?.email) {
      showToast("You cannot delete your own administrative account.", "error");
      return;
    }
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const uid = userToDelete.id || userToDelete._id;
      await userService.deleteUser(uid);
      showToast(`User "${userToDelete.name}" deleted successfully`, "success");
      setIsDeleteOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error("Delete user error:", err);
      const msg = err.response?.data?.message || "Failed to delete user";
      showToast(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveUser = async (formData) => {
    setIsSaving(true);
    try {
      if (selectedUser) {
        const res = await userService.updateUser(selectedUser.id || selectedUser._id, formData);
        showToast(res.message || "User updated successfully", "success");
      } else {
        const res = await userService.createUser(formData);
        showToast(res.message || "User created successfully", "success");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).join(", ")
          : "Failed to save user");
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const promptToggleStatus = (user) => {
    if (user.role === "ADMIN") {
      showToast("The System Administrator account cannot be deactivated.", "error");
      return;
    }

    const isCurrentlyActive = user.status === "ACTIVE";
    const targetStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";

    if (
      user.id === currentUser?.id ||
      user._id === currentUser?.id ||
      user.email === currentUser?.email
    ) {
      showToast("You cannot deactivate your own administrative account.", "error");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      user,
      targetStatus,
      loading: false
    });
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmDialog.user) return;

    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      const userId = confirmDialog.user.id || confirmDialog.user._id;
      const res = await userService.toggleUserStatus(userId, confirmDialog.targetStatus);
      showToast(res.message || `User status changed to ${confirmDialog.targetStatus}`, "success");
      setConfirmDialog({ isOpen: false, user: null, targetStatus: "INACTIVE", loading: false });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update user status";
      showToast(msg, "error");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Metrics
  const activeCount = useMemo(() => users.filter((u) => u.status === "ACTIVE").length, [users]);
  const inactiveCount = useMemo(() => users.filter((u) => u.status === "INACTIVE").length, [users]);

  return (
    <div className="users-page">
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "info" })}
        />
      )}

      {/* 1. Page Header */}
      <PageHeader
        title="Users"
        description="Manage system users, assigned roles, and access permissions."
        actionButton={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            id="btn-add-user"
          >
            <FiPlus />
            <span>Add New User</span>
          </button>
        }
      />

      {/* 2. KPI Summary Cards */}
      <KpiGrid columns={3}>
        <KpiCard
          label="Total Users"
          value={formatNumber(pagination.total || users.length)}
          icon={FiUsers}
          variant="primary"
        />
        <KpiCard
          label="Active Accounts"
          value={formatNumber(activeCount)}
          icon={FiUserCheck}
          variant="success"
        />
        <KpiCard
          label="Inactive Accounts"
          value={formatNumber(inactiveCount)}
          icon={FiUserX}
          variant="neutral"
        />
      </KpiGrid>

      {/* 3. Filter Card */}
      <div className="universal-filter-card">
        <div className="filter-row-top">
          <SearchBar
            id="users-search-bar"
            value={search}
            onChange={setSearch}
            placeholder="Search users by name, email, or phone..."
          />
        </div>
        <div className="filter-row-bottom">
          <div className="filter-control-item filter-select-role">
            <Select
              id="filter-user-role"
              options={ROLE_FILTER_OPTIONS}
              value={roleFilter}
              onChange={handleRoleChange}
              placeholder="Role"
              ariaLabel="Filter users by role"
            />
          </div>

          <div className="filter-control-item filter-select-status">
            <Select
              id="filter-user-status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={handleStatusChange}
              placeholder="Status"
              ariaLabel="Filter users by account status"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary filter-control-item filter-btn-refresh"
            onClick={fetchUsers}
            title="Refresh list"
            aria-label="Refresh user list"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: "24px" }}>
          <FiAlertCircle style={{ fontSize: "1.25rem", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{error}</div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchUsers}>
            Retry
          </button>
        </div>
      )}

      {/* 4. Table Card */}
      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="No Users Found"
            description="No user accounts match your search filters."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearch("");
              setRoleFilter("ALL");
              setStatusFilter("ALL");
              setPage(1);
            }}
          />
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <table className="desktop-table-view universal-table" aria-label="System Users">
              <colgroup>
                <col style={{ width: "105px" }} />
                <col style={{ width: "170px" }} />
                <col className="col-flex" />
                <col style={{ width: "130px" }} className="col-hide-md" />
                <col style={{ width: "100px" }} />
                <col style={{ width: "95px" }} />
                <col style={{ width: "110px" }} className="col-hide-md" />
                <col style={{ width: "245px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="col-left" style={{ width: "105px" }}>User ID</th>
                  <th scope="col" className="col-left" style={{ width: "170px" }}>Name</th>
                  <th scope="col" className="col-left">Email</th>
                  <th scope="col" className="col-left col-hide-md" style={{ width: "130px" }}>Phone</th>
                  <th scope="col" className="col-left" style={{ width: "100px" }}>Role</th>
                  <th scope="col" className="col-left" style={{ width: "95px" }}>Status</th>
                  <th scope="col" className="col-left col-hide-md" style={{ width: "110px" }}>Created</th>
                  <th scope="col" className="col-actions" style={{ width: "245px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const uid = u.id || u._id;
                  const isSelf = uid === currentUser?.id || u.email === currentUser?.email;
                  return (
                    <tr key={uid}>
                      <td className="col-left col-code">
                        <ShortId prefix="USR" id={uid} />
                      </td>
                      <td className="col-left">
                        <strong className="user-name-text" title={u.name}>{u.name}</strong>
                      </td>
                      <td className="col-left user-col-email">
                        <div className="user-email-wrapper">
                          <span
                            className="user-email-text"
                            tabIndex={0}
                            title={u.email}
                            aria-label={`Email: ${u.email}`}
                          >
                            {u.email}
                          </span>
                          <span className="user-email-tooltip" role="tooltip" aria-hidden="true">
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="col-left col-hide-md">
                        <span className="user-phone-text">{formatOptional(u.phone)}</span>
                      </td>
                      <td className="col-left">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="col-left col-status">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="col-left col-date col-hide-md">
                        <span className="table-date">{formatDate(u.createdAt)}</span>
                      </td>
                      <td className="col-actions">
                        <TableActions
                          onView={() => handleOpenDetails(u)}
                          onEdit={() => handleOpenEdit(u)}
                          status={u.status}
                          onActivate={() => promptToggleStatus(u)}
                          onDeactivate={() => promptToggleStatus(u)}
                          onDelete={() => handleOpenDelete(u)}
                          disabledActivate={isSelf || u.role === "ADMIN"}
                          disabledDeactivate={isSelf || u.role === "ADMIN"}
                          disabledDelete={isSelf || u.role === "ADMIN"}
                          viewTitle="View"
                          editTitle="Edit"
                          activateTitle="Activate"
                          deactivateTitle="Deactivate"
                          deleteTitle="Delete"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards List (< 768px) */}
            <div className="universal-mobile-cards">
              {users.map((u) => {
                const uid = u.id || u._id;
                const isSelf = uid === currentUser?.id || u.email === currentUser?.email;
                return (
                  <div key={uid} className="mobile-card-item">
                    <div className="mobile-card-header">
                      <div className="mobile-card-meta-row">
                        <ShortId prefix="USR" id={uid} />
                        <RoleBadge role={u.role} />
                      </div>
                      <StatusBadge status={u.status} />
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-card-field col-span-2">
                        <span className="mobile-card-label">Name</span>
                        <strong className="mobile-card-title">
                          {u.name}
                        </strong>
                      </div>
                      <div className="mobile-card-field col-span-2">
                        <span className="mobile-card-label">Email</span>
                        <span className="mobile-card-value user-email-card-value" title={u.email}>{u.email}</span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Phone</span>
                        <span className="mobile-card-value">{formatOptional(u.phone)}</span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Joined</span>
                        <span className="mobile-card-value">{formatDate(u.createdAt)}</span>
                      </div>
                    </div>

                    <div className="mobile-card-footer">
                      <TableActions
                        isMobileCard
                        onView={() => handleOpenDetails(u)}
                        onEdit={() => handleOpenEdit(u)}
                        status={u.status}
                        onActivate={() => promptToggleStatus(u)}
                        onDeactivate={() => promptToggleStatus(u)}
                        onDelete={() => handleOpenDelete(u)}
                        disabledActivate={isSelf || u.role === "ADMIN"}
                        disabledDeactivate={isSelf || u.role === "ADMIN"}
                        disabledDelete={isSelf || u.role === "ADMIN"}
                        viewTitle="View User"
                        editTitle="Edit"
                        activateTitle="Activate"
                        deactivateTitle="Deactivate"
                        deleteTitle="Delete"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* User Add / Edit Modal */}
      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          user={selectedUser}
          onSave={handleSaveUser}
          onClose={() => setIsModalOpen(false)}
          loading={isSaving}
        />
      )}

      {/* User Details View Modal */}
      {isDetailsOpen && detailsUser && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`User Details — ${detailsUser.name}`}
          maxWidth="560px"
        >
          <div className="user-details-content">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "1.25rem"
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  User ID
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                  <ShortId prefix="USR" id={detailsUser.id || detailsUser._id} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <RoleBadge role={detailsUser.role} />
                <StatusBadge status={detailsUser.status} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "1.25rem"
              }}
            >
              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Full Name</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {detailsUser.name}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Email Address</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px", wordBreak: "break-all" }}>
                  {detailsUser.email}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Phone Number</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {formatOptional(detailsUser.phone)}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Assigned Role</span>
                <div style={{ marginTop: "4px" }}>
                  <RoleBadge role={detailsUser.role} />
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Created Date</span>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginTop: "2px" }}>
                  {formatDate(detailsUser.createdAt)}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Account Status</span>
                <div style={{ marginTop: "4px" }}>
                  <StatusBadge status={detailsUser.status} />
                </div>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsDetailsOpen(false);
                  handleOpenEdit(detailsUser);
                }}
              >
                Edit User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, user: null, targetStatus: "INACTIVE", loading: false })}
        onConfirm={handleConfirmToggleStatus}
        title={confirmDialog.targetStatus === "ACTIVE" ? "Activate User Account" : "Deactivate User Account"}
        message={`Are you sure you want to ${confirmDialog.targetStatus === "ACTIVE" ? "activate" : "deactivate"} ${confirmDialog.user?.name}'s account?`}
        confirmText={confirmDialog.targetStatus === "ACTIVE" ? "Activate" : "Deactivate"}
        isDanger={confirmDialog.targetStatus === "INACTIVE"}
        loading={confirmDialog.loading}
      />

      {/* Confirm Permanent Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete "${userToDelete?.name}" (${userToDelete?.email})? This action cannot be undone.`}
        confirmText="Delete User"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default UserManagement;
