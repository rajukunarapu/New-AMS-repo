import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import PageLoading from "../Components/Common/PageLoading";

// Lazy load the pages for better performance
const HomePage = lazy(() => import("../Pages/HomePage"));
const LoginPage = lazy(() => import("../Pages/LoginPage"));
const ModuleLeadPage = lazy(() => import("../Pages/ModuleLeadPage"));
const ConsultantPage = lazy(() => import("../Pages/ConsultantPage"));
const CustomerPage = lazy(() => import("../Pages/CustomerPage"));
const AdministratorPage = lazy(() => import("../Pages/AdministratorPage"));
const SLAFrameworkPage = lazy(() => import("../Pages/SLAFrameworkPage"));
const ExecutiveSponserPage = lazy(() => import("../Pages/ExecutiveSponserPage"));

// Helper function to validate token and enforce 30-minute expiry
const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined" || token.trim() === "") {
    return false;
  }

  // 1. Check JWT expiration if token has standard exp payload
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("tokenTime");
        return false;
      }
    }
  } catch (e) {
    // Ignore decode error and fall through to timestamp check
  }

  // 2. Check 30-minute session expiry from localStorage timestamp
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  const tokenTime = localStorage.getItem("tokenTime");
  const now = Date.now();

  if (tokenTime) {
    const elapsed = now - parseInt(tokenTime, 10);
    if (isNaN(elapsed) || elapsed > THIRTY_MINUTES_MS) {
      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("tokenTime");
      return false;
    }
  } else {
    // If token exists but no tokenTime was recorded, record it now
    localStorage.setItem("tokenTime", now.toString());
  }

  return true;
};

// ProtectedRoute component: redirects to /login if token is missing or expired
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isTokenValid()) {
    const destinationPath = `${location.pathname}${location.search || ""}`;
    return <Navigate to="/login" replace state={{ from: location, destinationPath }} />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes (require valid unexpired token) */}
          <Route
            path="/consultant"
            element={
              <ProtectedRoute>
                <ConsultantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moduleLead"
            element={
              <ProtectedRoute>
                <ModuleLeadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ExecutiveSponser"
            element={
              <ProtectedRoute>
                <ExecutiveSponserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/administrator"
            element={
              <ProtectedRoute>
                <AdministratorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/SLAFramework"
            element={
              <ProtectedRoute>
                <SLAFrameworkPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer"
            element={
              <ProtectedRoute>
                <CustomerPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;

