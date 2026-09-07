import React from 'react';
import { Skeleton } from '@mui/material';

const TicketList = ({
  tickets,
  filteredTicketList,
  visibleTicketList,
  ticketListVisibleCount,
  setTicketListVisibleCount,
  ticketListSearch,
  setTicketListSearch,
  ticketListStatusFilter,
  setTicketListStatusFilter,
  ticketListPriorityFilter,
  setTicketListPriorityFilter,
  loadingTickets,
  formatPriorityCode,
  getPriorityClass,
  getTicketSla,
  handleTicketListRowClick,
  totalOpenTickets,
  unassignedTicketsCount,
  slaRiskTicketsCount,
  needsTriageTicketsCount
}) => {
  return (
    <div className="mlp-tl-container">
      <div>
        <h1 className="mlp-page-title">Ticket List</h1>
        <p className="mlp-page-subtitle">
          Every open ticket carries a live response and resolution clock. Confidence and model route are shown on each row.
        </p>
      </div>

      {/* 5 Top Summary Metric Cards */}
      <div className="mlp-tl-metrics-grid">
        <div className="mlp-tl-metric-card open">
          <span className="mlp-tl-metric-lbl">OPEN</span>
          <span className="mlp-tl-metric-num">
            {loadingTickets ? <Skeleton variant="text" width={70} height={32} /> : totalOpenTickets}
          </span>
          <span className="mlp-tl-metric-sub">across 4 customers</span>
        </div>

        <div className="mlp-tl-metric-card unassigned">
          <span className="mlp-tl-metric-lbl">UNASSIGNED</span>
          <span className="mlp-tl-metric-num">
            {loadingTickets ? <Skeleton variant="text" width={40} height={32} /> : unassignedTicketsCount}
          </span>
          <span className="mlp-tl-metric-sub">awaiting triage or approval</span>
        </div>

        <div className="mlp-tl-metric-card sla-risk">
          <span className="mlp-tl-metric-lbl">SLA AT RISK</span>
          <span className="mlp-tl-metric-num">
            {loadingTickets ? <Skeleton variant="text" width={40} height={32} /> : slaRiskTicketsCount}
          </span>
          <span className="mlp-tl-metric-sub">above 75% consumed</span>
        </div>

        <div className="mlp-tl-metric-card triage">
          <span className="mlp-tl-metric-lbl">NEEDS TRIAGE</span>
          <span className="mlp-tl-metric-num">
            {loadingTickets ? <Skeleton variant="text" width={40} height={32} /> : needsTriageTicketsCount}
          </span>
          <span className="mlp-tl-metric-sub">below 0.70 confidence</span>
        </div>

        <div className="mlp-tl-metric-card auto-triaged">
          <span className="mlp-tl-metric-lbl">AUTO-TRIAGED TODAY</span>
          <span className="mlp-tl-metric-num">
            {loadingTickets ? <Skeleton variant="text" width={40} height={32} /> : 41}
          </span>
          <span className="mlp-tl-metric-sub">92% module agreement</span>
        </div>
      </div>

      {/* Table Container Card */}
      <div className="mlp-tl-table-card">
        {/* Top Filter Bar: Search Input + Priority Filter Group */}
        <div className="mlp-tl-top-filter-bar">
          <div className="mlp-tl-search-wrap">
            <span className="mlp-tl-search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="mlp-tl-search-input"
              placeholder="Search id, subject, customer, module, consultant"
              value={ticketListSearch}
              onChange={(e) => setTicketListSearch(e.target.value)}
            />
          </div>

          <div className="mlp-tl-priority-group">
            {["ALL", "P1", "P2", "P3"].map((p) => (
              <button
                key={p}
                type="button"
                className={`mlp-tl-p-btn ${ticketListPriorityFilter === p ? "active" : ""}`}
                onClick={() => setTicketListPriorityFilter(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Status Filter Tabs */}
        <div className="mlp-tl-status-tabs">
          {[
            "All",
            "Needs Triage",
            "Assigned",
            "In Progress",
            "Pending Customer Action",
            "Resolved — Awaiting Confirmation",
            "Reopened",
            "Assigned to me",
            "SLA at risk",
          ].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`mlp-tl-tab-btn ${ticketListStatusFilter === tab ? "active" : ""}`}
              onClick={() => setTicketListStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="mlp-tl-table-wrap">
          <table className="mlp-tl-table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>TICKET</th>
                <th style={{ width: "36%" }}>SUBJECT</th>
                <th style={{ width: "12%" }}>CUSTOMER</th>
                <th style={{ width: "12%" }}>STATE</th>
                <th style={{ width: "12%" }}>OWNER</th>
                <th style={{ width: "12%" }}>SLA</th>
              </tr>
            </thead>
            <tbody>
              {loadingTickets ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map((sk) => (
                  <tr key={sk}>
                    <td><Skeleton variant="text" width={110} height={24} /></td>
                    <td>
                      <Skeleton variant="text" width="90%" height={22} />
                      <Skeleton variant="text" width="40%" height={16} />
                    </td>
                    <td><Skeleton variant="text" width={55} height={20} /></td>
                    <td><Skeleton variant="text" width={75} height={20} /></td>
                    <td><Skeleton variant="text" width={85} height={20} /></td>
                    <td><Skeleton variant="rectangular" width={110} height={14} sx={{ borderRadius: "4px" }} /></td>
                  </tr>
                ))
              ) : visibleTicketList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
                    No tickets match your filter criteria.
                  </td>
                </tr>
              ) : (
                visibleTicketList.map((ticket, idx) => {
                  const pCode = formatPriorityCode(ticket.priority);
                  const pClass = getPriorityClass(ticket.priority);
                  const slaInfo = getTicketSla(ticket);
                  const statusKey = String(ticket.ticketStatus || "").toLowerCase();
                  let statusDotClass = "assigned";
                  if (statusKey.includes("process") || statusKey.includes("proc")) statusDotClass = "inprocess";
                  else if (statusKey.includes("created")) statusDotClass = "created";

                  return (
                    <tr
                      key={ticket.ticketNo || idx}
                      className="mlp-tl-row"
                      onClick={() => handleTicketListRowClick(ticket)}
                      title="Click to view ticket details"
                    >
                      <td>
                        <div className="mlp-tl-ticket-cell">
                          <span className="mlp-tl-ticket-no">{ticket.ticketNo || "AAB2608266"}</span>
                          <span className={`mlp-tl-badge ${pClass}`}>{pCode}</span>
                        </div>
                      </td>
                      <td>
                        <div className="mlp-tl-subject-cell">
                          <span className="mlp-tl-subject-title" title={ticket.remarks || "No subject"}>
                            {ticket.remarks || "No subject specified"}
                          </span>
                          <span className="mlp-tl-subject-module">
                            {ticket.module || "SAP SAC"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="mlp-tl-cust-cell">
                          {ticket.clientName || "AAB"}
                        </span>
                      </td>
                      <td>
                        <div className="mlp-tl-state-cell">
                          <span className={`mlp-tl-state-dot ${statusDotClass}`} />
                          <span>{ticket.ticketStatus || "Assigned"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="mlp-tl-owner-cell">
                          {ticket.createdname || ticket.name || "Jaswanth B"}
                        </span>
                      </td>
                      <td>
                        <div className="mlp-tl-sla-cell">
                          <div className="mlp-tl-sla-info">
                            <span>{slaInfo.timeLeft}</span>
                            <span>{slaInfo.percent}%</span>
                          </div>
                          <div className="mlp-tl-sla-track">
                            <div
                              className={`mlp-tl-sla-fill ${slaInfo.isUrgent ? "urgent" : ""}`}
                              style={{ width: `${slaInfo.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with interactive Show more button and description */}
        <div className="mlp-tl-footer">
          {!loadingTickets && ticketListVisibleCount < filteredTicketList.length && (
            <button
              type="button"
              className="mlp-tl-show-more-btn"
              onClick={() => setTicketListVisibleCount((prev) => prev + 20)}
            >
              Show more ({filteredTicketList.length - ticketListVisibleCount} remaining)
            </button>
          )}

          <p className="mlp-tl-footer-text">
            {visibleTicketList.length} of {filteredTicketList.length} tickets · click selects, click opens · every row is written through the Ticket API against the existing Neoconnect SQL schema — agent decisions are recommendations recorded against the ticket, never direct SQL writes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketList;
