import React from 'react';
import { Skeleton } from '@mui/material';

export default function SupportDashboard({
  tickets = [],
  loadingTickets = false,
  handleNavClick = () => {},
  handleTicketListRowClick = () => {},
  unassignedTicketsCount = 0,
  slaRiskTicketsCount = 0
}) {
  const openTicketsCount = tickets && tickets.length > 0 ? (tickets.length >= 20 ? 20 : tickets.length) : 20;
  const unassignedCount = unassignedTicketsCount !== undefined ? unassignedTicketsCount : 5;
  const slaRiskCount = slaRiskTicketsCount !== undefined ? slaRiskTicketsCount : 0;

  return (
    <div className="cons-dashboard-wrap">
      {/* Breadcrumb */}
      <div className="cons-breadcrumb-row">
        <span className="cons-breadcrumb-muted">MODULE LEAD</span>
        <span className="cons-breadcrumb-sep">›</span>
        <span className="cons-breadcrumb-curr">OVERVIEW</span>
      </div>

      {/* Title & Subtitle */}
      <div className="cons-page-header-row">
        <h1 className="cons-dashboard-title">Support Dashboard</h1>
        <p className="cons-dashboard-subtitle">
          Your shift at a glance — assigned work, clocks about to warn, AI assistance used and the notifications that reached you.
        </p>
      </div>

      {/* Info Hint Banner */}
      <div className="cons-info-banner">
        <div className="cons-info-banner-left">
          <span className="cons-info-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <span>Click any figure, ageing bucket, module or timeline entry to open the tickets behind it.</span>
        </div>
        <div className="cons-info-keybadge">⌘ K</div>
      </div>

      {/* Section Header */}
      {/* <div className="cons-section-header">
        <div className="cons-section-eyebrow">ASSIGNED WORK</div>
        <h2 className="cons-section-heading">My work, in motion</h2>
      </div> */}

      {/* ── Top 4 Metric Cards (Row 1) ── */}
      <div className="cons-stat-grid-4">
        {/* Card 1: OPEN IN MY TEAM */}
        <div
          className="cons-stat-card cons-card-emerald"
          onClick={() => handleNavClick("ticket-list")}
          role="button"
          tabIndex={0}
        >
          <div className="cons-stat-watermark">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="cons-stat-header">
            <div className="cons-icon-bubble cons-bubble-emerald">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="cons-stat-label">OPEN IN MY TEAM</span>
          </div>
          <div className="cons-stat-body">
            <span className="cons-stat-big-num">
              {loadingTickets ? <Skeleton width={40} height={24} /> : openTicketsCount}
            </span>
            <span className="cons-pill-badge cons-pill-emerald">
              Active Queue <span className="cons-pill-chevron">›</span>
            </span>
          </div>
          <div className="cons-stat-footer">
            <span>SAP FICO · click to open the list</span>
          </div>
        </div>

        {/* Card 2: AWAITING MY ALLOCATION */}
        <div
          className="cons-stat-card cons-card-teal"
          onClick={() => handleNavClick("ticket-assignment")}
          role="button"
          tabIndex={0}
        >
          <div className="cons-stat-watermark">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          </div>
          <div className="cons-stat-header">
            <div className="cons-icon-bubble cons-bubble-teal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <span className="cons-stat-label">AWAITING MY ALLOCATION</span>
          </div>
          <div className="cons-stat-body">
            <span className="cons-stat-big-num">
              {loadingTickets ? <Skeleton width={40} height={24} /> : unassignedCount}
            </span>
            <span className="cons-pill-badge cons-pill-teal">
              Unassigned <span className="cons-pill-chevron">›</span>
            </span>
          </div>
          <div className="cons-stat-footer">
            <span>routed to my module by the agent</span>
          </div>
        </div>

        {/* Card 3: SLA AT RISK */}
        <div
          className="cons-stat-card cons-card-amber"
          onClick={() => handleNavClick("needs-attention")}
          role="button"
          tabIndex={0}
        >
          <div className="cons-stat-watermark">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="cons-stat-header">
            <div className="cons-icon-bubble cons-bubble-amber">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="cons-stat-label">SLA AT RISK</span>
          </div>
          <div className="cons-stat-body">
            <span className="cons-stat-big-num">
              {loadingTickets ? <Skeleton width={40} height={24} /> : slaRiskCount}
            </span>
            <span className="cons-pill-badge cons-pill-amber">
              At Risk <span className="cons-pill-chevron">›</span>
            </span>
          </div>
          <div className="cons-stat-footer">
            <span>above 75% of the resolution target</span>
          </div>
        </div>

        {/* Card 4: WITH THE CUSTOMER */}
        <div
          className="cons-stat-card cons-card-purple"
          onClick={() => handleNavClick("ticket-list")}
          role="button"
          tabIndex={0}
        >
          <div className="cons-stat-watermark">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
          <div className="cons-stat-header">
            <div className="cons-icon-bubble cons-bubble-purple">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span className="cons-stat-label">WITH THE CUSTOMER</span>
          </div>
          <div className="cons-stat-body">
            <span className="cons-stat-big-num">
              {loadingTickets ? <Skeleton width={40} height={32} /> : 2}
            </span>
            <span className="cons-pill-badge cons-pill-purple">
              Paused <span className="cons-pill-chevron">›</span>
            </span>
          </div>
          <div className="cons-stat-footer">
            <span>clock paused where the contract allows</span>
          </div>
        </div>
      </div>

      {/* ── 4 Middle Panels Grid (Row 2) ── */}
      <div className="cons-panel-grid-4">
        {/* Panel 1: Ageing */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">Ageing</h3>
            <span className="cons-panel-badge-neutral">{openTicketsCount} open</span>
          </div>

          <div className="cons-ageing-list">
            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">Under 4 hours</span>
                <span className="cons-ageing-count">10</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill" style={{ width: "50%" }} />
              </div>
            </div>

            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">4 to 24 hours</span>
                <span className="cons-ageing-count">9</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill cons-fill-amber" style={{ width: "45%" }} />
              </div>
            </div>

            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">1 to 3 days</span>
                <span className="cons-ageing-count">1</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill" style={{ width: "8%" }} />
              </div>
            </div>

            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">Over 3 days</span>
                <span className="cons-ageing-count">0</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill" style={{ width: "0%" }} />
              </div>
            </div>
          </div>

          <div className="cons-ageing-footer">
            <span className="cons-ageing-wip">WIP limit 6</span>
            <span className="cons-ageing-status">
              <span className="cons-dot-green">●</span> within target
            </span>
          </div>
        </div>

        {/* Panel 2: SAP FICO team performance */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">SAP FICO team performance</h3>
          </div>
          <p style={{ fontSize: 11, color: "#64748b", margin: "-6px 0 12px", lineHeight: 1.4 }}>
            Your SAP FICO team, within current customer scope.
          </p>

          <div className="cons-ageing-list">
            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">First reply</span>
                <span className="cons-ageing-count">34 min</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill" style={{ width: "56%", background: "#059669" }} />
              </div>
              <span style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>team average · target 60 min</span>
            </div>

            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">Time to fix</span>
                <span className="cons-ageing-count">7.4 h</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill" style={{ width: "86%", background: "#0284c7" }} />
              </div>
              <span style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>team average · target 8 h</span>
            </div>

            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">Breached</span>
                <span className="cons-ageing-count" style={{ color: "#d97706" }}>2 of 61</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill cons-fill-amber" style={{ width: "8%" }} />
              </div>
              <span style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>3.3% this month</span>
            </div>

            <div className="cons-ageing-row">
              <div className="cons-ageing-top">
                <span className="cons-ageing-name">Closed this week</span>
                <span className="cons-ageing-count">41</span>
              </div>
              <div className="cons-ageing-track">
                <div className="cons-ageing-fill" style={{ width: "75%", background: "#10b981" }} />
              </div>
              <span style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>38 last week</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Opened and closed, last 7 days */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">Opened and closed, last 7 days</h3>
            <span className="cons-panel-badge-live">
              <span className="cons-pulse-dot" /> live
            </span>
          </div>

          <div className="cons-chart-container">
            <div className="cons-bar-chart">
              {[
                { day: "Mon", opened: 50, closed: 60 },
                { day: "Tue", opened: 70, closed: 45 },
                { day: "Wed", opened: 55, closed: 78 },
                { day: "Thu", opened: 68, closed: 52 },
                { day: "Fri", opened: 82, closed: 96 },
                { day: "Sat", opened: 24, closed: 18 },
                { day: "Sun", opened: 20, closed: 14 },
              ].map((d) => (
                <div className="cons-chart-col" key={d.day}>
                  <div className="cons-bar-pair">
                    <div className="cons-bar cons-bar-opened" style={{ height: `${d.opened}%` }} title={`Opened: ${d.opened}`} />
                    <div className="cons-bar cons-bar-closed" style={{ height: `${d.closed}%` }} title={`Closed: ${d.closed}`} />
                  </div>
                  <span className="cons-chart-label">{d.day}</span>
                </div>
              ))}
            </div>

            <div className="cons-chart-legend">
              <div className="cons-legend-item">
                <span className="cons-legend-swatch cons-swatch-opened" />
                <span>Opened</span>
              </div>
              <div className="cons-legend-item">
                <span className="cons-legend-swatch cons-swatch-closed" />
                <span>Closed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 4: Today, In order */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">Today, In order</h3>
            <span className="cons-panel-badge-neutral">Timeline</span>
          </div>

          <div className="cons-activity-list">
            {[
              { time: "08:00", title: "Shift handover complete", detail: "11 open, 2 at risk, no overnight breaches", color: "green" },
              { time: "09:35", title: "Reassigned INC-1042", detail: "MM skill match — R. Iyer picked it up in 4 min", color: "blue" },
              { time: "11:20", title: "Approved escalation on INC-1043", detail: "Basis team joined, customer informed", color: "amber" },
              { time: "15:40", title: "Weekly review pack generated", detail: "Sent to delivery head and account leads", color: "green" },
            ].map((ev, idx) => (
              <div className="cons-activity-item" key={idx} style={{ cursor: "default" }}>
                <div className="cons-activity-left">
                  <div className="cons-activity-meta">
                    <span className="cons-activity-time">{ev.time}</span>
                    <span className={`cons-activity-dot cons-dot-${ev.color === "green" ? "green" : "amber"}`}>●</span>
                  </div>
                  <div className="cons-activity-title">{ev.title}</div>
                  <div className="cons-activity-sub">{ev.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3 Bottom Panels Grid (Row 3) ── */}
      <div className="cons-panel-grid">
        {/* Panel 1: Where the work sits */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">Where the work sits</h3>
            <span className="cons-panel-badge-neutral">5 modules</span>
          </div>

          <div className="cons-ageing-list">
            {[
              { name: "SAP MM", count: 3, width: "60%", color: "#059669" },
              { name: "SAP FICO", count: 2, width: "40%", color: "#0284c7" },
              { name: "SAP PP-QM", count: 2, width: "40%", color: "#6366f1" },
              { name: "SAP FICO / Accounts Payable", count: 1, width: "20%", color: "#f59e0b" },
              { name: "ABAP", count: 1, width: "20%", color: "#8b5cf6" },
            ].map((m) => (
              <div className="cons-ageing-row" key={m.name}>
                <div className="cons-ageing-top">
                  <span className="cons-ageing-name">{m.name}</span>
                  <span className="cons-ageing-count">{m.count}</span>
                </div>
                <div className="cons-ageing-track">
                  <div className="cons-ageing-fill" style={{ width: m.width, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: My work */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">My work</h3>
            <span className="cons-panel-badge-neutral">Recent queue</span>
          </div>

          <div className="cons-activity-list">
            {(tickets.length > 0 ? tickets.slice(0, 4) : [
              { ticketNo: "INC-1041", time: "23:20:53", remarks: "Cannot post AP invoice in FB60 after July deployment", clientName: "Vantage Foods", status: "Awaiting Allocation" },
              { ticketNo: "INC-1045", time: "26:04:53", remarks: "Pricing condition wrong AND output determination missing", clientName: "Northwind Retail", status: "Needs Triage" },
              { ticketNo: "INC-1044", time: "paused", remarks: "F110 payment proposal missing 14 vendors", clientName: "Cordell Group", status: "Pending Customer Action" },
              { ticketNo: "INC-1049", time: "17:20:53", remarks: "Depreciation run AFAB stalled — no activity 34h", clientName: "Vantage Foods", status: "In Progress" },
            ]).map((w, idx) => {
              const tNo = w.ticketNo || `INC-${1040 + idx}`;
              const tSubject = w.remarks || "No subject";
              const tClient = w.clientName || "Vantage Foods";
              const tStatus = w.ticketStatus || w.status || "In Progress";
              const tTime = w.time || "23:20:53";

              return (
                <div
                  className="cons-activity-item"
                  key={tNo + idx}
                  onClick={() => handleTicketListRowClick(w)}
                  title="Click to view ticket details"
                  role="button"
                  tabIndex={0}
                >
                  <div className="cons-activity-left">
                    <div className="cons-activity-meta">
                      <span className="cons-activity-time">{tTime}</span>
                      <span className="cons-activity-dot cons-dot-green">●</span>
                      <span className="cons-activity-status cons-status-green">{tStatus}</span>
                    </div>
                    <div className="cons-activity-title">{tNo} · {tSubject}</div>
                    <div className="cons-activity-sub">{tClient}</div>
                  </div>
                  <div className="cons-activity-chevron">›</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 3: Notifications that reached me */}
        <div className="cons-panel-card">
          <div className="cons-panel-header">
            <h3 className="cons-panel-title">Notifications that reached me</h3>
            <span className="cons-panel-badge-live">
              <span className="cons-pulse-dot" /> live
            </span>
          </div>

          <div className="cons-activity-list">
            {[
              {
                title: "SLA warning · T4",
                time: "09:41",
                desc: "INC-1043 resolution SLA at 91%. Escalation path: Basis team, then account lead.",
                sub: "EMAIL + TEAMS · NTF-8AA1-1043-90",
                color: "amber",
              },
              {
                title: "Assignment · T3",
                time: "09:12",
                desc: "INC-1041 assigned to you by K. Menon after accepting the AI recommendation.",
                sub: "TEAMS · NTF-9A12-1041-AS",
                color: "green",
              },
              {
                title: "Acknowledgement · T2",
                time: "08:44",
                desc: "Acknowledgement sent to Vantage Foods for INC-1041 with the structured summary.",
                sub: "EMAIL TO CUSTOMER · NTF-8A44-1041-ACK",
                color: "green",
              },
              {
                title: "Breach risk · T16",
                time: "07:40",
                desc: "INC-1047 breach probability 0.78 — duty manager notified once (idempotent).",
                sub: "TEAMS + SMS · NTF-7A40-1047-BRK",
                color: "amber",
              },
            ].map((n, idx) => (
              <div className="cons-activity-item" key={idx} style={{ cursor: "default" }}>
                <div className="cons-activity-left">
                  <div className="cons-activity-meta">
                    <span className="cons-activity-time">{n.time}</span>
                    <span className={`cons-activity-dot cons-dot-${n.color === "green" ? "green" : "amber"}`}>●</span>
                    <span className={`cons-activity-status cons-status-${n.color === "green" ? "green" : "amber"}`}>{n.title}</span>
                  </div>
                  <div className="cons-activity-title" style={{ fontWeight: 500, fontSize: 11 }}>{n.desc}</div>
                  <div className="cons-activity-sub" style={{ fontSize: 9.5, textTransform: "uppercase" }}>{n.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

