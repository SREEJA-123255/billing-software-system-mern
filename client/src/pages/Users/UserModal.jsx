import React, { useState, useEffect } from "react";
import Modal from "../../components/Common/Modal";
import Select from "../../components/Common/Select";
import { FiShield, FiEye, FiEyeOff, FiKey } from "react-icons/fi";

const UserModal = ({ isOpen, onClose, onSave, user = null, isSaving = false }) => {
  const isEditMode = Boolean(user);
  const isSystemAdmin = isEditMode && user?.role === "ADMIN";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "STAFF",
    status: "ACTIVE"
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "", // empty for edit
        role: user.role || "STAFF",
        status: user.status || "ACTIVE"
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "STAFF",
        status: "ACTIVE"
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz";
    const uppers = "ABCDEFGHJKMNPQRSTUVWXYZ";
    const nums = "23456789";
    const specials = "@#$%&*";
    let pass = "";
    pass += uppers[Math.floor(Math.random() * uppers.length)];
    pass += chars[Math.floor(Math.random() * chars.length)];
    pass += nums[Math.floor(Math.random() * nums.length)];
    pass += specials[Math.floor(Math.random() * specials.length)];
    const all = chars + uppers + nums + specials;
    for (let i = 0; i < 6; i++) {
      pass += all[Math.floor(Math.random() * all.length)];
    }
    const generated = pass.split("").sort(() => 0.5 - Math.random()).join("");
    setFormData((prev) => ({ ...prev, password: generated }));
    setShowPassword(true);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^(?:\+\d{1,3}[\s-]?)?(?:[0-9]{10}|[0-9]{5}[\s-][0-9]{5})$/.test(formData.phone.trim())) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    // Password validation: mandatory when adding, optional when editing
    if (!isSystemAdmin) {
      if (!isEditMode) {
        if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
          newErrors.password =
            "Password must be at least 8 characters and include uppercase, lowercase, and a number";
        }
      } else if (formData.password) {
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
          newErrors.password =
            "Password must be at least 8 characters and include uppercase, lowercase, and a number";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build payload
    let payload;
    if (isSystemAdmin) {
      // System administrator credentials and role are strictly governed by server .env
      payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim()
      };
    } else {
      payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: typeof formData.role === "object" && formData.role?.target ? formData.role.target.value : formData.role,
        status: typeof formData.status === "object" && formData.status?.target ? formData.status.target.value : formData.status
      };
      if (formData.password) {
        payload.password = formData.password;
      }
    }

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSystemAdmin ? "Edit Administrator Profile" : isEditMode ? "Edit User Account" : "Create New User"}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* System Admin Notice Banner */}
        {isSystemAdmin && (
          <div
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem"
            }}
          >
            <FiShield style={{ fontSize: "1.25rem", flexShrink: 0, marginTop: "2px", color: "#2563eb" }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: "2px" }}>System Administrator Account</div>
              <div style={{ color: "#3b82f6", fontSize: "0.8125rem", lineHeight: "1.4" }}>
                Admin login email and password are exclusively managed in <code>server/.env</code>. To change the Admin login credentials, edit the <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> variables in <code>server/.env</code> directly.
              </div>
            </div>
          </div>
        )}

        <div className="grid-2">
          {/* Name Field */}
          <div className="form-group">
            <label className="form-label required" htmlFor="user-name">
              Full Name
            </label>
            <input
              id="user-name"
              name="name"
              type="text"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={handleChange}
              required
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label className="form-label required" htmlFor="user-email">
              Email Address
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              placeholder="e.g. sarah@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isSystemAdmin}
              required
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
            {isSystemAdmin && (
              <div className="form-helper" style={{ color: "#2563eb", marginTop: "4px" }}>
                Admin login email is strictly governed by server/.env
              </div>
            )}
          </div>

          {/* Phone Field */}
          <div className="form-group">
            <label className="form-label required" htmlFor="user-phone">
              Phone Number
            </label>
            <input
              id="user-phone"
              name="phone"
              type="tel"
              className={`form-control ${errors.phone ? "is-invalid" : ""}`}
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            {errors.phone && <div className="form-error">{errors.phone}</div>}
          </div>

          {/* Role Field */}
          <div className="form-group">
            <label className="form-label required" htmlFor="user-role">
              User Role
            </label>
            <Select
              id="user-role"
              name="role"
              options={[
                ...(isSystemAdmin ? [{ value: "ADMIN", label: "ADMIN (Full System Access)" }] : []),
                { value: "MANAGER", label: "MANAGER (Products, Sales, Reports)" },
                { value: "CASHIER", label: "CASHIER (Billing, POS, Payments)" },
                { value: "STAFF", label: "STAFF (Inventory, Products)" }
              ]}
              value={typeof formData.role === "object" && formData.role?.target ? formData.role.target.value : formData.role}
              onChange={(val) => {
                const clean = typeof val === "object" && val?.target ? val.target.value : val;
                setFormData((prev) => ({ ...prev, role: clean }));
              }}
              disabled={isSystemAdmin}
            />
            {isSystemAdmin && (
              <div className="form-helper" style={{ color: "#2563eb", marginTop: "4px" }}>
                Admin role is permanent and cannot be modified.
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <label
                className={`form-label ${isEditMode ? "" : "required"}`}
                htmlFor="user-password"
                style={{ margin: 0 }}
              >
                Password
              </label>
              {!isSystemAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4f46e5",
                      fontSize: "0.785rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: 0
                    }}
                    title="Generate a random strong password"
                    id="btn-generate-password"
                  >
                    <FiKey size={13} />
                    <span>Generate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      background: "none",
                      border: "none",
                      color: showPassword ? "#4f46e5" : "#64748b",
                      fontSize: "0.785rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: 0
                    }}
                    title={showPassword ? "Hide password" : "Show password (make password appear)"}
                    id="btn-toggle-password-text"
                  >
                    {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
              )}
            </div>

            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="user-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                style={{ paddingRight: "2.75rem" }}
                placeholder={
                  isSystemAdmin
                    ? "Managed strictly in server/.env"
                    : isEditMode
                    ? "Leave blank to keep unchanged"
                    : "Min 8 chars, 1 uppercase, 1 number"
                }
                value={formData.password}
                onChange={handleChange}
                disabled={isSystemAdmin}
              />
              {!isSystemAdmin && (
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "0.625rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: showPassword ? "#4f46e5" : "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    transition: "color 0.15s ease"
                  }}
                  title={showPassword ? "Hide password" : "Show password (make password appear)"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  id="btn-user-password-eye"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              )}
            </div>

            {errors.password ? (
              <div className="form-error">{errors.password}</div>
            ) : isSystemAdmin ? (
              <div className="form-helper" style={{ color: "#2563eb", marginTop: "4px" }}>
                Admin password must be changed in server/.env.
              </div>
            ) : isEditMode ? (
              <div className="form-helper" style={{ marginTop: "4px" }}>
                Only fill if you wish to reset this user's password.
              </div>
            ) : (
              <div className="form-helper" style={{ marginTop: "4px" }}>
                Min 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 number.
              </div>
            )}
          </div>

          {/* Status Field */}
          <div className="form-group">
            <label className="form-label required" htmlFor="user-status">
              Account Status
            </label>
            <Select
              id="user-status"
              name="status"
              options={[
                { value: "ACTIVE", label: "ACTIVE (Authorized to login)" },
                ...(!isSystemAdmin ? [{ value: "INACTIVE", label: "INACTIVE (Deactivated / Blocked)" }] : [])
              ]}
              value={typeof formData.status === "object" && formData.status?.target ? formData.status.target.value : formData.status}
              onChange={(val) => {
                const clean = typeof val === "object" && val?.target ? val.target.value : val;
                setFormData((prev) => ({ ...prev, status: clean }));
              }}
              disabled={isSystemAdmin}
            />
            {isSystemAdmin && (
              <div className="form-helper" style={{ color: "#2563eb", marginTop: "4px" }}>
                System Administrator account is permanently active.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="spinner"></span>
                <span>Saving...</span>
              </>
            ) : isEditMode ? (
              "Update User"
            ) : (
              "Create User"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
