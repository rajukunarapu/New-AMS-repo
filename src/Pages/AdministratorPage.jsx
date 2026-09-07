import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/AdministratorPage.css";
import TopBar from "../Layouts/TopBar";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";



const navItemsList = [
  { id: "agent-health", label: "Agent Health" },
  { id: "model-management", label: "Model Management" },
  { id: "prompt-library", label: "Prompt Library" },
  { id: "workflow-builder", label: "Workflow Builder" },
  { id: "ticket-sorting", label: "Ticket Sorting" },
  { id: "ticket-assignment", label: "Ticket Assignment" },
  { id: "settings", label: "Settings" },
  { id: "email-integration", label: "Email Integration" },
  { id: "incoming-email", label: "Incoming Email" },
  { id: "customer-onboarding", label: "Customer Onboarding" },
  { id: "people-access", label: "People & Access" },
  { id: "notifications", label: "Notifications" },
  { id: "agent-run", label: "Agent Run" },
  { id: "activity-history", label: "Activity History" },
  { id: "analytics", label: "Analytics" },
  { id: "executive-dashboard", label: "Executive Dashboard" },
  { id: "neoai", label: "NeoAI" },
];

const AdministratorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("agent-health");

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";

  // getUserInfo from util
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Agent Health",
  };

  // SearchText
  const [searchText, setSearchText] = useState("");

  return (
    <div className="adp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar setSearchText={setSearchText} searchText={searchText} onNotificationClick={() => setActiveNav("notifications")} />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="adp-body-layout">
        {/* Sidebar */}
        <aside className="adp-sidebar">
          {/* Top Identity Block with Interactive Exit Button */}
          <div className="adp-identity-row">
            <div className="adp-identity-user">
              <div className="adp-sidebar-avatar">{userInitial}</div>
              <span className="adp-sidebar-name">{userName}</span>
            </div>
            <button
              type="button"
              className="adp-exit-btn"
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

          {/* 1. PLATFORM */}
          <div className="adp-nav-group">
            <div className="adp-nav-group-title">PLATFORM</div>
            <button
              type="button"
              className={`adp-nav-item ${activeNav === "agent-health" ? "active" : ""}`}
              onClick={() => setActiveNav("agent-health")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              <span>Agent Health</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "model-management" ? "active" : ""}`}
              onClick={() => setActiveNav("model-management")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </span>
              <span>Model Management</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "prompt-library" ? "active" : ""}`}
              onClick={() => setActiveNav("prompt-library")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </span>
              <span>Prompt Library</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "workflow-builder" ? "active" : ""}`}
              onClick={() => setActiveNav("workflow-builder")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <line x1="8.59" y1="8.59" x2="15.42" y2="15.42" />
                  <polyline points="10 18 18 18 18 10" />
                </svg>
              </span>
              <span>Workflow Builder</span>
            </button>
          </div>

          {/* 2. AUTOMATION */}
          <div className="adp-nav-group">
            <div className="adp-nav-group-title">AUTOMATION</div>
            <button
              type="button"
              className={`adp-nav-item ${activeNav === "ticket-sorting" ? "active" : ""}`}
              onClick={() => setActiveNav("ticket-sorting")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </span>
              <span>Ticket Sorting</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "ticket-assignment" ? "active" : ""}`}
              onClick={() => setActiveNav("ticket-assignment")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </span>
              <span>Ticket Assignment</span>
            </button>
          </div>

          {/* 3. CONFIGURATION */}
          <div className="adp-nav-group">
            <div className="adp-nav-group-title">CONFIGURATION</div>
            <button
              type="button"
              className={`adp-nav-item ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span>Settings</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "email-integration" ? "active" : ""}`}
              onClick={() => setActiveNav("email-integration")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <span>Email Integration</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "incoming-email" ? "active" : ""}`}
              onClick={() => setActiveNav("incoming-email")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </span>
              <span>Incoming Email</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "customer-onboarding" ? "active" : ""}`}
              onClick={() => setActiveNav("customer-onboarding")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-3" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
              </span>
              <span>Customer Onboarding</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "people-access" ? "active" : ""}`}
              onClick={() => setActiveNav("people-access")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>People & Access</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => setActiveNav("notifications")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>
          </div>

          {/* 4. OVERSIGHT */}
          <div className="adp-nav-group">
            <div className="adp-nav-group-title">OVERSIGHT</div>
            <button
              type="button"
              className={`adp-nav-item ${activeNav === "agent-run" ? "active" : ""}`}
              onClick={() => setActiveNav("agent-run")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
              <span>Agent Run</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "activity-history" ? "active" : ""}`}
              onClick={() => setActiveNav("activity-history")}
            >
              <span className="adp-nav-icon">
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
              className={`adp-nav-item ${activeNav === "analytics" ? "active" : ""}`}
              onClick={() => setActiveNav("analytics")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span>Analytics</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "executive-dashboard" ? "active" : ""}`}
              onClick={() => setActiveNav("executive-dashboard")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </span>
              <span>Executive Dashboard</span>
            </button>

            <button
              type="button"
              className={`adp-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => setActiveNav("neoai")}
            >
              <span className="adp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="adp-content">
          {activeNav === "agent-health" ? (
            <>
              {/* Header */}
              <h1 className="adp-page-title">Agent Health</h1>
              <p className="adp-page-subtitle">
                The LangGraph state graph in operation: checkpoints, in-flight runs, interrupts awaiting a human, retries and the dead-letter queue.
              </p>

              {/* 4 Agent Status Cards */}
              <div className="adp-agent-grid">
                {/* Card 1: Triage & Assignment */}
                <div className="adp-agent-card">
                  <div className="adp-agent-header">
                    <h3 className="adp-agent-title">
                      <span className="adp-agent-dot">■</span> Triage & Assignment
                    </h3>
                    <span className="adp-agent-status">Idle</span>
                  </div>
                  <div className="adp-agent-trigger">Trigger: TicketEmailReceived</div>
                  <div className="adp-agent-stats">41 today &nbsp;errors 0 &nbsp;fallback 0</div>
                  <div className="adp-agent-node">current node: awaiting event</div>
                  <button type="button" className="adp-inspect-btn">
                    Inspect graph
                  </button>
                </div>

                {/* Card 2: SLA & Notification */}
                <div className="adp-agent-card">
                  <div className="adp-agent-header">
                    <h3 className="adp-agent-title">
                      <span className="adp-agent-dot">■</span> SLA & Notification
                    </h3>
                    <span className="adp-agent-status running">Running</span>
                  </div>
                  <div className="adp-agent-trigger">Trigger: Created / Assigned / Status / Priority</div>
                  <div className="adp-agent-stats">118 today &nbsp;errors 0 &nbsp;fallback 0</div>
                  <div className="adp-agent-node">current node: timer reconcile</div>
                  <button type="button" className="adp-inspect-btn">
                    Inspect graph
                  </button>
                </div>

                {/* Card 3: 360° Monitoring */}
                <div className="adp-agent-card">
                  <div className="adp-agent-header">
                    <h3 className="adp-agent-title">
                      <span className="adp-agent-dot">■</span> 360° Monitoring
                    </h3>
                    <span className="adp-agent-status running">Running</span>
                  </div>
                  <div className="adp-agent-trigger">Trigger: Events, timer expiry, scheduled scan</div>
                  <div className="adp-agent-stats">95 today &nbsp;errors 1 &nbsp;fallback 1</div>
                  <div className="adp-agent-node">current node: summarize_thread</div>
                  <button type="button" className="adp-inspect-btn">
                    Inspect graph
                  </button>
                </div>

                {/* Card 4: Reporting & Predictive */}
                <div className="adp-agent-card">
                  <div className="adp-agent-header">
                    <h3 className="adp-agent-title">
                      <span className="adp-agent-dot">■</span> Reporting & Predictive
                    </h3>
                    <span className="adp-agent-status">Idle</span>
                  </div>
                  <div className="adp-agent-trigger">Trigger: Schedule + on demand</div>
                  <div className="adp-agent-stats">12 today &nbsp;errors 0 &nbsp;fallback 0</div>
                  <div className="adp-agent-node">current node: awaiting schedule</div>
                  <button type="button" className="adp-inspect-btn">
                    Inspect graph
                  </button>
                </div>
              </div>

              {/* Lower Split Grid (In-flight runs vs Event bus health) */}
              <div className="adp-split-grid">
                {/* In-flight runs and checkpoints */}
                <div className="adp-panel">
                  <h3 className="adp-panel-title">In-flight runs and checkpoints</h3>
                  <table className="adp-runs-table">
                    <thead>
                      <tr>
                        <th>RUN</th>
                        <th>TICKET</th>
                        <th>NODE</th>
                        <th>STATE</th>
                        <th>AGE</th>
                        <th>RETRIES</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="adp-run-id">RUN-10482</td>
                        <td>INC-1047</td>
                        <td>escalation_gate</td>
                        <td>
                          <span className="adp-state-badge interrupt">Interrupt — awaiting human</span>
                        </td>
                        <td>6m</td>
                        <td>0</td>
                        <td>
                          <button type="button" className="adp-resolve-btn">Resolve</button>
                        </td>
                      </tr>

                      <tr>
                        <td className="adp-run-id">RUN-10479</td>
                        <td>INC-1045</td>
                        <td>confidence_gate</td>
                        <td>
                          <span className="adp-state-badge interrupt">Interrupt — awaiting human</span>
                        </td>
                        <td>22m</td>
                        <td>0</td>
                        <td>
                          <button type="button" className="adp-resolve-btn">Resolve</button>
                        </td>
                      </tr>

                      <tr>
                        <td className="adp-run-id">RUN-10474</td>
                        <td>INC-1043</td>
                        <td>notify_escalation</td>
                        <td>
                          <span className="adp-state-badge completed">Completed</span>
                        </td>
                        <td>31m</td>
                        <td>1</td>
                        <td>
                          <button type="button" className="adp-resolve-btn">Resolve</button>
                        </td>
                      </tr>

                      <tr>
                        <td className="adp-run-id">RUN-10468</td>
                        <td>INC-1041</td>
                        <td>assign_ticket</td>
                        <td>
                          <span className="adp-state-badge completed">Completed</span>
                        </td>
                        <td>58m</td>
                        <td>0</td>
                        <td>
                          <button type="button" className="adp-resolve-btn">Resolve</button>
                        </td>
                      </tr>

                      <tr>
                        <td className="adp-run-id">RUN-10455</td>
                        <td>INC-1038</td>
                        <td>summarise_thread</td>
                        <td>
                          <span className="adp-state-badge dead-letter">Dead-lettered</span>
                        </td>
                        <td>2h</td>
                        <td>3</td>
                        <td>
                          <button type="button" className="adp-resolve-btn">Resolve</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Event bus health */}
                <div className="adp-panel">
                  <h3 className="adp-panel-title">Event bus health</h3>
                  <table className="adp-bus-table">
                    <tbody>
                      <tr>
                        <td className="adp-bus-label">Queue depth</td>
                        <td className="adp-bus-val">3</td>
                      </tr>
                      <tr>
                        <td className="adp-bus-label">Oldest message age</td>
                        <td className="adp-bus-val">1.2s</td>
                      </tr>
                      <tr>
                        <td className="adp-bus-label">DLQ depth</td>
                        <td className="adp-bus-val">1</td>
                      </tr>
                      <tr>
                        <td className="adp-bus-label">Delivery</td>
                        <td className="adp-bus-val">at-least-once + event_id dedupe</td>
                      </tr>
                      <tr>
                        <td className="adp-bus-label">Outbox lag</td>
                        <td className="adp-bus-val">0.4s</td>
                      </tr>
                      <tr>
                        <td className="adp-bus-label">Replay window</td>
                        <td className="adp-bus-val">7 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : (
            /* Other Option Placeholder */
            <div className="adp-other-section">
              <h1 className="adp-page-title">{currentNav.label}</h1>
              <p className="adp-page-subtitle">This option is clicked</p>
              <div className="adp-placeholder-card">
                <p style={{ color: "#64748b", margin: 0 }}>
                  Showing content for <strong>{currentNav.label}</strong>. You can navigate to other options from the left sidebar or return to <strong>Agent Health</strong>.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Platform Administrator Console" userEmail={emailParam} />
    </div>
  );
};

export default AdministratorPage;
