import React, { useState, useMemo } from "react";
import { Skeleton } from "@mui/material";

const default10Tickets = [
  {
    ticketNo: "INC-1047",
    clientName: "Cordell Group",
    description: "Breach risk 0.78 with a 95-minute stall",
    priority: "P1",
    recommendation: "Escalate to the Module Lead; prepare breach communication for human send",
    riskScore: 0.78,
    category: "breach-risk",
    isHumanOnly: true,
  },
  {
    ticketNo: "INC-1043",
    clientName: "Vantage Foods",
    description: "P1 resolution SLA at 91% consumed",
    priority: "P1",
    recommendation: "Escalate to Basis for transport dependency; notify account lead",
    riskScore: 0.66,
    category: "breach-risk",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1049",
    clientName: "Vantage Foods",
    description: "No activity for 34 hours",
    priority: "P2",
    recommendation: "Nudge owner and request a status note; resolution SLA at 83%",
    riskScore: 0.61,
    category: "stalled",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1045",
    clientName: "Northwind Retail",
    description: "Triage confidence 0.41 — two issues in one email",
    priority: "P2",
    recommendation: "Split into two child tickets: SD pricing, output determination",
    riskScore: 0.55,
    category: "low-confidence",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1050",
    clientName: "Meridian Steel",
    description: "Reopened after closure — resolution quality signal",
    priority: "P3",
    recommendation: "Reassign to original owner and flag for reopen review",
    riskScore: 0.44,
    category: "low-confidence",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1046",
    clientName: "Meridian Steel",
    description: "Resolved 3 days, awaiting customer confirmation",
    priority: "P3",
    recommendation: "Send second chase: policy auto-close in 26 hours",
    riskScore: 0.22,
    category: "awaiting-confirmation",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1041",
    clientName: "Northwind Retail",
    description: "Cannot post AP invoice in FB60 after July deployment",
    priority: "P2",
    recommendation: "Review FI posting configuration and cross-company code settings",
    riskScore: 0.68,
    category: "stalled",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1042",
    clientName: "Cordell Group",
    description: "Dunning run F150 fails with error F5151",
    priority: "P3",
    recommendation: "Verify dunning procedure assignment and customer master data",
    riskScore: 0.38,
    category: "low-confidence",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1044",
    clientName: "Apex Logistics",
    description: "Asset depreciation AFAB calculation discrepancy in Period 06",
    priority: "P2",
    recommendation: "Run test depreciation recalculation in QA environment",
    riskScore: 0.52,
    category: "awaiting-confirmation",
    isHumanOnly: false,
  },
  {
    ticketNo: "INC-1048",
    clientName: "Zenith Corp",
    description: "Intercompany clearing error F5201 in F.13 automatic clearing",
    priority: "P1",
    recommendation: "Verify OBYA clearing accounts and tolerance groups",
    riskScore: 0.72,
    category: "breach-risk",
    isHumanOnly: false,
  },
];

const categoryMeta = [
  {
    key: "low-confidence",
    title: "Low confidence",
    subtitle: "Triage below 0.70 · T2",
  },
  {
    key: "breach-risk",
    title: "Breach risk",
    subtitle: "SLA 90% or BreachRiskRaised · T4 / T16",
  },
  {
    key: "stalled",
    title: "Stalled",
    subtitle: "No activity for X hours · T8",
  },
  {
    key: "awaiting-confirmation",
    title: "Awaiting confirmation",
    subtitle: "Resolved, chase and auto-close · T9",
  },
];

