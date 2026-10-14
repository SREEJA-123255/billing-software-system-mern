import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiAlertCircle
} from "react-icons/fi";
import logoImg from "../../assets/logo.png";
import { getDefaultLandingPage } from "../../config/permissions";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Ensure port 5173 is used because it matches Google Cloud Console's Authorized JavaScript Origin
  useEffect(() => {
    if (window.location.hostname === "localhost" && window.location.port === "5174") {
      window.location.port = "5173";
    }
  }, []);

  // Validate email/password form
  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      errs.email = "Please enter a valid email address";
    }

    if (!password) {
      errs.password = "Password is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Standard email/password submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      const target = getDefaultLandingPage(user?.role);
      navigate(target, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your credentials.";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real Google Sign-In Success Handler: Dynamically uses whatever Google account was selected
  const handleGoogleSuccess = async (credentialResponse) => {
    setApiError("");
    setIsSubmitting(true);
    try {
      if (!credentialResponse?.credential) {
        throw new Error("No credential received from Google");
      }
      const user = await loginWithGoogle({ credential: credentialResponse.credential });
      const target = getDefaultLandingPage(user?.role);
      navigate(target, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Google authentication failed. Please try again.";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error("Google OAuth error:", error);
    setApiError(
      "Google Sign-In was closed or cancelled. Please try again."
    );
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo-wrapper">
            <img src={logoImg} alt="IT Spaxios Innovation" className="login-logo-img" />
          </div>
          <h1>IT Spaxios Innovation</h1>
          <p>Enterprise Billing & Management Software</p>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="alert alert-danger" role="alert">
            <FiAlertCircle style={{ fontSize: "1.25rem", flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label required" htmlFor="login-email">
              Email Address
            </label>
            <div className="input-with-icon">
              <span className="input-icon-left">
                <FiMail />
              </span>
              <input
                id="login-email"
                type="email"
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          {/* Password Field with Forgot Password Link */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label required" htmlFor="login-password">
                Password
              </label>
              <Link to="/forgot-password" className="forgot-password-link" id="link-forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className="input-with-icon">
              <span className="input-icon-left">
                <FiLock />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={isSubmitting}
            id="btn-login-submit"
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              "Sign In to Account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>or continue with</span>
        </div>

        {/* Google Authentication Section */}
        <div className="google-auth-container">
          <div className="google-btn-wrapper" id="google-login-official">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
              shape="rectangular"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
