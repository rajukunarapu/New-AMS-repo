import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/LoginPage.css";
import { Alert, LinearProgress } from "@mui/material";
import { loginAPI } from "../Services/LoginAPI";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Destructure the state to get consoleTitle, scopeLabel, destinationPath, and from
  const {
    consoleTitle = "Console",
    scopeLabel = "",
    destinationPath = null,
    from = null,
  } = location.state || {};

  // Resolve fallback path if role is not returned
  const getRedirectPath = () => {
    if (destinationPath && destinationPath !== "/" && destinationPath !== "/login") {
      return destinationPath;
    }
    if (from?.pathname && from.pathname !== "/" && from.pathname !== "/login") {
      return `${from.pathname}${from.search || ""}`;
    }
    const saved = localStorage.getItem("lastConsolePath");
    if (saved && saved !== "/" && saved !== "/login") {
      return saved;
    }
    return "/moduleLead";
  };

  // Resolve target path to redirect based on roleName from login API
  const resolveTargetPath = (roleName) => {
    // Non-governed role logins (SLA Framework, Executive Sponsor, Customer) retain exact current behavior
    const requestedPath = destinationPath || from?.pathname || "";
    const isOtherConsole =
      requestedPath === "/SLAFramework" ||
      requestedPath === "/ExecutiveSponser" ||
      requestedPath === "/customer" ||
      consoleTitle.toLowerCase().includes("sla framework") ||
      consoleTitle.toLowerCase().includes("executive") ||
      consoleTitle.toLowerCase().includes("customer");

    if (isOtherConsole) {
      return getRedirectPath();
    }

    // Role-based routing for AMS Consultant, Module Lead, Platform Administrator
    if (roleName) {
      const normalizedRole = String(roleName).trim().toLowerCase();
      if (normalizedRole === "user_1") {
        return "/consultant";
      }
      if (normalizedRole === "admin") {
        return "/administrator";
      }
      if (normalizedRole === "project manager") {
        return "/moduleLead";
      }
    }

    return getRedirectPath();
  };

  // State for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // State for alert
  const [alertType, setAlertType] = useState("info"); // "error" or "success"
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);

  // Function to handle sign-in
  const handleSignIn = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setAlertType("error");
      setAlertMessage("Please provide your work email and password.");
      setAlertOpen(true);
      return;
    }

    setLoading(true);
    setAlertOpen(false);

    try {
      const response = await loginAPI(email.trim(), password.trim());
      console.log("Login API response:", response);

      if (response && response.success && response.token) {
        const returnedRole = response.role || response.roleName || response.data?.roleName || response.data?.role || "";
        localStorage.setItem("userEmail", email.trim());
        localStorage.setItem("token", response.token);
        localStorage.setItem("tokenTime", Date.now().toString());
        if (returnedRole) {
          localStorage.setItem("userRole", returnedRole);
          localStorage.setItem("roleName", returnedRole);
          localStorage.setItem("role", returnedRole);
        }

        const target = resolveTargetPath(returnedRole);
        localStorage.setItem("lastConsolePath", target);

        setAlertType("success");
        setAlertMessage(response.message || "Sign-in successful! Redirecting...");
        setAlertOpen(true);

        setTimeout(() => {
          navigate(target, { state: { email: email.trim(), role: returnedRole }, replace: true });
        }, 600);
      } else {
        setAlertType("error");
        setAlertMessage(response?.message || "Invalid credentials. Please check your email and password.");
        setAlertOpen(true);
      }
    } catch (error) {
      console.error("Login submission error:", error);
      setAlertType("error");
      setAlertMessage("Unable to connect to authentication server. Please try again.");
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle closing the alert
  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  // Automatically close the alert after 4 seconds
  useEffect(() => {
    if (alertOpen) {
      const timer = setTimeout(() => {
        handleAlertClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [alertOpen]);

  return (
    <div className="lp-split-page">
      {/* ── Left Hero / Branding Panel (Dark Forest Green) ── */}
      <div className="lp-hero-panel">
        {/* Decorative Wave/Contour SVG in Background */}
        <div className="lp-hero-bg-lines" aria-hidden="true">
          <svg viewBox="0 0 700 700" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 500 -100 C 650 150, 680 400, 350 550 C 120 650, -50 480, 50 250 C 130 70, 350 -350, 500 -100 Z"
              stroke="rgba(52, 211, 153, 0.08)"
              strokeWidth="1.5"
            />
            <path
              d="M 600 -50 C 720 220, 750 480, 420 620 C 180 720, -10 520, 100 300 C 180 120, 420 -300, 600 -50 Z"
              stroke="rgba(52, 211, 153, 0.05)"
              strokeWidth="1.5"
            />
            <circle cx="550" cy="180" r="280" stroke="rgba(52, 211, 153, 0.06)" strokeWidth="1.2" />
          </svg>
        </div>

        <div className="lp-hero-content">
          {/* Brand Header */}
          <div className="lp-brand-header">
            <div className="lp-brand-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C12 7 7 12 2 12C7 12 12 17 12 22C12 17 17 12 22 12C17 12 12 7 12 2Z"
                  fill="#ffffff"
                />
                <circle cx="19.5" cy="4.5" r="2" fill="#ffffff" />
                <circle cx="4.5" cy="19.5" r="1.5" fill="#ffffff" />
              </svg>
            </div>
            <div className="lp-brand-text-wrap">
              <div className="lp-brand-title">
                <span>NEOVATIC</span>
                <span className="lp-brand-reg">®</span>
              </div>
              <div className="lp-brand-tagline">INNOVATION. INSIGHT. INTEGRITY.</div>
            </div>
          </div>

          {/* Hero Main Copy */}
          <div className="lp-hero-main-copy">
            <div className="lp-eyebrow-badge">SERVICE INTELLIGENCE, SIMPLIFIED</div>
            <h1 className="lp-hero-heading">
              Every ticket understood. Every step governed.
            </h1>
            <p className="lp-hero-description">
              A calm, connected command center for teams that care about resolution, accountability, and momentum.
            </p>
          </div>

          {/* 3 Feature Cards */}
          <div className="lp-feature-cards-grid">
            {/* Card 1: Single sign-on */}
            <div className="lp-feature-card">
              <div className="lp-feature-card-top">
                <svg className="lp-feature-shield-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <svg className="lp-feature-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="lp-feature-card-title">Single sign-on</div>
              <div className="lp-feature-card-desc">One secure identity for every workspace.</div>
            </div>

            {/* Card 2: Audit ready */}
            <div className="lp-feature-card">
              <div className="lp-feature-card-top">
                <svg className="lp-feature-shield-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="lp-feature-card-title">Audit ready</div>
              <div className="lp-feature-card-desc">Every sign-in is traceable by design.</div>
            </div>

            {/* Card 3: Smart access */}
            <div className="lp-feature-card">
              <div className="lp-feature-card-top">
                <svg className="lp-feature-shield-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="lp-feature-card-title">Smart access</div>
              <div className="lp-feature-card-desc">Context-aware controls keep teams moving.</div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="lp-hero-footer">
            © 2026 Neovatic AI AMS · Built for clarity.
          </div>
        </div>
      </div>

      {/* ── Right Form Panel (Light Mint / Soft Clean Background) ── */}
      <div className="lp-form-panel">
        <div className="lp-form-container">
          {/* Header Above Form Card */}
          <div className="lp-form-header">
            <div className="lp-form-header-text">
              <span className="lp-welcome-badge">WELCOME BACK</span>
              <div className="lp-title-lock-row">
                <h2 className="lp-form-title">Sign in to your console</h2>
                <div className="lp-lock-badge" title="Secure End-to-End Encryption">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <p className="lp-form-subtitle">
                Use your work identity to continue securely.
              </p>
            </div>
          </div>

          {/* Floating White Login Card */}
          <form className="lp-signin-card" onSubmit={handleSignIn} noValidate>
            {/* Inline alert */}
            {alertOpen && (
              <div className="lp-inline-alert">
                <Alert
                  severity={alertType}
                  onClose={handleAlertClose}
                  sx={{
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {alertMessage}
                </Alert>
              </div>
            )}

            {/* Email Field */}
            <div className="lp-input-group">
              <label className="lp-input-label" htmlFor="lp-email-input">
                Work email
              </label>
              <input
                id="lp-email-input"
                className="lp-text-input"
                type="email"
                placeholder="veera.pasya@neovatic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            {/* Password Field */}
            <div className="lp-input-group">
              <label className="lp-input-label" htmlFor="lp-password-input">
                Password
              </label>
              <div className="lp-password-box">
                <input
                  id="lp-password-input"
                  className="lp-text-input lp-password-field"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="lp-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            {/* <div className="lp-forgot-row">
              <button
                type="button"
                className="lp-forgot-link"
                onClick={() => {
                  setAlertType("info");
                  setAlertMessage("Please contact your IT administrator to reset your password.");
                  setAlertOpen(true);
                }}
              >
                Forgot password?
              </button>
            </div> */}

            {/* Submit Button */}
            <button
              type="submit"
              className="lp-btn-signin-new"
              disabled={loading}
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            {loading && (
              <div style={{ width: "100%", borderRadius: "4px", overflow: "hidden" }}>
                <LinearProgress color="success" sx={{ height: 4, borderRadius: 2 }} />
              </div>
            )}

            {/* Divider: PROTECTED ACCESS */}
            {/* <div className="lp-divider-wrap">
              <span className="lp-divider-line"></span>
              <span className="lp-divider-text">PROTECTED ACCESS</span>
              <span className="lp-divider-line"></span>
            </div> */}

            {/* Use Another Console Button */}
            <button
              type="button"
              className="lp-btn-another-console"
              onClick={() => navigate("/")}
              disabled={loading}
            >
              Use another console
            </button>

            {scopeLabel && (
              <p className="lp-scope-hint">{scopeLabel}</p>
            )}
          </form>

          {/* Bottom Help Text */}
          {/* <div className="lp-help-footer">
            <span>Need access? </span>
            <button
              type="button"
              className="lp-help-admin-btn"
              onClick={() => {
                setAlertType("info");
                setAlertMessage("Contact your platform administrator or IT helpdesk for access permissions.");
                setAlertOpen(true);
              }}
            >
              Contact your administrator
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
