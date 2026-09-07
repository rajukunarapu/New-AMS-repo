import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NeovaticLogo, NeoAIServiceDeskBrand } from "../Components/Common/NeovaticLogo";
import "../Styles/LoginPage.css";
import { Alert, LinearProgress } from "@mui/material";
import { loginAPI } from "../Services/LoginAPI";

const sideInfo = [
  {
    heading: "Single sign-on",
    body: "Entra ID with conditional access. MFA is satisfied before the session token is minted.",
  },
  {
    heading: "Audit",
    body: "Sign-in, role, scope and every side-effecting action share one correlation id.",
  },
  {
    heading: "Session scope",
    body: "Role and customer set are bound to the token and enforced in the API and retriever.",
  },
  {
    heading: "Fallback",
    body: "If the model layer is unavailable the deterministic AMS path continues unchanged.",
  },
];

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

  // Automatically close the alert after 4 seconds (instead of 1s so it's readable)
  useEffect(() => {
    if (alertOpen) {
      const timer = setTimeout(() => {
        handleAlertClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [alertOpen]);

  return (
    <div className="lp-page">
      {/* Logo */}
      <div className="lp-logo-wrap">
        <NeovaticLogo height={48} className="lp-logo" />
      </div>

      {/* Header */}
      <div className="lp-header">
        <NeoAIServiceDeskBrand height={62} className="lp-hero-brand-svg" />
      </div>

      {/* Main content */}
      <div className="lp-body">
        {/* Login card */}
        <form className="lp-card" onSubmit={handleSignIn} noValidate>
          <h2 className="lp-card-title">{consoleTitle}</h2>

          {/* Inline alert inside form for direct visibility */}
          {alertOpen && (
            <div className="lp-inline-alert">
              <Alert
                severity={alertType}
                onClose={handleAlertClose}
                sx={{
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 500,
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                {alertMessage}
              </Alert>
            </div>
          )}

          <div className="lp-field">
            {/* email */}
            <label className="lp-label" htmlFor="lp-email">WORK EMAIL</label>
            <input
              id="lp-email"
              className="lp-input"
              type="email"
              placeholder="e.g. name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          {/* password */}
          <div className="lp-field">
            <label className="lp-label" htmlFor="lp-password">PASSWORD</label>
            <div className="lp-password-wrap">
              <input
                id="lp-password"
                className="lp-input lp-password-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="lp-password-toggle-btn"
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

          {/* buttons */}
          <div className="lp-actions">
            <button
              type="submit"
              className="lp-btn-signin"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <button
              type="button"
              className="lp-btn-back"
              onClick={() => navigate("/")}
              disabled={loading}
            >
              Use another console
            </button>
          </div>

          {loading && (
            <div style={{ width: "100%", marginTop: "12px", borderRadius: "4px", overflow: "hidden" }}>
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            </div>
          )}

          {scopeLabel && (
            <p className="lp-scope">{scopeLabel}</p>
          )}
        </form>

        {/* Info columns */}
        <div className="lp-info-grid">
          {sideInfo.map((item) => (
            <div key={item.heading} className="lp-info-item">
              <p className="lp-info-heading">{item.heading}</p>
              <p className="lp-info-body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

