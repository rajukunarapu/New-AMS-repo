import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/CustomerPage.css";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";

const navItemsList = [
  { id: "portal", label: "Customer Portal" },
  { id: "notifications", label: "Notifications" },
  { id: "neoai", label: "NeoAI" },
];

const customerTickets = [
  {
    id: "INC-1043",
    title: "Cannot post AP invoice in FB60 after July deployment",
    status: "Awaiting Allocation",
    stage: "BUD · Step 3 of 10",
    hasProgress: true,
    progressPercent: 30,
  },
  {
    id: "INC-1045",
    title: "ABAP short dump in ZFLAGING after transport D2K9041",
    status: "Assigned",
    stage: "TICKET ACK · Step 1 of 10",
    hasProgress: false,
  },
  {
    id: "INC-1049",
    title: "Depreciation run AFAB stalled — no activity 34h",
    status: "In Progress",
    stage: "TICKET ACK · Step 1 of 10",
    hasProgress: false,
  },
  {
    id: "INC-1054",
    title: "Inspection lot not created on goods receipt for batch-managed material",
    status: "Awaiting Allocation",
    stage: "TICKET ACK · Step 1 of 10",
    hasProgress: false,
  },
  {
    id: "INC-1056",
    title: "AR ageing story fails to refresh on the live HANA connection",
    status: "In Progress",
    stage: "TICKET ACK · Step 1 of 10",
    hasProgress: false,
  },
  {
    id: "INC-1055",
    title: "Batch determination missing for raw material in production order",
    status: "In Progress",
    stage: "TICKET ACK · Step 1 of 10",
    hasProgress: false,
  },
];

const CustomerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("portal");
  const [searchText, setSearchText] = useState("");

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Customer Portal",
  };

  return (
    <div className="cp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar
        setSearchText={setSearchText}
        searchText={searchText}
        onNotificationClick={() => setActiveNav("notifications")}
      />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="cp-body-layout">
        {/* Sidebar */}
        <aside className="cp-sidebar">
          {/* Top Identity Block */}
          <div className="cp-identity-row">
            <div className="cp-identity-user">
              <div className="cp-sidebar-avatar">{userInitial}</div>
              <span className="cp-sidebar-name">{userName}</span>
            </div>
            <button
              type="button"
              className="cp-exit-btn"
              onClick={handleExit}
              title="Exit to Home"
              aria-label="Exit to Home"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* 1. PORTAL */}
          <div className="cp-nav-group">
            <div className="cp-nav-group-title">PORTAL</div>
            <button
              type="button"
              className={`cp-nav-item ${activeNav === "portal" ? "active" : ""}`}
              onClick={() => setActiveNav("portal")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>Customer Portal</span>
            </button>

            <button
              type="button"
              className={`cp-nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => setActiveNav("notifications")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>

            <button
              type="button"
              className={`cp-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => setActiveNav("neoai")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="cp-content">
          {activeNav === "portal" ? (
            <div className="cp-portal-main">
              {/* Header */}
              <div className="cp-header-wrap">
                <h1 className="cp-page-title">Customer Portal</h1>
                <p className="cp-page-subtitle">
                  Your tickets only, enforced at the data layer. Review documents, accept timelines, run UAT and sign off.
                </p>
                <div className="cp-page-meta">
                  Vantage Foods · signed in as P. Raghavan
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="cp-stat-grid-4">
                <div className="cp-stat-card blue">
                  <div className="cp-stat-label">OPEN TICKETS</div>
                  <div className="cp-stat-value">6</div>
                  <div className="cp-stat-note">with Neovatic AMS</div>
                </div>

                <div className="cp-stat-card green">
                  <div className="cp-stat-label">AWAITING YOUR ACTION</div>
                  <div className="cp-stat-value">0</div>
                  <div className="cp-stat-note">timelines, UAT or sign-off</div>
                </div>

                <div className="cp-stat-card gold">
                  <div className="cp-stat-label">IN DELIVERY</div>
                  <div className="cp-stat-value">1</div>
                  <div className="cp-stat-note">past acceptance</div>
                </div>

                <div className="cp-stat-card purple">
                  <div className="cp-stat-label">CLOSED THIS QUARTER</div>
                  <div className="cp-stat-value">12</div>
                  <div className="cp-stat-note">CSAT 4.8 of 5</div>
                </div>
              </div>

              {/* Ticket Cards List */}
              <div className="cp-tickets-list">
                {customerTickets.map((ticket) => (
                  <div key={ticket.id} className="cp-ticket-row-card">
                    <div className="cp-ticket-info-block">
                      <div className="cp-ticket-title-line">
                        <span className="cp-ticket-id">{ticket.id}</span>
                        <span className="cp-ticket-title">{ticket.title}</span>
                      </div>
                      <div className="cp-ticket-stage-line">
                        <span className="cp-ticket-status">{ticket.status}</span> · current stage: <span className="cp-ticket-stage">{ticket.stage}</span>
                      </div>
                      {ticket.hasProgress && (
                        <div className="cp-ticket-progress-track">
                          <div
                            className="cp-ticket-progress-fill"
                            style={{ width: `${ticket.progressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="cp-ticket-actions-row">
                      <button type="button" className="cp-doc-btn">BU Document</button>
                      <button type="button" className="cp-doc-btn">Timelines accepted</button>
                      <button type="button" className="cp-doc-btn">Functional Specification</button>
                      <button type="button" className="cp-doc-btn">Technical Design</button>
                      <button type="button" className="cp-doc-btn">Test Scripts</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Footer Note */}
              <div className="cp-footer-note">
                Documents open from the ticket record. Accepting timelines, UAT results and sign-off are recorded with your identity and timestamp — the same evidence your service review reports on.
              </div>
            </div>
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : (
            /* Notifications / Other Placeholder (Screenshot 2) */
            <div className="cp-other-section">
              <h1 className="cp-page-title">{currentNav.label}</h1>
              <p className="cp-page-subtitle">This option is clicked</p>
              <div className="cp-placeholder-card">
                <p style={{ color: "#64748b", margin: 0 }}>
                  Showing content for <strong>{currentNav.label}</strong>. You can navigate to other options from the left sidebar or return to <strong>Customer Portal</strong>.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Customer Portal" userEmail={emailParam} />
    </div>
  );
};

export default CustomerPage;
