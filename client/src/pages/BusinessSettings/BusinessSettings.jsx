import React, { useState, useEffect, useRef } from "react";
import businessService from "../../services/businessService";
import Toast from "../../components/Common/Toast";
import PageHeader from "../../components/Common/PageHeader";
import {
  FiUploadCloud,
  FiTrash2,
  FiCheck,
  FiRotateCcw,
  FiImage
} from "react-icons/fi";
import "./BusinessSettings.css";

const BusinessSettings = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState(null);

  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
    gstNumber: "",
    address: ""
  });

  // Logo state
  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);

  // Errors & Toasts
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", type: "info" });

  const fileInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Fetch business profile on load
  const loadBusiness = async () => {
    setLoading(true);
    try {
      const res = await businessService.getBusiness();
      if (res.success && res.data) {
        const b = res.data;
        const loadedData = {
          businessName: b.businessName || "",
          email: b.email || "",
          phone: b.phone || "",
          gstNumber: b.gstNumber || "",
          address: b.address || ""
        };
        setFormData(loadedData);
        setInitialData(loadedData);
        setCurrentLogoUrl(b.logo || "");
        setPreviewUrl(b.logo || "");
        setSelectedFile(null);
        setRemoveLogo(false);
      }
    } catch (err) {
      console.error("Failed to load business profile:", err);
      showToast(
        err.response?.data?.message || "Failed to load business settings",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handle image selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      showToast("Only JPG, PNG, WEBP, or SVG images are allowed.", "error");
      return;
    }

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      showToast("Logo file size must be less than 3MB.", "error");
      return;
    }

    setSelectedFile(file);
    setRemoveLogo(false);
    setPreviewUrl(URL.createObjectURL(file));
    showToast("Logo selected. Click 'Save Changes' to update.", "info");
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setRemoveLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset form to last saved state
  const handleReset = () => {
    if (initialData) {
      setFormData(initialData);
      setPreviewUrl(currentLogoUrl);
      setSelectedFile(null);
      setRemoveLogo(false);
      setErrors({});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast("Form reset to saved settings.", "info");
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email Address is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone Number is required";
    } else if (!/^(?:\+\d{1,3}[\s-]?)?(?:[0-9]{10}|[0-9]{5}[\s-][0-9]{5})$/.test(formData.phone.trim())) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    // Optional GST format validation
    if (formData.gstNumber.trim()) {
      const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!GST_REGEX.test(formData.gstNumber.trim().toUpperCase())) {
        newErrors.gstNumber = "Invalid GST format (e.g. 29AAAAA0000A1Z5)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("businessName", formData.businessName.trim());
      data.append("email", formData.email.trim());
      data.append("phone", formData.phone.trim());
      data.append("address", formData.address.trim());
      data.append("gstNumber", formData.gstNumber.trim().toUpperCase());

      if (selectedFile) {
        data.append("logo", selectedFile);
      } else if (removeLogo) {
        data.append("removeLogo", "true");
      }

      const res = await businessService.updateBusiness(data, true);
      if (res.success && res.data) {
        showToast("Business profile updated successfully!", "success");
        const b = res.data;
        const updated = {
          businessName: b.businessName,
          email: b.email,
          phone: b.phone,
          gstNumber: b.gstNumber,
          address: b.address
        };
        setFormData(updated);
        setInitialData(updated);
        setCurrentLogoUrl(b.logo || "");
        setPreviewUrl(b.logo || "");
        setSelectedFile(null);
        setRemoveLogo(false);
      }
    } catch (err) {
      console.error("Save failed:", err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).join(", ")
          : "Failed to save business settings");
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <div className="spinner spinner-primary" style={{ width: "2.5rem", height: "2.5rem", borderWidth: "3px" }}></div>
        <div style={{ marginTop: "1rem", fontWeight: 600, color: "#475569" }}>
          Loading Business Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="business-page">
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
        title="Business Settings & Profile"
        description="Configure your business profile, contact details, GST registration, and corporate logo for invoice generation."
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="business-layout">
          {/* Left Column: Business Details & Address */}
          <div className="card business-info-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Company Information</h3>
                <p className="card-subtitle">
                  Primary corporate details printed on billing receipts & invoices.
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="grid-2">
                {/* Business Name */}
                <div className="form-group">
                  <label className="form-label required" htmlFor="biz-name">
                    Business Name
                  </label>
                  <input
                    id="biz-name"
                    name="businessName"
                    type="text"
                    className={`form-control ${errors.businessName ? "is-invalid" : ""}`}
                    placeholder="e.g. Apex Hypermarket Ltd."
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                  />
                  {errors.businessName ? (
                    <div className="form-error">{errors.businessName}</div>
                  ) : (
                    <div className="form-helper">
                      Official trade / brand name on invoices
                    </div>
                  )}
                </div>

                {/* GST Number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="biz-gst">
                    GST Number
                  </label>
                  <input
                    id="biz-gst"
                    name="gstNumber"
                    type="text"
                    className={`form-control ${errors.gstNumber ? "is-invalid" : ""}`}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    style={{ textTransform: "uppercase" }}
                  />
                  {errors.gstNumber ? (
                    <div className="form-error">{errors.gstNumber}</div>
                  ) : (
                    <div className="form-helper">
                      Standard 15-character alphanumeric GSTIN
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label className="form-label required" htmlFor="biz-email">
                    Official Email
                  </label>
                  <input
                    id="biz-email"
                    name="email"
                    type="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    placeholder="billing@apexenterprise.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {errors.email ? (
                    <div className="form-error">{errors.email}</div>
                  ) : (
                    <div className="form-helper">
                      Billing correspondence & customer receipts email
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div className="form-group">
                  <label className="form-label required" htmlFor="biz-phone">
                    Contact Phone
                  </label>
                  <input
                    id="biz-phone"
                    name="phone"
                    type="tel"
                    className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                  {errors.phone ? (
                    <div className="form-error">{errors.phone}</div>
                  ) : (
                    <div className="form-helper">
                      Customer support phone printed on header
                    </div>
                  )}
                </div>
              </div>

              {/* Full Address */}
              <div className="form-group" style={{ marginTop: "0.5rem" }}>
                <label className="form-label required" htmlFor="biz-address">
                  Registered Address
                </label>
                <textarea
                  id="biz-address"
                  name="address"
                  rows={3}
                  className={`form-control ${errors.address ? "is-invalid" : ""}`}
                  placeholder="Street, Suite / Shop Number, City, State, PIN Code"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
                {errors.address ? (
                  <div className="form-error">{errors.address}</div>
                ) : (
                  <div className="form-helper">
                    Physical location or registered office printed on invoice header
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="business-form-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  <FiRotateCcw />
                  <span>Reset</span>
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  id="btn-save-business"
                >
                  {isSaving ? (
                    <>
                      <span className="spinner"></span>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Logo Upload Card */}
          <div className="card business-logo-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Business Logo</h3>
                <p className="card-subtitle">Displayed on printed invoices and receipts.</p>
              </div>
            </div>

            <div className="card-body logo-card-body">
              <div className="logo-preview-box">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Business Logo Preview"
                    className="logo-preview-image"
                  />
                ) : (
                  <div className="logo-placeholder">
                    <FiImage />
                    <span>No logo uploaded</span>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="file-input-hidden"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleFileChange}
              />

              <div className="logo-controls">
                <div className="logo-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUploadCloud />
                    <span>{previewUrl ? "Change Logo" : "Upload Logo"}</span>
                  </button>

                  {previewUrl && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleRemoveLogo}
                    >
                      <FiTrash2 />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                <div className="logo-hint">
                  Accepted: JPG, PNG, WEBP, SVG &bull; Max 3MB
                </div>

                <div className="logo-info-note">
                  This logo and details appear on printed invoices and billing receipts.
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BusinessSettings;
