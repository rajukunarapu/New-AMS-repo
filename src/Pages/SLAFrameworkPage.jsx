import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/SLAFrameworkPage.css";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";

const navItemsList = [
  // THE FRAMEWORK
  { id: "framework-overview", label: "Framework Overview" },
  { id: "priority-sla-matrix", label: "Priority & SLA Matrix" },
  { id: "consultant-process", label: "Consultant Process" },
  { id: "management-process", label: "Management Process" },
  { id: "sla-workflow", label: "SLA Workflow" },

  // GOVERNANCE
  { id: "kpi-scorecard", label: "KPI Scorecard" },
  { id: "compliance-audit", label: "Compliance Audit" },
  { id: "effort-approval", label: "Effort Approval" },
  { id: "dos-and-donts", label: "Dos & Don'ts" },

  // LIVE SERVICE
  { id: "ticket-list", label: "Ticket List" },
  { id: "ticket-details", label: "Ticket Details" },
  { id: "response-times", label: "Response Times" },
  { id: "notifications", label: "Notifications" },
  { id: "neoai", label: "NeoAI" },
];

const SLAFrameworkPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("framework-overview");
  const [searchText, setSearchText] = useState("");

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Framework Overview",
  };

  return (
    <div className="sla-container">
      {/* ── Sticky Topbar ── */}
      <TopBar
        setSearchText={setSearchText}
        searchText={searchText}
        onNotificationClick={() => setActiveNav("notifications")}
      />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="sla-body-layout">
        {/* Sidebar */}
        <aside className="sla-sidebar">
          {/* Top Identity Block */}
          <div className="sla-identity-row">
            <div className="sla-identity-user">
              <div className="sla-sidebar-avatar">{userInitial}</div>
              <span className="sla-sidebar-name">{userName}</span>
            </div>
            <button type="button" className="sla-exit-btn" onClick={handleExit} title="Exit to Home" aria-label="Exit to Home">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* 1. THE FRAMEWORK */}
          <div className="sla-nav-group">
            <div className="sla-nav-group-title">THE FRAMEWORK</div>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "framework-overview" ? "active" : ""}`}
              onClick={() => setActiveNav("framework-overview")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span>Framework Overview</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "priority-sla-matrix" ? "active" : ""}`}
              onClick={() => setActiveNav("priority-sla-matrix")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>Priority & SLA Matrix</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "consultant-process" ? "active" : ""}`}
              onClick={() => setActiveNav("consultant-process")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              <span>Consultant Process</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "management-process" ? "active" : ""}`}
              onClick={() => setActiveNav("management-process")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>Management Process</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "sla-workflow" ? "active" : ""}`}
              onClick={() => setActiveNav("sla-workflow")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </span>
              <span>SLA Workflow</span>
            </button>
          </div>

          {/* 2. GOVERNANCE */}
          <div className="sla-nav-group">
            <div className="sla-nav-group-title">GOVERNANCE</div>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "kpi-scorecard" ? "active" : ""}`}
              onClick={() => setActiveNav("kpi-scorecard")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span>KPI Scorecard</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "compliance-audit" ? "active" : ""}`}
              onClick={() => setActiveNav("compliance-audit")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <span>Compliance Audit</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "effort-approval" ? "active" : ""}`}
              onClick={() => setActiveNav("effort-approval")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span>Effort Approval</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "dos-and-donts" ? "active" : ""}`}
              onClick={() => setActiveNav("dos-and-donts")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
              <span>Dos & Don'ts</span>
            </button>
          </div>

          {/* 3. LIVE SERVICE */}
          <div className="sla-nav-group">
            <div className="sla-nav-group-title">LIVE SERVICE</div>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "ticket-list" ? "active" : ""}`}
              onClick={() => setActiveNav("ticket-list")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </span>
              <span>Ticket List</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "ticket-details" ? "active" : ""}`}
              onClick={() => setActiveNav("ticket-details")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <span>Ticket Details</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "response-times" ? "active" : ""}`}
              onClick={() => setActiveNav("response-times")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span>Response Times</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => setActiveNav("notifications")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>

            <button
              type="button"
              className={`sla-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => setActiveNav("neoai")}
            >
              <span className="sla-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="sla-content">
          {activeNav === "framework-overview" ? (
            <>
              {/* Header */}
              <div className="sla-header-section">
                <h1 className="sla-page-title">Framework Overview</h1>
                <p className="sla-page-subtitle">
                  The rules this platform runs on — how a ticket is raised, acknowledged, classified, prioritised, owned, escalated and closed, and how performance is measured. Every screen in the product enforces what is written here.
                </p>
              </div>

              {/* Row 1: 4 Metric Cards */}
              <div className="sla-metric-cards-grid">
                {/* Card 1 */}
                <div className="sla-metric-card blue">
                  <span className="sla-metric-label">OPEN IN SCOPE</span>
                  <span className="sla-metric-value">19</span>
                  <span className="sla-metric-subtext">incidents and service requests</span>
                </div>

                {/* Card 2 */}
                <div className="sla-metric-card green">
                  <span className="sla-metric-label">SLA COMPLIANCE</span>
                  <span className="sla-metric-value">100%</span>
                  <span className="sla-metric-subtext">target 95% or better</span>
                </div>

                {/* Card 3 */}
                <div className="sla-metric-card amber">
                  <span className="sla-metric-label">NEAR BREACH</span>
                  <span className="sla-metric-value">0</span>
                  <span className="sla-metric-subtext">past 75% of target</span>
                </div>

                {/* Card 4 */}
                <div className="sla-metric-card purple">
                  <span className="sla-metric-label">FINDINGS</span>
                  <span className="sla-metric-value">8</span>
                  <span className="sla-metric-subtext">across 7 tickets</span>
                </div>
              </div>

              {/* Row 2: 2 Column Panels */}
              <div className="sla-panels-grid">
                {/* Left Panel: Ticket classification */}
                <div className="sla-panel">
                  <div className="sla-panel-header">
                    <h3 className="sla-panel-title">Ticket classification</h3>
                    <p className="sla-panel-subtitle">
                      Classification sets the SLA base. Change requests are governed by effort approval instead.
                    </p>
                  </div>

                  <div className="sla-classification-list">
                    {/* Item 1: Incident */}
                    <div className="sla-classification-item">
                      <div className="sla-classification-info">
                        <span className="sla-classification-name">Incident</span>
                        <span className="sla-classification-desc">Unplanned interruption or degradation. SLA applies.</span>
                      </div>
                      <div className="sla-classification-meta">
                        <span className="sla-classification-count">18</span>
                        <span className="sla-badge green">SLA applies</span>
                      </div>
                    </div>

                    {/* Item 2: Service Request */}
                    <div className="sla-classification-item">
                      <div className="sla-classification-info">
                        <span className="sla-classification-name">Service Request</span>
                        <span className="sla-classification-desc">Requested change within agreed scope. SLA applies.</span>
                      </div>
                      <div className="sla-classification-meta">
                        <span className="sla-classification-count">1</span>
                        <span className="sla-badge green">SLA applies</span>
                      </div>
                    </div>

                    {/* Item 3: Change Request */}
                    <div className="sla-classification-item">
                      <div className="sla-classification-info">
                        <span className="sla-classification-name">Change Request</span>
                        <span className="sla-classification-desc">New or changed functionality. Out of SLA determination scope — effort approval governs the timeline.</span>
                      </div>
                      <div className="sla-classification-meta">
                        <span className="sla-classification-count">1</span>
                        <span className="sla-badge gray">Outside SLA scope</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Key controls and governance */}
                <div className="sla-panel">
                  <div className="sla-panel-header">
                    <h3 className="sla-panel-title">Key controls and governance</h3>
                  </div>

                  <ul className="sla-controls-list">
                    <li>Daily monitoring of high-priority and near-breach tickets.</li>
                    <li>Mandatory ticket updates for all open tickets within the agreed interval.</li>
                    <li>Weekly review of breached and reopened tickets.</li>
                    <li>A defined escalation matrix for functional, technical, business and management dependencies.</li>
                    <li>Monthly SLA performance reporting with improvement actions tracked.</li>
                    <li>Training and knowledge-sharing sessions on recurring issues and process gaps.</li>
                  </ul>

                  <div className="sla-callout-box">
                    The functional team is always the owner of the ticket, except for BASIS related tickets.
                  </div>
                </div>
              </div>
            </>
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : (
            /* Other Option Placeholder (Screenshot 3) */
            <div className="sla-other-section">
              <h1 className="sla-page-title">{currentNav.label}</h1>
              <p className="sla-page-subtitle">This option is clicked</p>
              <div className="sla-placeholder-card">
                <p style={{ color: "#64748b", margin: 0 }}>
                  Showing content for <strong>{currentNav.label}</strong>. You can navigate to other options from the left sidebar or return to <strong>Framework Overview</strong>.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="SLA Framework · Live Service" userEmail={emailParam} />
    </div>
  );
};

export default SLAFrameworkPage;
