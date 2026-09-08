import React, { useState } from "react";
import { Skeleton } from "@mui/material";
import "../../Styles/ModuleLeadPage.css";

const TicketSorting = ({
  tickets = [],
  selectedTicket = null,
  handleSelectTicket,
  handlePriorityFilter,
  formatPriorityCode = (p) => p || "P4",
  getPriorityClass = () => "p4",
  loadingTickets = false,
}) => {
  const [shadowVisibleCount, setShadowVisibleCount] = useState(5);

  const currentTicket = selectedTicket || tickets[0] || {
    ticketNo: "INC-1043",
    description: "AP invoice posting blocked in FB60 since the 12 July transport",
    module: "SAP FICO — Accounts Payable",
    priority: "P2 · High",
    ticketStatus: "Inprocess",
    clientName: "AAB",
  };

  const handleTicketClick = (ticket) => {
    if (handleSelectTicket) {
      handleSelectTicket(ticket || currentTicket);
    }
  };

  const onPriorityClick = (priorityCode) => {
    if (handlePriorityFilter) {
      handlePriorityFilter(priorityCode);
    }
  };

  // Shadow mode tickets list using Ticket API
  const shadowTickets = tickets && tickets.length > 0 ? tickets : [
    { ticketNo: "INC-1041", module: "SAP FICO", priority: "High", ticketStatus: "Assigned", confidence: "0.87" },
    { ticketNo: "INC-1042", module: "SAP MM", priority: "Medium", ticketStatus: "Inprocess", confidence: "0.88" },
    { ticketNo: "INC-1045", module: "SAP SD", priority: "Low", ticketStatus: "Created", confidence: "0.41" },
    { ticketNo: "INC-1047", module: "Integration", priority: "Very High", ticketStatus: "In quality", confidence: "0.79" },
    { ticketNo: "INC-1050", module: "SAP MM", priority: "Medium", ticketStatus: "Closed", confidence: "0.68" },
  ];

  const visibleShadowTickets = shadowTickets.slice(0, shadowVisibleCount);

  // Structured extraction fields requested by user:
  // Summary : description, module : module, priority : priority, Ticket Status : ticketStatus, Client : clientName
  const extractionFields = [
    {
      label: "SUMMARY",
      value: currentTicket.description || currentTicket.remarks || "AP invoice posting blocked in FB60 since the 12 July transport",
      confidence: "0.91",
    },
    {
      label: "MODULE",
      value: currentTicket.module || "SAP FICO — Accounts Payable",
      confidence: "0.94",
    },
    {
      label: "PRIORITY",
      value: currentTicket.priority ? `${formatPriorityCode(currentTicket.priority)} · ${currentTicket.priority}` : "P2 (matrix result)",
      confidence: "0.87",
    },
    {
      label: "TICKET STATUS",
      value: currentTicket.ticketStatus || "Inprocess",
      confidence: "0.92",
    },
    {
      label: "CLIENT",
      value: currentTicket.clientName || "AAB",
      confidence: "0.88",
    },
  ];

  return (
    <div className="mlp-ts-container">
      {/* Page Header */}
      <div className="mlp-ts-header">
        <h1 className="mlp-ts-title">Ticket Sorting</h1>
        <p className="mlp-ts-subtitle">
          Structured extraction, impact/urgency matrix and the confidence gate. Below threshold nothing is auto-executed — a Needs Triage ticket is created.
        </p>
      </div>

      {/* Top 2-Column Split */}
      <div className="mlp-ts-top-grid">
        {/* Left Card: Structured Extraction */}
        <div
          className="mlp-ts-card mlp-ts-extraction-card"
          onClick={() => handleTicketClick(currentTicket)}
          title="Click to view ticket details in Ticket Details page"
        >
          <div className="mlp-ts-card-header">
            <h3 className="mlp-ts-card-title">
              Structured extraction — {currentTicket.ticketNo || "INC-1043"}
            </h3>
            <span className="mlp-ts-click-hint">View in Ticket Details →</span>
          </div>
          <p className="mlp-ts-card-desc">
            Output is validated JSON against the TriageOutput contract. Invalid output never reaches a side-effecting tool.
          </p>

          <div className="mlp-ts-fields-table">
            {extractionFields.map((field) => (
              <div key={field.label} className="mlp-ts-field-row">
                <span className="mlp-ts-field-label">{field.label}</span>
                <span className="mlp-ts-field-value">{field.value}</span>
                <span className="mlp-ts-field-conf">{field.confidence}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Matrix & Confidence Gate */}
        <div className="mlp-ts-right-col">
          {/* Card 1: Impact / urgency matrix */}
          <div className="mlp-ts-card">
            <div className="mlp-ts-card-header">
              <h3 className="mlp-ts-card-title">Impact / urgency matrix</h3>
              <span className="mlp-ts-matrix-hint">Click priority to filter ticket list</span>
            </div>

            <div className="mlp-ts-matrix-table">
              <div className="mlp-ts-matrix-header-row">
                <div className="mlp-ts-matrix-corner" />
                <div className="mlp-ts-matrix-header-cell">URG: HIGH</div>
                <div className="mlp-ts-matrix-header-cell">MEDIUM</div>
                <div className="mlp-ts-matrix-header-cell">LOW</div>
              </div>

              {/* Row P1 */}
              <div className="mlp-ts-matrix-row">
                <div
                  className="mlp-ts-matrix-row-label"
                  onClick={() => onPriorityClick("P1")}
                  title="Click to view P1 tickets in Ticket List"
                >
                  P1
                </div>
                <div
                  className="mlp-ts-matrix-cell active"
                  onClick={() => onPriorityClick("P1")}
                  title="Click to view P1 tickets in Ticket List"
                >
                  P1
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P2")}
                  title="Click to view P2 tickets in Ticket List"
                >
                  P2
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P1")}
                  title="Click to view P1 tickets in Ticket List"
                >
                  P1
                </div>
              </div>

              {/* Row P2 */}
              <div className="mlp-ts-matrix-row">
                <div
                  className="mlp-ts-matrix-row-label"
                  onClick={() => onPriorityClick("P2")}
                  title="Click to view P2 tickets in Ticket List"
                >
                  P2
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P3")}
                  title="Click to view P3 tickets in Ticket List"
                >
                  P3
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P2")}
                  title="Click to view P2 tickets in Ticket List"
                >
                  P2
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P3")}
                  title="Click to view P3 tickets in Ticket List"
                >
                  P3
                </div>
              </div>

              {/* Row P4 */}
              <div className="mlp-ts-matrix-row">
                <div
                  className="mlp-ts-matrix-row-label"
                  onClick={() => onPriorityClick("P4")}
                  title="Click to view P4 tickets in Ticket List"
                >
                  P4
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P4")}
                  title="Click to view P4 tickets in Ticket List"
                >
                  P4
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P3")}
                  title="Click to view P3 tickets in Ticket List"
                >
                  P3
                </div>
                <div
                  className="mlp-ts-matrix-cell"
                  onClick={() => onPriorityClick("P4")}
                  title="Click to view P4 tickets in Ticket List"
                >
                  P4
                </div>
              </div>
            </div>

            <p className="mlp-ts-matrix-note">
              Matrix arithmetic is deterministic configuration. The model supplies impact and urgency; the matrix decides priority.
            </p>
          </div>

          {/* Card 2: Confidence gate */}
          <div className="mlp-ts-card">
            <div className="mlp-ts-gate-header">
              <h3 className="mlp-ts-card-title">Confidence gate</h3>
              <span className="mlp-ts-gate-val">0.87</span>
            </div>

            <div className="mlp-ts-gate-track-wrap">
              <div className="mlp-ts-gate-track">
                <div className="mlp-ts-gate-fill" style={{ width: "87%" }} />
                <div className="mlp-ts-gate-threshold-pin" style={{ left: "70%" }} title="Threshold: 0.70" />
              </div>
            </div>

            <p className="mlp-ts-gate-desc">
              Above the 0.70 threshold → proceeds automatically. Below it a <strong>Needs Triage</strong> ticket is created and the Module Lead queue is notified. Nothing is dropped.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Card: Shadow mode — model vs human */}
      <div className="mlp-ts-card mlp-ts-shadow-card">
        <div className="mlp-ts-card-header">
          <h3 className="mlp-ts-card-title">Shadow mode — model vs human</h3>
          <span className="mlp-ts-shadow-badge">92% module agreement · promotion gate ≥ 90%</span>
        </div>

        <div className="mlp-ts-table-container">
          <table className="mlp-ts-table">
            <thead>
              <tr>
                <th>TICKET</th>
                <th>MODULE</th>
                <th>PRIORITY</th>
                <th>TICKET STATUS</th>
                <th>RESULT</th>
                <th>CONFIDENCE</th>
              </tr>
            </thead>
            <tbody>
              {loadingTickets ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width={80} /></td>
                    <td><Skeleton width={120} /></td>
                    <td><Skeleton width={80} /></td>
                    <td><Skeleton width={100} /></td>
                    <td><Skeleton width={60} /></td>
                    <td><Skeleton width={40} /></td>
                  </tr>
                ))
              ) : (
                visibleShadowTickets.map((t, idx) => {
                  const pCode = formatPriorityCode(t.priority);
                  const isMatch = idx % 3 !== 2;
                  const conf = t.confidence || (0.75 + ((idx * 7) % 20) / 100).toFixed(2);
                  return (
                    <tr
                      key={t.id || t.ticketNo || idx}
                      className="mlp-ts-row"
                      onClick={() => handleTicketClick(t)}
                      title={`Click to view details for ${t.ticketNo}`}
                    >
                      <td className="mlp-ts-td-ticket">{t.ticketNo || `INC-${1040 + idx}`}</td>
                      <td className="mlp-ts-td-module">{t.module || "SAP FICO"}</td>
                      <td className="mlp-ts-td-priority">
                        <span className={`mlp-priority-pill ${getPriorityClass(t.priority)}`}>
                          {pCode} · {t.priority || "Medium"}
                        </span>
                      </td>
                      <td className="mlp-ts-td-status">
                        <span className="mlp-ts-status-badge">{t.ticketStatus || "Assigned"}</span>
                      </td>
                      <td className="mlp-ts-td-result">
                        <span className={`mlp-ts-result-pill ${isMatch ? "match" : "override"}`}>
                          {isMatch ? "match" : "override"}
                        </span>
                      </td>
                      <td className="mlp-ts-td-conf">{conf}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Show More Button */}
        {shadowTickets.length > shadowVisibleCount && (
          <div className="mlp-ts-show-more-wrap">
            <button
              type="button"
              className="mlp-ts-show-more-btn"
              onClick={() => setShadowVisibleCount((prev) => prev + 5)}
            >
              <span>Show more</span>
              <span style={{ opacity: 0.7 }}>
                ({shadowTickets.length - shadowVisibleCount} remaining)
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketSorting;

