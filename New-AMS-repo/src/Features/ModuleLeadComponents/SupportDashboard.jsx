import React from 'react';
import { Skeleton } from '@mui/material';

export default function SupportDashboard({
  tickets,
  loadingTickets,
  handleNavClick,
  handleTicketListRowClick,
  unassignedTicketsCount,
  slaRiskTicketsCount
}) {
  return (
    <div className="mlp-sd-container">
      <div>
        <h1 className="mlp-page-title">Support Dashboard</h1>
        <p className="mlp-page-subtitle">
          Your shift at a glance — assigned work, clocks about to warn, AI assistance used and the notifications that reached you.
        </p>
        <p className="mlp-page-instruction">
          Click any figure, ageing bucket, module or timeline entry to open the tickets behind it.
        </p>
      </div>

      {/* ── 4 Top Metric Cards (Row 1) ── */}
      <div className="mlp-sd-stat-grid-4">
        <div className="mlp-sd-stat-card blue" onClick={() => handleNavClick("ticket-list")}>
          <span className="mlp-sd-stat-label">OPEN IN MY TEAM</span>
          <span className="mlp-sd-stat-value">
            {loadingTickets ? <Skeleton width={40} height={28} /> : (tickets.length > 0 ? (tickets.length >= 20 ? 20 : tickets.length) : 20)}
          </span>
          <span className="mlp-sd-stat-note">SAP FICO · click to open the list</span>
        </div>

        <div className="mlp-sd-stat-card green" onClick={() => handleNavClick("ticket-list")}>
          <span className="mlp-sd-stat-label">AWAITING MY ALLOCATION</span>
          <span className="mlp-sd-stat-value">
            {loadingTickets ? <Skeleton width={40} height={28} /> : unassignedTicketsCount || 5}
          </span>
          <span className="mlp-sd-stat-note">routed to my module by the agent</span>
        </div>

        <div className="mlp-sd-stat-card gold" onClick={() => handleNavClick("ticket-list")}>
          <span className="mlp-sd-stat-label">SLA AT RISK</span>
          <span className="mlp-sd-stat-value">
            {loadingTickets ? <Skeleton width={40} height={28} /> : slaRiskTicketsCount || 0}
          </span>
          <span className="mlp-sd-stat-note">above 75% of the resolution target</span>
        </div>

        <div className="mlp-sd-stat-card purple" onClick={() => handleNavClick("ticket-list")}>
          <span className="mlp-sd-stat-label">WITH THE CUSTOMER</span>
          <span className="mlp-sd-stat-value">
            {loadingTickets ? <Skeleton width={40} height={28} /> : 2}
          </span>
          <span className="mlp-sd-stat-note">clock paused where the contract allows</span>
        </div>
      </div>

      {/* ── 4 Middle Panels Grid (Row 2) ── */}
      <div className="mlp-sd-panel-grid-4">
        {/* Panel 1: Ageing */}
        <div className="mlp-sd-panel">
          <div className="mlp-sd-panel-header">
            <h3 className="mlp-sd-panel-title">Ageing</h3>
            <span className="mlp-sd-panel-meta">20 open</span>
          </div>
          <div className="mlp-sd-ageing-list">
            <div className="mlp-sd-ageing-row">
              <div className="mlp-sd-ageing-labels">
                <span>Under 4 hours</span>
                <span className="mlp-sd-bold">10</span>
              </div>
              <div className="mlp-sd-progress-track">
                <div className="mlp-sd-progress-fill" style={{ width: "50%" }} />
              </div>
            </div>

            <div className="mlp-sd-ageing-row">
              <div className="mlp-sd-ageing-labels">
                <span>4 to 24 hours</span>
                <span className="mlp-sd-bold">9</span>
              </div>
              <div className="mlp-sd-progress-track">
                <div className="mlp-sd-progress-fill" style={{ width: "45%" }} />
              </div>
            </div>

            <div className="mlp-sd-ageing-row">
              <div className="mlp-sd-ageing-labels">
                <span>1 to 3 days</span>
                <span className="mlp-sd-bold">1</span>
              </div>
              <div className="mlp-sd-progress-track">
                <div className="mlp-sd-progress-fill" style={{ width: "8%" }} />
              </div>
            </div>

            <div className="mlp-sd-ageing-row">
              <div className="mlp-sd-ageing-labels">
                <span>Over 3 days</span>
                <span className="mlp-sd-bold">0</span>
              </div>
              <div className="mlp-sd-progress-track">
                <div className="mlp-sd-progress-fill" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: SAP FICO team performance */}
        <div className="mlp-sd-panel">
          <h3 className="mlp-sd-panel-title">SAP FICO team performance</h3>
          <p className="mlp-sd-panel-sub">Your SAP FICO team, within the current customer scope.</p>

          <div className="mlp-sd-perf-list">
            <div className="mlp-sd-perf-row">
              <div className="mlp-sd-perf-top">
                <span className="mlp-sd-perf-label">First reply</span>
                <span className="mlp-sd-perf-val">34 min</span>
              </div>
              <div className="mlp-sd-perf-track">
                <div className="mlp-sd-perf-fill" style={{ width: "56%" }} />
              </div>
              <span className="mlp-sd-perf-target">team average · target 60 min</span>
            </div>

            <div className="mlp-sd-perf-row">
              <div className="mlp-sd-perf-top">
                <span className="mlp-sd-perf-label">Time to fix</span>
                <span className="mlp-sd-perf-val">7.4 h</span>
              </div>
              <div className="mlp-sd-perf-track">
                <div className="mlp-sd-perf-fill" style={{ width: "86%" }} />
              </div>
              <span className="mlp-sd-perf-target">team average · target 8 h</span>
            </div>

            <div className="mlp-sd-perf-row">
              <div className="mlp-sd-perf-top">
                <span className="mlp-sd-perf-label">Breached</span>
                <span className="mlp-sd-perf-val">2 of 61</span>
              </div>
              <div className="mlp-sd-perf-track">
                <div className="mlp-sd-perf-fill warn" style={{ width: "3.3%" }} />
              </div>
              <span className="mlp-sd-perf-target">3.3% this month</span>
            </div>

            <div className="mlp-sd-perf-row">
              <div className="mlp-sd-perf-top">
                <span className="mlp-sd-perf-label">Closed this week</span>
                <span className="mlp-sd-perf-val">41</span>
              </div>
              <div className="mlp-sd-perf-track">
                <div className="mlp-sd-perf-fill" style={{ width: "75%" }} />
              </div>
              <span className="mlp-sd-perf-target">38 last week</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Opened and closed, last 7 days */}
        <div className="mlp-sd-panel">
          <h3 className="mlp-sd-panel-title">Opened and closed, last 7 days</h3>
          <div className="mlp-sd-trend-chart">
            {[
              { day: "Mon", opened: 50, closed: 60 },
              { day: "Tue", opened: 70, closed: 45 },
              { day: "Wed", opened: 55, closed: 78 },
              { day: "Thu", opened: 68, closed: 52 },
              { day: "Fri", opened: 82, closed: 96 },
              { day: "Sat", opened: 24, closed: 18 },
              { day: "Sun", opened: 20, closed: 14 },
            ].map((d) => (
              <div className="mlp-sd-trend-col" key={d.day}>
                <div className="mlp-sd-trend-bars">
                  <div className="mlp-sd-bar-opened" style={{ height: `${d.opened}%` }} title={`Opened: ${d.opened}`} />
                  <div className="mlp-sd-bar-closed" style={{ height: `${d.closed}%` }} title={`Closed: ${d.closed}`} />
                </div>
                <span className="mlp-sd-day-label">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mlp-sd-trend-legend">
            <span className="mlp-sd-legend-item">
              <span className="mlp-sd-legend-sq opened" /> Opened
            </span>
            <span className="mlp-sd-legend-item">
              <span className="mlp-sd-legend-sq closed" /> Closed
            </span>
          </div>
        </div>

        {/* Panel 4: Today, In order */}
        <div className="mlp-sd-panel">
          <h3 className="mlp-sd-panel-title">Today, In order</h3>
          <div className="mlp-sd-timeline-list">
            {[
              { time: "08:00", title: "Shift handover complete", detail: "11 open, 2 at risk, no overnight breaches" },
              { time: "09:35", title: "Reassigned INC-1042", detail: "MM skill match — R. Iyer picked it up in 4 minutes" },
              { time: "11:20", title: "Approved escalation on INC-1043", detail: "Basis team joined, customer informed" },
              { time: "15:40", title: "Weekly review pack generated", detail: "Sent to delivery head and account leads" },
            ].map((ev) => (
              <div className="mlp-sd-timeline-item" key={ev.time}>
                <span className="mlp-sd-timeline-time">{ev.time}</span>
                <span className="mlp-sd-timeline-dot" />
                <div className="mlp-sd-timeline-content">
                  <span className="mlp-sd-timeline-title">{ev.title}</span>
                  <span className="mlp-sd-timeline-detail">{ev.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3 Bottom Panels Grid (Row 3 - Screenshot 2) ── */}
      <div className="mlp-sd-bottom-grid-3">
        {/* Panel 1: Where the work sits */}
        <div className="mlp-sd-panel">
          <h3 className="mlp-sd-panel-title">Where the work sits</h3>
          <div className="mlp-sd-module-breakdown">
            {[
              { name: "SAP MM", count: 3, width: "60%" },
              { name: "SAP FICO", count: 2, width: "40%" },
              { name: "SAP PP-QM", count: 2, width: "40%" },
              { name: "SAP FICO / Accounts Payable", count: 1, width: "20%" },
              { name: "ABAP", count: 1, width: "20%" },
            ].map((m) => (
              <div className="mlp-sd-mod-row" key={m.name}>
                <div className="mlp-sd-mod-top">
                  <span className="mlp-sd-mod-name">{m.name}</span>
                  <span className="mlp-sd-mod-count">{m.count}</span>
                </div>
                <div className="mlp-sd-progress-track">
                  <div className="mlp-sd-progress-fill" style={{ width: m.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: My work */}
        <div className="mlp-sd-panel">
          <h3 className="mlp-sd-panel-title">My work</h3>
          <div className="mlp-sd-work-list">
            {(tickets.length > 0 ? tickets.slice(0, 5) : [
              { ticketNo: "INC-1041", time: "23:20:53", remarks: "Cannot post AP invoice in FB60 after July deployment", clientName: "Vantage Foods", status: "Awaiting Allocation", pct: 65 },
              { ticketNo: "INC-1045", time: "26:04:53", remarks: "Pricing condition wrong AND output determination missing", clientName: "Northwind Retail", status: "Needs Triage", pct: 40 },
              { ticketNo: "INC-1044", time: "paused", remarks: "F110 payment proposal missing 14 vendors", clientName: "Cordell Group", status: "Pending Customer Action", pct: 30 },
              { ticketNo: "INC-1049", time: "17:20:53", remarks: "Depreciation run AFAB stalled — no activity 34h", clientName: "Vantage Foods", status: "In Progress", pct: 85 },
              { ticketNo: "INC-1048", time: "26:36:53", remarks: "Withholding tax not calculated for new vendor group", clientName: "Northwind Retail", status: "Awaiting Allocation", pct: 45 },
            ]).map((w, idx) => {
              const tNo = w.ticketNo || `INC-${1040 + idx}`;
              const tSubject = w.remarks || "No subject";
              const tClient = w.clientName || "Vantage Foods";
              const tStatus = w.ticketStatus || w.status || "In Progress";
              const tTime = w.time || "23:20:53";
              const pct = w.pct || ((idx * 17 + 35) % 80 + 15);

              return (
                <div
                  className="mlp-sd-work-item"
                  key={tNo + idx}
                  onClick={() => handleTicketListRowClick(w)}
                  title="Click to view ticket details"
                >
                  <div className="mlp-sd-work-header">
                    <span className="mlp-sd-work-id">{tNo}</span>
                    <span className={`mlp-sd-work-time ${tTime === "paused" ? "paused" : ""}`}>{tTime}</span>
                  </div>
                  <div className="mlp-sd-work-desc">{tSubject}</div>
                  <div className="mlp-sd-work-sub">{tClient} · {tStatus}</div>
                  <div className="mlp-sd-work-track">
                    <div className="mlp-sd-work-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 3: Notifications that reached me */}
        <div className="mlp-sd-panel">
          <h3 className="mlp-sd-panel-title">Notifications that reached me</h3>
          <div className="mlp-sd-notif-list">
            {[
              {
                title: "SLA warning · T4",
                time: "09:41",
                desc: "INC-1043 resolution SLA at 91%. Escalation path: Basis team, then account lead.",
                sub: "EMAIL + TEAMS · NTF-8AA1-1043-90",
              },
              {
                title: "Assignment · T3",
                time: "09:12",
                desc: "INC-1041 assigned to you by K. Menon after accepting the AI recommendation.",
                sub: "TEAMS · NTF-9A12-1041-AS",
              },
              {
                title: "Acknowledgement · T2",
                time: "08:44",
                desc: "Acknowledgement sent to Vantage Foods for INC-1041 with the structured summary.",
                sub: "EMAIL TO CUSTOMER · NTF-8A44-1041-ACK",
              },
              {
                title: "Breach risk · T16",
                time: "07:40",
                desc: "INC-1047 breach probability 0.78 — duty manager notified once (idempotent).",
                sub: "TEAMS + SMS · NTF-7A40-1047-BRK",
              },
            ].map((n, idx) => (
              <div className="mlp-sd-notif-item" key={idx}>
                <div className="mlp-sd-notif-header">
                  <span className="mlp-sd-notif-title">{n.title}</span>
                  <span className="mlp-sd-notif-time">{n.time}</span>
                </div>
                <p className="mlp-sd-notif-desc">{n.desc}</p>
                <span className="mlp-sd-notif-sub">{n.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