const NeedsAttention = ({
  tickets = [],
  filteredTickets = [],
  handleTicketListRowClick,
  formatPriorityCode = (p) => p || "P4",
  getPriorityClass = () => "p4",
  loadingTickets = false,
}) => {
  const [viewMode, setViewMode] = useState("reason"); // "reason" | "ranked"
  const [approvedMap, setApprovedMap] = useState({});

  // Merge real API tickets with attention metadata, ensuring 10 items
  const attentionTickets = useMemo(() => {
    const sourceList = tickets && tickets.length > 0 ? tickets : filteredTickets;
    return default10Tickets.map((fallback, idx) => {
      const realTicket = sourceList && sourceList[idx] ? sourceList[idx] : null;
      return {
        ...fallback,
        rawTicket: realTicket || fallback,
        ticketNo: realTicket?.ticketNo || fallback.ticketNo,
        clientName: realTicket?.clientName || realTicket?.customerName || realTicket?.module || fallback.clientName,
        description: realTicket?.description || realTicket?.remarks || fallback.description,
        priority: realTicket?.priority || fallback.priority,
      };
    });
  }, [tickets, filteredTickets]);

  const handleApprove = (ticketNo, e) => {
    e?.stopPropagation();
    setApprovedMap((prev) => ({
      ...prev,
      [ticketNo]: true,
    }));
  };

  const handleTicketClick = (item) => {
    if (handleTicketListRowClick) {
      handleTicketListRowClick(item.rawTicket || item);
    }
  };

  return (
    <div className="mlp-na-container">
      {/* ── Top Header & Toggle ── */}
      <div className="mlp-na-header">
        <div className="mlp-na-header-left">
          <h1 className="mlp-na-title">Needs Attention</h1>
          <p className="mlp-na-subtitle">
            Low confidence, stalls, breach risk and confirmation chases, ranked. Tier 1 items approve in
            one click; Tier 2 items are human-only.
          </p>
          <p className="mlp-na-desc">
            Tier 1 items accept a one-click approval with an editable recommendation. Tier 2 items are human-only.
          </p>
        </div>

        {/* View Toggle Buttons */}
        <div className="mlp-na-toggles">
          <button
            type="button"
            className={`mlp-na-toggle-btn ${viewMode === "reason" ? "active" : ""}`}
            onClick={() => setViewMode("reason")}
          >
            By reason
          </button>
          <button
            type="button"
            className={`mlp-na-toggle-btn ${viewMode === "ranked" ? "active" : ""}`}
            onClick={() => setViewMode("ranked")}
          >
            Everything, ranked
          </button>
        </div>
      </div>

      {loadingTickets ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
        </div>
      ) : viewMode === "reason" ? (
        /* ── 1. By Reason View (Screenshot 1) ── */
        <div className="mlp-na-reasons-grid">
          {categoryMeta.map((cat) => {
            const catTickets = attentionTickets.filter((t) => t.category === cat.key);
            return (
              <div key={cat.key} className="mlp-na-reason-col">
                <div className="mlp-na-col-header">
                  <span className="mlp-na-col-title">{cat.title}</span>
                  <span className="mlp-na-col-count">{catTickets.length}</span>
                </div>
                <div className="mlp-na-col-sub">{cat.subtitle}</div>

                <div className="mlp-na-cards-list">
                  {catTickets.map((t) => {
                    const isApproved = approvedMap[t.ticketNo];
                    return (
                      <div
                        key={t.ticketNo}
                        className="mlp-na-card"
                        onClick={() => handleTicketClick(t)}
                      >
                        <div className="mlp-na-card-top">
                          <span
                            className="mlp-na-ticket-no"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTicketClick(t);
                            }}
                          >
                            {t.ticketNo}
                          </span>
                          <span className="mlp-na-customer" title={t.clientName}>
                            {t.clientName}
                          </span>
                        </div>

                        <div className="mlp-na-card-reason">{t.description}</div>

                        <div className="mlp-na-card-rec">
                          {t.recommendation}
                        </div>

                        <div className="mlp-na-card-actions">
                          {t.isHumanOnly ? (
                            <button
                              type="button"
                              className="mlp-na-btn-human"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Human only
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`mlp-na-btn-approve ${isApproved ? "approved" : ""}`}
                              onClick={(e) => handleApprove(t.ticketNo, e)}
                            >
                              {isApproved ? "✓ Approved" : "Approve"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="mlp-na-btn-review"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTicketClick(t);
                            }}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── 2. Everything, Ranked View (Screenshot 2) ── */
        <div className="mlp-na-table-card">
          <table className="mlp-na-table">
            <thead>
              <tr>
                <th className="mlp-na-th" style={{ width: "60px" }}>RANK</th>
                <th className="mlp-na-th" style={{ width: "160px" }}>TICKET</th>
                <th className="mlp-na-th" style={{ width: "240px" }}>REASON</th>
                <th className="mlp-na-th" style={{ width: "100px" }}>PRIORITY</th>
                <th className="mlp-na-th">RECOMMENDATION</th>
                <th className="mlp-na-th" style={{ width: "110px" }}>RISK</th>
                <th className="mlp-na-th" style={{ width: "120px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {attentionTickets.map((t, idx) => {
                const rankStr = String(idx + 1).padStart(2, "0");
                const pCode = formatPriorityCode(t.priority);
                const pClass = getPriorityClass(t.priority);
                const isApproved = approvedMap[t.ticketNo];
                const riskPercent = Math.round(t.riskScore * 100);

                return (
                  <tr
                    key={t.ticketNo}
                    className="mlp-na-tr"
                    onClick={() => handleTicketClick(t)}
                  >
                    <td className="mlp-na-td">
                      <span className="mlp-na-rank">{rankStr}</span>
                    </td>

                    <td className="mlp-na-td">
                      <div className="mlp-na-ticket-cell">
                        <span
                          className="mlp-na-ticket-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(t);
                          }}
                        >
                          {t.ticketNo}
                        </span>
                        <span className="mlp-na-ticket-company">{t.clientName}</span>
                      </div>
                    </td>

                    <td className="mlp-na-td">
                      <span className="mlp-na-reason-text">{t.description}</span>
                    </td>

                    <td className="mlp-na-td">
                      <span className={`mlp-tc-priority ${pClass}`}>
                        {pCode}
                      </span>
                    </td>

                    <td className="mlp-na-td">
                      <span className="mlp-na-rec-text">{t.recommendation}</span>
                    </td>

                    <td className="mlp-na-td">
                      <div className="mlp-na-risk-cell">
                        <div className="mlp-na-risk-bar">
                          <div
                            className="mlp-na-risk-fill"
                            style={{
                              width: `${riskPercent}%`,
                              backgroundColor:
                                t.riskScore >= 0.7
                                  ? "#ef4444"
                                  : t.riskScore >= 0.5
                                  ? "#10b981"
                                  : "#6ee7b7",
                            }}
                          />
                        </div>
                        <span className="mlp-na-risk-score">— {t.riskScore.toFixed(2)}</span>
                      </div>
                    </td>

                    <td className="mlp-na-td" style={{ textAlign: "right" }}>
                      {t.isHumanOnly ? (
                        <button
                          type="button"
                          className="mlp-na-btn-human"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Human only
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`mlp-na-btn-approve ${isApproved ? "approved" : ""}`}
                          onClick={(e) => handleApprove(t.ticketNo, e)}
                        >
                          {isApproved ? "✓ Approved" : "Approve"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NeedsAttention;

