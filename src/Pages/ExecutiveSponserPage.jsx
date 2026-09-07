import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import neovaticMark from "../assets/neovatic-mark.png";
import "../Styles/ExecutiveSponserPage.css";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";


const navItemsList = [
  { id: "dashboard", label: "Executive Dashboard" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
  { id: "response-times", label: "Response Times" },
  { id: "insights", label: "Insights" },
  { id: "activity-history", label: "Activity History" },
  { id: "notifications", label: "Notifications" },
  { id: "neoai", label: "NeoAI" },
];

const ExecutiveSponsorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("dashboard");
  const [searchText, setSearchText] = useState("");

  // Executive Dashboard filter states
  const [periodFilter, setPeriodFilter] = useState("quarter");
  const [accountFilter, setAccountFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState("delivery");

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";

  // GetUserInfo from Util
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Executive Dashboard",
  };

  return (
    <div className="esp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar setSearchText={setSearchText} searchText={searchText} onNotificationClick={() => setActiveNav("notifications")} />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="esp-body-layout">
        {/* Sidebar */}
        <aside className="esp-sidebar">
          {/* Top Identity Block with Interactive Exit Button */}
          <div className="esp-identity-row">
            <div className="esp-identity-user">
              <div className="esp-sidebar-avatar">{userInitial}</div>
              <span className="esp-sidebar-name">{userName}</span>
            </div>
            <button
              type="button"
              className="esp-exit-btn"
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

          {/* 1. PORTFOLIO */}
          <div className="esp-nav-group">
            <div className="esp-nav-group-title">PORTFOLIO</div>
            <button
              type="button"
              className={`esp-nav-item ${activeNav === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveNav("dashboard")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              <span>Executive Dashboard</span>
            </button>

            <button
              type="button"
              className={`esp-nav-item ${activeNav === "reports" ? "active" : ""}`}
              onClick={() => setActiveNav("reports")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <span>Reports</span>
            </button>

            <button
              type="button"
              className={`esp-nav-item ${activeNav === "analytics" ? "active" : ""}`}
              onClick={() => setActiveNav("analytics")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span>Analytics</span>
            </button>
          </div>

          {/* 2. SERVICE HEALTH */}
          <div className="esp-nav-group">
            <div className="esp-nav-group-title">SERVICE HEALTH</div>
            <button
              type="button"
              className={`esp-nav-item ${activeNav === "response-times" ? "active" : ""}`}
              onClick={() => setActiveNav("response-times")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span>Response Times</span>
            </button>

            <button
              type="button"
              className={`esp-nav-item ${activeNav === "insights" ? "active" : ""}`}
              onClick={() => setActiveNav("insights")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>Insights</span>
            </button>

            <button
              type="button"
              className={`esp-nav-item ${activeNav === "activity-history" ? "active" : ""}`}
              onClick={() => setActiveNav("activity-history")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 10" />
                  <path d="M4 12a8 8 0 0 1 8-8" />
                </svg>
              </span>
              <span>Activity History</span>
            </button>

            <button
              type="button"
              className={`esp-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => setActiveNav("neoai")}
            >
              <span className="esp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="esp-content">
          {activeNav === "dashboard" ? (
            <>
              {/* Header */}
              <div style={{ maxWidth: "60%" }}>
                <h1 className="esp-page-title">Executive Dashboard</h1>
                <p className="esp-page-subtitle">
                  Programme outcomes against the blueprint targets: SLA, MTTR, automation tier, cost control and phase exit gates.
                </p>
              </div>

              {/* Filter Controls (Connected hierarchical card matching Screenshot 1) */}
              <div className="esp-connected-filter-card">
                {/* Row 1: PERIOD */}
                <div className="esp-connected-row">
                  <span className="esp-connected-label">PERIOD</span>
                  <div className="esp-pill-group">
                    <button
                      type="button"
                      className={`esp-pill-btn ${periodFilter === "quarter" ? "active" : ""}`}
                      onClick={() => setPeriodFilter("quarter")}
                    >
                      This quarter
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${periodFilter === "month" ? "active" : ""}`}
                      onClick={() => setPeriodFilter("month")}
                    >
                      This month
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${periodFilter === "week" ? "active" : ""}`}
                      onClick={() => setPeriodFilter("week")}
                    >
                      This week
                    </button>
                  </div>
                </div>

                <div className="esp-connected-vpipe" />

                {/* Row 2: ACCOUNTS */}
                <div className="esp-connected-row">
                  <span className="esp-connected-label">ACCOUNTS</span>
                  <div className="esp-pill-group">
                    <button
                      type="button"
                      className={`esp-pill-btn ${accountFilter === "all" ? "active" : ""}`}
                      onClick={() => setAccountFilter("all")}
                    >
                      All accounts
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${accountFilter === "platinum" ? "active" : ""}`}
                      onClick={() => setAccountFilter("platinum")}
                    >
                      Platinum
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${accountFilter === "gold" ? "active" : ""}`}
                      onClick={() => setAccountFilter("gold")}
                    >
                      Gold
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${accountFilter === "silver" ? "active" : ""}`}
                      onClick={() => setAccountFilter("silver")}
                    >
                      Silver
                    </button>
                  </div>
                </div>

                <div className="esp-connected-vpipe" />

                {/* Row 3: VIEW */}
                <div className="esp-connected-row">
                  <span className="esp-connected-label">VIEW</span>
                  <div className="esp-pill-group">
                    <button
                      type="button"
                      className={`esp-pill-btn ${viewFilter === "delivery" ? "active" : ""}`}
                      onClick={() => setViewFilter("delivery")}
                    >
                      Delivery
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${viewFilter === "commercial" ? "active" : ""}`}
                      onClick={() => setViewFilter("commercial")}
                    >
                      Commercial
                    </button>
                    <button
                      type="button"
                      className={`esp-pill-btn ${viewFilter === "risk" ? "active" : ""}`}
                      onClick={() => setViewFilter("risk")}
                    >
                      Risk
                    </button>
                  </div>
                </div>

                <div className="esp-connected-summary">
                  {periodFilter === "quarter" ? "This quarter" : periodFilter === "month" ? "This month" : "This week"} · {accountFilter === "all" ? "All accounts" : accountFilter.charAt(0).toUpperCase() + accountFilter.slice(1)} · {viewFilter.charAt(0).toUpperCase() + viewFilter.slice(1)}
                </div>
              </div>

              {/* 6 Metric Cards */}
              <div className="esp-stat-grid-6">
                <div className="esp-stat-card blue">
                  <div className="esp-stat-label">SLA COMPLIANCE</div>
                  <div className="esp-stat-value">94.2%</div>
                  <div className="esp-stat-note">target 95% · +6.1 pts since phase 2</div>
                </div>

                <div className="esp-stat-card green">
                  <div className="esp-stat-label">AVERAGE TIME TO FIX</div>
                  <div className="esp-stat-value">6.4h</div>
                  <div className="esp-stat-note">-22% · target 6.0h</div>
                </div>

                <div className="esp-stat-card gold">
                  <div className="esp-stat-label">AUTO-TRIAGED</div>
                  <div className="esp-stat-value">92%</div>
                  <div className="esp-stat-note">module agreement on golden set</div>
                </div>

                <div className="esp-stat-card purple">
                  <div className="esp-stat-label">COST PER TICKET</div>
                  <div className="esp-stat-value">₹412</div>
                  <div className="esp-stat-note">-18% · model spend included</div>
                </div>

                <div className="esp-stat-card green">
                  <div className="esp-stat-label">CSAT</div>
                  <div className="esp-stat-value">4.4</div>
                  <div className="esp-stat-note">of 5 · n=286 this quarter</div>
                </div>

                <div className="esp-stat-card red">
                  <div className="esp-stat-label">REOPEN RATE</div>
                  <div className="esp-stat-value">4.1%</div>
                  <div className="esp-stat-note">target below 5%</div>
                </div>
              </div>

              {/* Programme phases and exit gates */}
              <div className="esp-programme-panel">
                <h3 className="esp-panel-title">Programme phases and exit gates</h3>
                <div className="esp-phase-table">
                  {/* Phase 0 */}
                  <div className="esp-phase-row">
                    <span className="esp-phase-num">0</span>
                    <span className="esp-phase-name">Discovery and control design</span>
                    <span className="esp-phase-weeks">W1-3</span>
                    <span className="esp-phase-desc">Architecture decisions, backlog and test plan approved</span>
                    <div className="esp-phase-bar-wrap">
                      <div className="esp-phase-bar-track">
                        <div className="esp-phase-bar-fill" style={{ width: "100%" }} />
                      </div>
                      <span className="esp-phase-pct">100%</span>
                    </div>
                  </div>

                  {/* Phase 1 */}
                  <div className="esp-phase-row">
                    <span className="esp-phase-num">1</span>
                    <span className="esp-phase-name">Foundation and email-to-ticket</span>
                    <span className="esp-phase-weeks">W4-8</span>
                    <span className="esp-phase-desc">≥90% triage agreement; no lost or duplicate ticket</span>
                    <div className="esp-phase-bar-wrap">
                      <div className="esp-phase-bar-track">
                        <div className="esp-phase-bar-fill" style={{ width: "100%" }} />
                      </div>
                      <span className="esp-phase-pct">100%</span>
                    </div>
                  </div>

                  {/* Phase 2 */}
                  <div className="esp-phase-row">
                    <span className="esp-phase-num">2</span>
                    <span className="esp-phase-name">SLA and notifications</span>
                    <span className="esp-phase-weeks">W9-13</span>
                    <span className="esp-phase-desc">100% tickets carry a reconciled SLA; zero duplicate notifications</span>
                    <div className="esp-phase-bar-wrap">
                      <div className="esp-phase-bar-track">
                        <div className="esp-phase-bar-fill" style={{ width: "82%" }} />
                      </div>
                      <span className="esp-phase-pct">82%</span>
                    </div>
                  </div>

                  {/* Phase 3 */}
                  <div className="esp-phase-row">
                    <span className="esp-phase-num">3</span>
                    <span className="esp-phase-name">Monitoring and internal RAG</span>
                    <span className="esp-phase-weeks">W14-18</span>
                    <span className="esp-phase-desc">Breach reduction measured; ≥85% grounded answer acceptance</span>
                    <div className="esp-phase-bar-wrap">
                      <div className="esp-phase-bar-track">
                        <div className="esp-phase-bar-fill" style={{ width: "0%" }} />
                      </div>
                      <span className="esp-phase-pct">0%</span>
                    </div>
                  </div>

                  {/* Phase 4 */}
                  <div className="esp-phase-row">
                    <span className="esp-phase-num">4</span>
                    <span className="esp-phase-name">Reporting, prediction, customer RAG</span>
                    <span className="esp-phase-weeks">W19-24</span>
                    <span className="esp-phase-desc">Security/RBAC sign-off and predictive calibration</span>
                    <div className="esp-phase-bar-wrap">
                      <div className="esp-phase-bar-track">
                        <div className="esp-phase-bar-fill" style={{ width: "0%" }} />
                      </div>
                      <span className="esp-phase-pct">0%</span>
                    </div>
                  </div>

                  {/* Phase 5 */}
                  <div className="esp-phase-row">
                    <span className="esp-phase-num">5</span>
                    <span className="esp-phase-name">Parallel run and optimisation</span>
                    <span className="esp-phase-weeks">W25+</span>
                    <span className="esp-phase-desc">Operations acceptance to retire legacy RT/OFA</span>
                    <div className="esp-phase-bar-wrap">
                      <div className="esp-phase-bar-track">
                        <div className="esp-phase-bar-fill" style={{ width: "0%" }} />
                      </div>
                      <span className="esp-phase-pct">0%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer health + Decisions awaiting the sponsor */}
              <div className="esp-split-grid">
                {/* Customer Health Panel */}
                <div className="esp-subpanel">
                  <h3 className="esp-panel-title">Customer health</h3>
                  <table className="esp-health-table">
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>TICKETS</th>
                        <th>SLA</th>
                        <th>MTTR</th>
                        <th>CSAT</th>
                        <th>RISK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Vantage Foods</strong></td>
                        <td>34</td>
                        <td>96%</td>
                        <td>5.8h</td>
                        <td>4.6</td>
                        <td><span className="esp-risk-badge low">Low</span></td>
                      </tr>
                      <tr>
                        <td><strong>Meridian Steel</strong></td>
                        <td>41</td>
                        <td>92%</td>
                        <td>5.9h</td>
                        <td>4.3</td>
                        <td><span className="esp-risk-badge watch">Watch</span></td>
                      </tr>
                      <tr>
                        <td><strong>Cordell Group</strong></td>
                        <td>28</td>
                        <td>87%</td>
                        <td>8.4h</td>
                        <td>3.8</td>
                        <td><span className="esp-risk-badge at-risk">At risk</span></td>
                      </tr>
                      <tr>
                        <td><strong>Northwind Retail</strong></td>
                        <td>15</td>
                        <td>97%</td>
                        <td>5.1h</td>
                        <td>4.5</td>
                        <td><span className="esp-risk-badge low">Low</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Decisions Awaiting Panel */}
                <div className="esp-subpanel">
                  <h3 className="esp-panel-title">Decisions awaiting the sponsor</h3>
                  <div className="esp-decisions-list">
                    <div className="esp-decision-item">
                      <div className="esp-decision-title">Provider due diligence for Grok not complete</div>
                      <div className="esp-decision-desc">
                        Restricted content stays on the private Llama route until Security and the Data Owner approve.
                      </div>
                    </div>

                    <div className="esp-decision-item">
                      <div className="esp-decision-title">Llama 70B GPU capacity outside the ₹11 lakh budget</div>
                      <div className="esp-decision-desc">
                        Reverted to hosted endpoint for the MVP; capital request raised separately.
                      </div>
                    </div>

                    <div className="esp-decision-item">
                      <div className="esp-decision-title">Historical ticket quality limits routing models</div>
                      <div className="esp-decision-desc">
                        Data profiling and human curation before automation scope widens.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeNav === "reports" ? (
            <>
              {/* Reports View (Screenshot 2) */}
              <h1 className="esp-page-title">Reports</h1>
              <p className="esp-page-subtitle">
                Existing ageing reports retained, plus MTTR, reopen, backlog, breach risk and governed natural-language reporting on curated views.
              </p>

              {/* 5 Metric Cards */}
              <div className="esp-stat-grid-5">
                <div className="esp-stat-card blue">
                  <div className="esp-stat-label">SLA COMPLIANCE</div>
                  <div className="esp-stat-value">94.2%</div>
                  <div className="esp-stat-note">response · 30 days</div>
                </div>

                <div className="esp-stat-card green">
                  <div className="esp-stat-label">AVERAGE TIME TO FIX</div>
                  <div className="esp-stat-value">6.4h</div>
                  <div className="esp-stat-note">-25% since shadow mode</div>
                </div>

                <div className="esp-stat-card gold">
                  <div className="esp-stat-label">REOPEN RATE</div>
                  <div className="esp-stat-value">4.1%</div>
                  <div className="esp-stat-note">target below 5%</div>
                </div>

                <div className="esp-stat-card purple">
                  <div className="esp-stat-label">FIRST-CONTACT RES.</div>
                  <div className="esp-stat-value">38%</div>
                  <div className="esp-stat-note">+8.1 pps</div>
                </div>

                <div className="esp-stat-card green">
                  <div className="esp-stat-label">TRIAGE AGREEMENT</div>
                  <div className="esp-stat-value">92%</div>
                  <div className="esp-stat-note">golden set n=200</div>
                </div>
              </div>

              {/* 3 Panels (Row 2) */}
              <div className="esp-reports-grid-3">
                {/* Ageing by priority */}
                <div className="esp-subpanel">
                  <h3 className="esp-panel-title">Ageing by priority</h3>
                  <div className="esp-prio-chart">
                    {/* 0-1d */}
                    <div className="esp-prio-col">
                      <div className="esp-prio-bars">
                        <div className="esp-prio-bar p1" style={{ height: "45px" }} />
                        <div className="esp-prio-bar p2" style={{ height: "65px" }} />
                        <div className="esp-prio-bar p3" style={{ height: "30px" }} />
                      </div>
                      <span className="esp-prio-label">0-1d</span>
                    </div>

                    {/* 2-3d */}
                    <div className="esp-prio-col">
                      <div className="esp-prio-bars">
                        <div className="esp-prio-bar p1" style={{ height: "20px" }} />
                        <div className="esp-prio-bar p2" style={{ height: "55px" }} />
                        <div className="esp-prio-bar p3" style={{ height: "40px" }} />
                      </div>
                      <span className="esp-prio-label">2-3d</span>
                    </div>

                    {/* 4-5d */}
                    <div className="esp-prio-col">
                      <div className="esp-prio-bars">
                        <div className="esp-prio-bar p1" style={{ height: "15px" }} />
                        <div className="esp-prio-bar p2" style={{ height: "35px" }} />
                        <div className="esp-prio-bar p3" style={{ height: "20px" }} />
                      </div>
                      <span className="esp-prio-label">4-5d</span>
                    </div>

                    {/* 5d+ */}
                    <div className="esp-prio-col">
                      <div className="esp-prio-bars">
                        <div className="esp-prio-bar p1" style={{ height: "10px" }} />
                        <div className="esp-prio-bar p2" style={{ height: "18px" }} />
                        <div className="esp-prio-bar p3" style={{ height: "28px" }} />
                      </div>
                      <span className="esp-prio-label">5d+</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: "#64748b", marginTop: "8px" }}>
                    <span>■ P1</span>
                    <span>■ P2</span>
                    <span>■ P3</span>
                    <span style={{ color: "#94a3b8" }}>buckets: 0-1d · 2-3d · 4-5d · 5d+</span>
                  </div>
                </div>

                {/* MTTR trend — 12 weeks */}
                <div className="esp-subpanel">
                  <h3 className="esp-panel-title">MTTR trend — 12 weeks</h3>
                  <div className="esp-mttr-chart">
                    <svg width="100%" height="70" viewBox="0 0 240 70" fill="none">
                      {/* Target dashed line */}
                      <line x1="10" y1="42" x2="230" y2="42" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
                      {/* Trend downward curve */}
                      <path d="M10 25 Q 70 20, 120 38 T 230 45" fill="none" stroke="#2563eb" strokeWidth="2" />
                    </svg>
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.3" }}>
                    Solid: measured MTTR (h). Dashed: contract target. Shadow mode start at week 5.
                  </div>
                </div>

                {/* Breach probability — open tickets */}
                <div className="esp-subpanel">
                  <h3 className="esp-panel-title">Breach probability — open tickets</h3>
                  <div className="esp-breach-list">
                    <div className="esp-breach-row">
                      <span className="esp-breach-id">INC-1047</span>
                      <div className="esp-breach-track">
                        <div className="esp-breach-fill" style={{ width: "78%" }} />
                      </div>
                      <span className="esp-breach-score">0.78</span>
                    </div>

                    <div className="esp-breach-row">
                      <span className="esp-breach-id">INC-1043</span>
                      <div className="esp-breach-track">
                        <div className="esp-breach-fill" style={{ width: "66%" }} />
                      </div>
                      <span className="esp-breach-score">0.66</span>
                    </div>

                    <div className="esp-breach-row">
                      <span className="esp-breach-id">INC-1045</span>
                      <div className="esp-breach-track">
                        <div className="esp-breach-fill" style={{ width: "61%" }} />
                      </div>
                      <span className="esp-breach-score">0.61</span>
                    </div>

                    <div className="esp-breach-row">
                      <span className="esp-breach-id">INC-1038</span>
                      <div className="esp-breach-track">
                        <div className="esp-breach-fill" style={{ width: "44%" }} />
                      </div>
                      <span className="esp-breach-score">0.44</span>
                    </div>

                    <div className="esp-breach-row">
                      <span className="esp-breach-id">INC-1041</span>
                      <div className="esp-breach-track">
                        <div className="esp-breach-fill" style={{ width: "31%" }} />
                      </div>
                      <span className="esp-breach-score">0.31</span>
                    </div>
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#94a3b8", marginTop: "8px", lineHeight: "1.3" }}>
                    Numeric model produces the score; the LLM only narrates it. Scores never change contractual priority.
                  </div>
                </div>
              </div>

              {/* Share-ready packs (Row 3) */}
              <div className="esp-packs-container">
                <h3 className="esp-panel-title">Share-ready packs</h3>
                <div className="esp-packs-grid">
                  {/* Card 1: For Management */}
                  <div className="esp-pack-card">
                    <span className="esp-pack-tag">FOR MANAGEMENT</span>
                    <h4 className="esp-pack-title">Monthly operations review</h4>
                    <p className="esp-pack-sub">Outcome KPIs, phase progress and risk — board-ready, no ticket content</p>

                    <span className="esp-pack-chart-title">WEEKLY CLOSURES · LAST 6 WEEKS</span>
                    <div className="esp-pack-bars">
                      <div className="esp-pack-bar" style={{ height: "30%" }} />
                      <div className="esp-pack-bar" style={{ height: "50%" }} />
                      <div className="esp-pack-bar" style={{ height: "45%" }} />
                      <div className="esp-pack-bar" style={{ height: "65%" }} />
                      <div className="esp-pack-bar" style={{ height: "85%" }} />
                      <div className="esp-pack-bar" style={{ height: "100%" }} />
                    </div>

                    <ul className="esp-pack-bullets">
                      <li>SLA compliance and MTTR trend vs target</li>
                      <li>Backlog inflow vs closure by week</li>
                      <li>Automation adoption and acceptance rate</li>
                      <li>Cost per ticket vs budget cap</li>
                    </ul>

                    <button type="button" className="esp-pack-btn">
                      Generate & share
                    </button>
                  </div>

                  {/* Card 2: For the Customer */}
                  <div className="esp-pack-card">
                    <span className="esp-pack-tag">FOR THE CUSTOMER</span>
                    <h4 className="esp-pack-title">Service review – Cordell Group</h4>
                    <p className="esp-pack-sub">Contract-scoped only; their tickets, their SLA, their trend. Nothing cross-customer.</p>

                    <span className="esp-pack-chart-title">RESOLUTION % · LAST 6 MONTHS</span>
                    <div className="esp-pack-bars">
                      <div className="esp-pack-bar" style={{ height: "40%" }} />
                      <div className="esp-pack-bar" style={{ height: "55%" }} />
                      <div className="esp-pack-bar" style={{ height: "65%" }} />
                      <div className="esp-pack-bar" style={{ height: "75%" }} />
                      <div className="esp-pack-bar" style={{ height: "90%" }} />
                      <div className="esp-pack-bar" style={{ height: "95%" }} />
                    </div>

                    <ul className="esp-pack-bullets">
                      <li>Response and resolution SLA vs contract</li>
                      <li>Ticket volume by module and priority</li>
                      <li>Top recurring problems and prevention actions</li>
                      <li>Improvement plan agreed at last review</li>
                    </ul>

                    <button type="button" className="esp-pack-btn">
                      Generate & share
                    </button>
                  </div>
                </div>
              </div>

              {/* Natural language report footer note */}
              <div className="esp-bottom-note">
                <strong>Natural-language report</strong> · Runs SELECT-only, row-limited, customer-scoped SQL against curated views.
              </div>
            </>
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : (
            /* Other Option Placeholder (Screenshot 3) */
            <div className="esp-other-section">
              <h1 className="esp-page-title">{currentNav.label}</h1>
              <p className="esp-page-subtitle">This option is clicked</p>
              <div className="esp-placeholder-card">
                <p style={{ color: "#64748b", margin: 0 }}>
                  Showing content for <strong>{currentNav.label}</strong>. You can navigate to other options from the left sidebar or return to <strong>Executive Dashboard</strong>.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Executive Dashboard" userEmail={emailParam} />
    </div>
  );
};

export default ExecutiveSponsorPage;
