import React, { useState } from "react";
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

  const isNotifications =
    !currentNav?.id ||
    currentNav?.id === "notifications" ||
    (currentNav?.label && currentNav.label.toLowerCase().includes("notification"));

  const labelUpper = (currentNav?.label || "NOTIFICATIONS").toUpperCase();

  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="mlp-other-section" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* Breadcrumb Header */}
      <div className="cons-breadcrumb-row">
        <span className="cons-breadcrumb-muted">{resolvedRole}</span>
        <span className="cons-breadcrumb-sep">›</span>
        <span className="cons-breadcrumb-curr">{labelUpper}</span>
      </div>

      <div>
        <h1 className="mlp-page-title" style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
          {currentNav?.label || "Notifications"}
        </h1>
        <p className="mlp-page-subtitle" style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
          {isNotifications
            ? "Stay updated with real-time alerts, ticket updates, and system broadcasts."
            : `Showing details and actions for ${currentNav?.label || "this section"}.`}
        </p>
      </div>

      {isNotifications ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
          }}
        >
          {/* Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "all", label: "All Notifications", count: 0 },
              { id: "unread", label: "Unread", count: 0 },
              { id: "tickets", label: "Ticket Alerts", count: 0 },
              { id: "system", label: "System", count: 0 },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: activeFilter === f.id ? "1px solid #33557a" : "1px solid #e2e8f0",
                  backgroundColor: activeFilter === f.id ? "#33557a" : "#ffffff",
                  color: activeFilter === f.id ? "#ffffff" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{f.label}</span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    backgroundColor: activeFilter === f.id ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                    color: activeFilter === f.id ? "#ffffff" : "#64748b",
                  }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Professional Empty State Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
              minHeight: "320px",
            }}
          >
            {/* Bell Icon Circle */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#f0f7ff",
                border: "1px solid #dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#33557a",
                marginBottom: "16px",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>

            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 6px",
              }}
            >
              Currently you have no notifications
            </h3>

            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                maxWidth: "460px",
                margin: "0 0 18px",
                lineHeight: "1.5",
              }}
            >
              You're all caught up! When you receive new ticket assignments, customer replies, SLA warnings, or system updates, they will appear here in real time.
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "11.5px",
                color: "#475569",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  display: "inline-block",
                }}
              />
              Live notification stream connected
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "32px 24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
          }}
        >
          <p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>
            Showing content for <strong>{currentNav?.label}</strong>. You can navigate to other options from the left sidebar.
          </p>
        </div>
      )}
    </div>
  );
};

export default Notification;
