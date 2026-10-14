import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import {
    FiMail,
    FiLock,
    FiEye,
    FiEyeOff,
    FiArrowLeft,
    FiArrowRight,
    FiAlertCircle,
    FiCheckCircle,
    FiCheck,
    FiShield,
    FiRefreshCw,
    FiKey
} from "react-icons/fi";
import logoImg from "../../assets/logo.png";
import "./ForgotPassword.css";

const ForgotPassword = () => {
    // Steps: 1 = Email, 2 = 6-digit OTP, 3 = New Password, 4 = Success
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRefs = useRef([]);
    const navigate = useNavigate();

    // Handle countdown timer for Resend button
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setTimeout(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Focus first OTP input when entering Step 2
    useEffect(() => {
        if (step === 2 && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [step]);

    // Handle individual OTP digit changes
    const handleOtpChange = (index, value) => {
        const cleaned = value.replace(/[^0-9]/g, "");
        if (!cleaned) {
            const nextDigits = [...otpDigits];
            nextDigits[index] = "";
            setOtpDigits(nextDigits);
            return;
        }

        const nextDigits = [...otpDigits];
        nextDigits[index] = cleaned.slice(-1);
        setOtpDigits(nextDigits);

        // Auto-focus next input box if available
        if (index < 5 && cleaned) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace navigation between OTP boxes
    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle pasting full 6-digit OTP
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
        if (pasted.length > 0) {
            const nextDigits = [...otpDigits];
            for (let i = 0; i < 6; i++) {
                nextDigits[i] = pasted[i] || "";
            }
            setOtpDigits(nextDigits);
            const focusIndex = Math.min(pasted.length, 5);
            inputRefs.current[focusIndex]?.focus();
        }
    };

    const fullOtp = otpDigits.join("");

    // Calculate password strength
    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, text: "", color: "#e2e8f0", width: "0%" };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        if (score <= 1) return { score: 1, text: "Weak", color: "#ef4444", width: "30%" };
        if (score <= 3) return { score: 2, text: "Moderate", color: "#f59e0b", width: "65%" };
        return { score: 3, text: "Strong", color: "#10b981", width: "100%" };
    };

    const strength = getPasswordStrength(password);

    // STEP 1 SUBMIT: Request OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setApiError("");

        if (!email.trim()) {
            setApiError("Please enter your registered email address.");
            return;
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
            setApiError("Please enter a valid email address.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await authService.forgotPassword(email.trim());
            if (res.success) {
                setStep(2);
                setResendCooldown(60);
            } else {
                setApiError(res.message || "Failed to generate verification code.");
            }
        } catch (err) {
            setApiError(
                err.response?.data?.message ||
                err.message ||
                "Could not generate verification code. Please check your email."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setApiError("");
        setIsSubmitting(true);
        try {
            const res = await authService.forgotPassword(email.trim());
            if (res.success) {
                setResendCooldown(60);
                setOtpDigits(["", "", "", "", "", ""]);
            } else {
                setApiError(res.message || "Failed to resend verification code.");
            }
        } catch (err) {
            setApiError(err.response?.data?.message || "Failed to resend code.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // STEP 2 SUBMIT: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setApiError("");

        if (fullOtp.length !== 6) {
            setApiError("Please enter the complete 6-digit verification code.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await authService.verifyOtp(email.trim(), fullOtp);
            if (res.success) {
                setStep(3); // Advance to Set New Password
            } else {
                setApiError(res.message || "Invalid verification code.");
            }
        } catch (err) {
            setApiError(
                err.response?.data?.message ||
                "Invalid or expired verification code. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // STEP 3 SUBMIT: Set New Password
    const handleSetNewPassword = async (e) => {
        e.preventDefault();
        setApiError("");

        if (!password) {
            setApiError("Please enter a new password.");
            return;
        }

        if (password.length < 8) {
            setApiError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setApiError("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await authService.resetPasswordWithOtp({
                email: email.trim(),
                otp: fullOtp,
                password
            });

            if (res.success) {
                setStep(4); // Advance to Success Screen
            } else {
                setApiError(res.message || "Failed to update password.");
            }
        } catch (err) {
            setApiError(
                err.response?.data?.message ||
                "Could not update password. The verification code may have expired."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="recovery-page-wrapper">
            <div className="recovery-card">
                {/* Header - EXACT SAME as Login Page Header & Logo */}
                <div className="login-header">
                    <div className="login-logo-wrapper">
                        <img src={logoImg} alt="IT Spaxios Innovation" className="login-logo-img" />
                    </div>
                    <h1>IT Spaxios Innovation</h1>
                    <p>Enterprise Billing & Management Software</p>
                </div>

                {/* 3-Step Stepper Progress Bar (Shown during steps 1-3) */}
                {step <= 3 && (
                    <div className="stepper-nav">
                        <div className={`step-node ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
                            <div className="step-indicator-circle">
                                {step > 1 ? <FiCheck size={13} /> : "1"}
                            </div>
                            <span>Email</span>
                        </div>

                        <div className={`step-connector-line ${step > 1 ? "active" : ""}`} />

                        <div className={`step-node ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
                            <div className="step-indicator-circle">
                                {step > 2 ? <FiCheck size={13} /> : "2"}
                            </div>
                            <span>Verify OTP</span>
                        </div>

                        <div className={`step-connector-line ${step > 2 ? "active" : ""}`} />

                        <div className={`step-node ${step === 3 ? "active" : ""}`}>
                            <div className="step-indicator-circle">3</div>
                            <span>New Password</span>
                        </div>
                    </div>
                )}

                {/* API Error Alert */}
                {apiError && (
                    <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
                        <FiAlertCircle style={{ fontSize: "1.25rem", flexShrink: 0 }} />
                        <span>{apiError}</span>
                    </div>
                )}

                {/* ================= STEP 1: Enter Email ================= */}
                {step === 1 && (
                    <div>
                        <div className="recovery-title-group">
                            <h2>Reset Your Password</h2>
                            <p>Enter your registered email address to receive a secure 6-digit OTP code.</p>
                        </div>

                        <form onSubmit={handleSendOtp} noValidate>
                            <div className="form-group">
                                <label className="form-label required" htmlFor="recovery-email">
                                    Email Address
                                </label>
                                <div className="input-with-icon">
                                    <span className="input-icon-left">
                                        <FiMail />
                                    </span>
                                    <input
                                        id="recovery-email"
                                        type="email"
                                        className="form-control"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-recovery-primary"
                                disabled={isSubmitting}
                                id="btn-send-otp"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        <span>Sending Code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send Verification Code</span>
                                        <FiArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* ================= STEP 2: Enter 6-Digit OTP ================= */}
                {step === 2 && (
                    <div>
                        <div className="recovery-title-group">
                            <h2>Enter Security Code</h2>
                            <p>Enter the 6-digit verification code sent to your email inbox.</p>
                        </div>

                        {/* Recipient Email Chip */}
                        <div className="target-email-chip">
                            <div>
                                <span className="chip-label">Code sent to:</span>
                                <span className="chip-email">{email}</span>
                            </div>
                            <button
                                type="button"
                                className="btn-edit-email"
                                onClick={() => {
                                    setStep(1);
                                    setOtpDigits(["", "", "", "", "", ""]);
                                    setApiError("");
                                }}
                            >
                                Change
                            </button>
                        </div>

                        <form onSubmit={handleVerifyOtp} noValidate>
                            {/* 6 Individual Segmented Boxes */}
                            <div className="form-group" style={{ textAlign: "center" }}>
                                <label className="form-label required" style={{ display: "block", marginBottom: "0.5rem" }}>
                                    6-Digit OTP Code
                                </label>
                                <div className="otp-digit-row" onPaste={handleOtpPaste}>
                                    {otpDigits.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => (inputRefs.current[idx] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            className={`otp-box-input ${digit ? "filled" : ""}`}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(idx, e.key)}
                                            required
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-recovery-primary"
                                disabled={isSubmitting || fullOtp.length !== 6}
                                id="btn-verify-otp"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        <span>Verifying Code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Verify Code & Continue</span>
                                        <FiArrowRight size={16} />
                                    </>
                                )}
                            </button>

                            {/* Resend Action */}
                            <div className="resend-action-row">
                                <span>Didn't receive the email?</span>
                                <button
                                    type="button"
                                    className="btn-resend-link"
                                    disabled={resendCooldown > 0 || isSubmitting}
                                    onClick={handleResendOtp}
                                >
                                    <FiRefreshCw size={12} className={isSubmitting ? "spinner" : ""} />
                                    <span>
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ================= STEP 3: Set New Password ================= */}
                {step === 3 && (
                    <div>
                        <div className="recovery-title-group">
                            <h2>Set New Password</h2>
                            <p>Identity verified! Create a secure password for your account.</p>
                        </div>

                        <form onSubmit={handleSetNewPassword} noValidate>
                            {/* New Password */}
                            <div className="form-group">
                                <label className="form-label required" htmlFor="input-new-password">
                                    New Password
                                </label>
                                <div className="input-with-icon">
                                    <span className="input-icon-left">
                                        <FiLock />
                                    </span>
                                    <input
                                        id="input-new-password"
                                        type={showPassword ? "text" : "password"}
                                        className="form-control"
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                        autoFocus
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

                                {/* Password Strength Indicator */}
                                {password && (
                                    <div className="password-strength-container">
                                        <div className="strength-meter-bar">
                                            <div
                                                className="strength-meter-fill"
                                                style={{ width: strength.width, backgroundColor: strength.color }}
                                            />
                                        </div>
                                        <div className="strength-text">
                                            <span>Password Strength:</span>
                                            <strong style={{ color: strength.color }}>{strength.text}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="form-group">
                                <label className="form-label required" htmlFor="input-confirm-password">
                                    Confirm New Password
                                </label>
                                <div className="input-with-icon">
                                    <span className="input-icon-left">
                                        <FiLock />
                                    </span>
                                    <input
                                        id="input-confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        className="form-control"
                                        placeholder="Re-enter your new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-recovery-primary"
                                disabled={isSubmitting || !password || password.length < 8}
                                id="btn-save-new-password"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        <span>Updating Password...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiKey size={16} />
                                        <span>Save New Password</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* ================= STEP 4: Success View ================= */}
                {step === 4 && (
                    <div className="success-card-content">
                        <div className="success-badge-icon">
                            <FiCheckCircle />
                        </div>
                        <h2>Password Updated!</h2>
                        <p>
                            Your account password has been successfully reset. You can now use your new password to sign in.
                        </p>
                        <button
                            type="button"
                            className="btn-recovery-primary"
                            onClick={() => navigate("/login")}
                            id="btn-return-login"
                        >
                            <span>Sign In to Account</span>
                            <FiArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* Back to Sign In Link */}
                {step < 4 && (
                    <div className="back-link-wrapper">
                        <Link to="/login" className="back-to-signin-link" id="link-back-to-login">
                            <FiArrowLeft size={16} />
                            <span>Back to Sign In</span>
                        </Link>
                    </div>
                )}

                {/* Security Trust Badge */}
                <div className="security-trust-footer">
                    <FiShield size={14} />
                    <span>IT Spaxios Enterprise Security • 256-bit Encryption</span>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
