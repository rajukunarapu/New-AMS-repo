import React from "react";
import { useLocation } from "react-router-dom";

const Notification = ({ currentNav, roleName }) => {
  const location = useLocation();
  const p = (location?.pathname || "").toLowerCase();
  const isModuleLead = (roleName && roleName.includes("MODULE LEAD")) || p.includes("modulelead");
  const isCustomer = (roleName && roleName.includes("CUSTOMER")) || p.includes("customer");
  const isAdmin = (roleName && roleName.includes("ADMIN")) || p.includes("admin");
  const isExecutive = (roleName && roleName.includes("EXECUTIVE")) || p.includes("executive");
  const isSLA = (roleName && roleName.includes("SLA")) || p.includes("sla");

  const resolvedRole =
    roleName ||
    (isModuleLead
      ? "MODULE LEAD"
      : isCustomer
      ? "CUSTOMER"
      : isAdmin
      ? "ADMINISTRATOR"
      : isExecutive
      ? "EXECUTIVE SPONSOR"
      : isSLA
      ? "SLA FRAMEWORK"
      : "CONSULTANT");
  const labelUpper = (currentNav?.label || "NOTIFICATIONS").toUpperCase();

  return (
    <div className="mlp-other-section">
      <div className="cons-breadcrumb-row">
        <span className="cons-breadcrumb-muted">{resolvedRole}</span>
        <span className="cons-breadcrumb-sep">›</span>
        <span className="cons-breadcrumb-curr">{labelUpper}</span>
      </div>
      <h1 className="mlp-page-title">{currentNav?.label || "Notifications"}</h1>
      <p className="mlp-page-subtitle">This option is clicked</p>
      <div className="mlp-placeholder-card">
        <p style={{ color: "#64748b", margin: 0 }}>
          Showing content for <strong>{currentNav?.label || "Notifications"}</strong>. You can navigate to other options from the left sidebar.
        </p>
      </div>
    </div>
  );
};

export default Notification;
