import React, { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@mui/material";
import { getEmployeesAPI } from "../../Services/GetEmployeesAPI";

const candidateTemplates = [
  {
    rank: 1,
    isRecommended: true,
    score: "0.88",
    subtext: "FICO L3 · AP specialist · On shift to 18:30 · WIP 5 / 8 · 12 similar · 5.4h avg",
    coveragePercent: 97,
    capacityPercent: 50,
    breakdown: {
      skill: "35 / 35",
      workload: "18 / 20",
      history: "24 / 25",
      availability: "15 / 15",
      familiarity: "5 / 5",
    },
  },
  {
    rank: 2,
    isRecommended: false,
    score: "0.79",
    subtext: "FICO L2 · AP and Banking · On shift to 22:00 · WIP 2 / 6 · 8 similar · 6.7h avg",
    coveragePercent: 84,
    capacityPercent: 25,
    breakdown: {
      skill: "30 / 35",
      workload: "20 / 20",
      history: "19 / 25",
      availability: "15 / 15",
      familiarity: "4 / 5",
    },
  },
  {
    rank: 3,
    isRecommended: false,
    score: "0.68",
    subtext: "ABAP L3 · FICO L2 · On shift to 16:30 · WIP 4 / 6 · 6 similar · 8.2h avg",
    coveragePercent: 70,
    capacityPercent: 65,
    breakdown: {
      skill: "26 / 35",
      workload: "14 / 20",
      history: "16 / 25",
      availability: "12 / 15",
      familiarity: "3 / 5",
    },
  },
  {
    rank: 4,
    isRecommended: false,
    score: "0.58",
    subtext: "MM L3 · FICO L1 · On shift to 22:00 · WIP 2 / 6 · 2 similar · 10.1h avg",
    coveragePercent: 52,
    capacityPercent: 30,
    breakdown: {
      skill: "18 / 35",
      workload: "20 / 20",
      history: "10 / 25",
      availability: "15 / 15",
      familiarity: "2 / 5",
    },
  },
  {
    rank: 5,
    isRecommended: false,
    score: "0.49",
    subtext: "SD L2 · Cross-Module · On shift to 17:00 · WIP 6 / 8 · 1 similar · 12.0h avg",
    coveragePercent: 42,
    capacityPercent: 75,
    breakdown: {
      skill: "14 / 35",
      workload: "12 / 20",
      history: "8 / 25",
      availability: "10 / 15",
      familiarity: "2 / 5",
    },
  },
];

const scoringWeights = [
  { label: "Module skill match", weight: 35 },
  { label: "Current workload / WIP", weight: 20 },
  { label: "Historical resolution on similar", weight: 25 },
  { label: "Shift and calendar availability", weight: 15 },
  { label: "Customer familiarity", weight: 5 },
];

const guardrails = [
  "Out-of-shift consultants are never auto-assigned a P1.",
  "Load above 85% of the WIP limit blocks automatic assignment.",
  "Customer data residency restrictions filter the pool before scoring.",
  "Reassignment beyond two hops raises a Module Lead alert.",
  "Every assignment writes an AgentRun record with the full score vector.",
];

const TicketAssignment = ({
  tickets = [],
  filteredTickets = [],
  selectedTicket,
  employees = [],
  handleNavClick,
  handleTicketListRowClick,
  loadingTickets = false,
}) => {
  const [assignedId, setAssignedId] = useState(null);
  const [activeScoreModal, setActiveScoreModal] = useState(null);
  const [localEmployees, setLocalEmployees] = useState([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);

  // Fetch real employees if prop is empty
  useEffect(() => {
    if (!employees || employees.length === 0) {
      setFetchingEmployees(true);
      getEmployeesAPI()
        .then((res) => {
          if (res && res.data && Array.isArray(res.data)) {
            setLocalEmployees(res.data);
          }
        })
        .catch((err) => {
          console.error("Error fetching employees in TicketAssignment:", err);
        })
        .finally(() => {
          setFetchingEmployees(false);
        });
    }
  }, [employees]);

  const activeEmployees = useMemo(() => {
    return employees && employees.length > 0 ? employees : localEmployees;
  }, [employees, localEmployees]);

  const activeTicket = selectedTicket || filteredTickets[0] || tickets[0] || {
    ticketNo: "INC-1041",
    description: "Cannot post AP invoice in FB60 after July deployment",
    remarks: "Cannot post AP invoice in FB60 after July deployment",
  };

  const ticketTitle = activeTicket.ticketNo || "INC-1041";
  const ticketDesc =
    activeTicket.description ||
    activeTicket.remarks ||
    "Cannot post AP invoice in FB60 after July deployment";

  // Build 5 real candidates from Employee API
  const candidates = useMemo(() => {
    const top5 = activeEmployees.slice(0, 5);
    return candidateTemplates.map((tpl, idx) => {
      const emp = top5[idx] || null;
      const empName = emp ? (emp.name || emp.employeeName || `Employee ${idx + 1}`) : `Consultant ${idx + 1}`;
      const empId = emp ? (emp.employeeId || emp.id || `emp-${idx}`) : `cand-${idx}`;

      return {
        ...tpl,
        id: empId,
        name: empName,
        rawEmployee: emp,
      };
    });
  }, [activeEmployees]);

  const topCandidate = candidates[0];

  const handleCardClick = () => {
    if (handleNavClick) {
      handleNavClick("ticket-list");
    }
  };

  const handleAssignClick = (candidateId, e) => {
    e.stopPropagation();
    setAssignedId(candidateId);
  };

  const toggleWhyScore = (candidate, e) => {
    e.stopPropagation();
    if (activeScoreModal?.id === candidate.id) {
      setActiveScoreModal(null);
    } else {
      setActiveScoreModal(candidate);
    }
  };

  return (
    <div className="mlp-ta-container">
      {/* ── Header ── */}
      <div className="mlp-ta-header">
        <h1 className="mlp-ta-title">Ticket Assignment</h1>
        <p className="mlp-ta-subtitle">
          Routing score from module, skills, roster, workload and historical resolution. Weights are
          configuration, not model judgment.
        </p>
      </div>

      {/* ── Top 4 KPI Summary Cards (Clickable -> Ticket List) ── */}
      <div className="mlp-ta-kpi-grid">
        {/* Card 1: Candidates Evaluated */}
        <div
          className="mlp-ta-kpi-card"
          onClick={handleCardClick}
          title="Click to view Ticket List"
        >
          <div className="mlp-ta-kpi-accent accent-blue" />
          <div className="mlp-ta-kpi-content">
            <span className="mlp-ta-kpi-label">CANDIDATES EVALUATED</span>
            <div className="mlp-ta-kpi-val">
              {activeEmployees.length > 0 ? activeEmployees.length : 5}
            </div>
            <span className="mlp-ta-kpi-sub">SAP FICO / Accounts Payable module pool</span>
          </div>
        </div>

        {/* Card 2: Top Score */}
        <div
          className="mlp-ta-kpi-card"
          onClick={handleCardClick}
          title="Click to view Ticket List"
        >
          <div className="mlp-ta-kpi-accent accent-teal" />
          <div className="mlp-ta-kpi-content">
            <span className="mlp-ta-kpi-label">TOP SCORE</span>
            <div className="mlp-ta-kpi-val">{topCandidate?.score || "0.88"}</div>
            <span className="mlp-ta-kpi-sub" title={topCandidate?.name}>
              {topCandidate?.name || "Consultant"}
            </span>
          </div>
        </div>

        {/* Card 3: Autonomy */}
        <div
          className="mlp-ta-kpi-card"
          onClick={handleCardClick}
          title="Click to view Ticket List"
        >
          <div className="mlp-ta-kpi-accent accent-amber" />
          <div className="mlp-ta-kpi-content">
            <span className="mlp-ta-kpi-label">AUTONOMY</span>
            <div className="mlp-ta-kpi-val autonomy">Auto w/ review</div>
            <span className="mlp-ta-kpi-sub">Module Lead gate active</span>
          </div>
        </div>

        {/* Card 4: Time to Assign */}
        <div
          className="mlp-ta-kpi-card"
          onClick={handleCardClick}
          title="Click to view Ticket List"
        >
          <div className="mlp-ta-kpi-accent accent-grey" />
          <div className="mlp-ta-kpi-content">
            <span className="mlp-ta-kpi-label">TIME TO ASSIGN</span>
            <div className="mlp-ta-kpi-val">2.4 s</div>
            <span className="mlp-ta-kpi-sub">Target under 5 min</span>
          </div>
        </div>
      </div>

      {loadingTickets || fetchingEmployees ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
        </div>
      ) : (
        /* ── Main 2-Column Split ── */
        <div className="mlp-ta-main-split">
          {/* Left Column: Ranked Candidates */}
          <div className="mlp-ta-left-col">
            {/* Header banner for ticket candidates */}
            <div className="mlp-ta-banner">
              <span className="mlp-ta-banner-title">
                Ranked candidates — <strong>{ticketTitle}</strong>
              </span>
              <span className="mlp-ta-banner-desc" title={ticketDesc}>
                {ticketDesc}
              </span>
            </div>

            {/* Candidate Cards (5 Real Employees) */}
            <div className="mlp-ta-candidates-list">
              {candidates.map((c) => {
                const isAssigned = assignedId === c.id;
                const isSelectedForScore = activeScoreModal?.id === c.id;

                return (
                  <div
                    key={c.id}
                    className={`mlp-ta-candidate-card ${c.isRecommended ? "recommended" : ""}`}
                  >
                    <div className="mlp-ta-cand-top">
                      <div className="mlp-ta-cand-name-row">
                        <span className="mlp-ta-cand-rank">#{c.rank}</span>
                        <span className="mlp-ta-cand-name">{c.name}</span>
                        {c.isRecommended && (
                          <span className="mlp-ta-badge-rec">Recommended</span>
                        )}
                      </div>
                      <span className="mlp-ta-cand-score">{c.score}</span>
                    </div>

                    <p className="mlp-ta-cand-subtext">{c.subtext}</p>

                    {/* Progress Bars Row */}
                    <div className="mlp-ta-metrics-row">
                      {/* Module coverage */}
                      <div className="mlp-ta-metric-item">
                        <div className="mlp-ta-metric-head">
                          <span className="mlp-ta-metric-lbl">Module coverage</span>
                          <span className="mlp-ta-metric-pct">{c.coveragePercent}%</span>
                        </div>
                        <div className="mlp-ta-progress-track">
                          <div
                            className="mlp-ta-progress-bar coverage"
                            style={{ width: `${c.coveragePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Load vs capacity */}
                      <div className="mlp-ta-metric-item">
                        <div className="mlp-ta-metric-head">
                          <span className="mlp-ta-metric-lbl">Load vs capacity</span>
                          <span className="mlp-ta-metric-pct">{c.capacityPercent}%</span>
                        </div>
                        <div className="mlp-ta-progress-track">
                          <div
                            className="mlp-ta-progress-bar capacity"
                            style={{ width: `${c.capacityPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mlp-ta-actions-row">
                      <button
                        type="button"
                        className={`mlp-ta-btn-assign ${isAssigned ? "assigned" : ""}`}
                        onClick={(e) => handleAssignClick(c.id, e)}
                      >
                        {isAssigned ? "✓ Assigned" : "Assign"}
                      </button>

                      <button
                        type="button"
                        className="mlp-ta-btn-why"
                        onClick={(e) => toggleWhyScore(c, e)}
                      >
                        {isSelectedForScore ? "Hide score breakdown" : "Why this score"}
                      </button>
                    </div>

                    {/* Score Breakdown Dropdown / Inline Drawer */}
                    {isSelectedForScore && (
                      <div className="mlp-ta-breakdown-box">
                        <div className="mlp-ta-breakdown-title">
                          Score Breakdown for {c.name} (Total: {c.score})
                        </div>
                        <div className="mlp-ta-breakdown-grid">
                          <div>
                            Module skill match (35%): <strong>{c.breakdown.skill}</strong>
                          </div>
                          <div>
                            Current workload / WIP (20%): <strong>{c.breakdown.workload}</strong>
                          </div>
                          <div>
                            Historical resolution (25%): <strong>{c.breakdown.history}</strong>
                          </div>
                          <div>
                            Availability (15%): <strong>{c.breakdown.availability}</strong>
                          </div>
                          <div>
                            Customer familiarity (5%): <strong>{c.breakdown.familiarity}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Scoring weights & Guardrails */}
          <div className="mlp-ta-right-col">
            {/* Card 1: Scoring weights */}
            <div className="mlp-ta-side-card">
              <h3 className="mlp-ta-side-title">Scoring weights</h3>
              <div className="mlp-ta-weights-list">
                {scoringWeights.map((w) => (
                  <div key={w.label} className="mlp-ta-weight-item">
                    <div className="mlp-ta-weight-row">
                      <span className="mlp-ta-weight-label">{w.label}</span>
                      <span className="mlp-ta-weight-pct">{w.weight}%</span>
                    </div>
                    <div className="mlp-ta-weight-track">
                      <div
                        className="mlp-ta-weight-bar"
                        style={{ width: `${w.weight * 2.5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mlp-ta-side-footnote">
                Weights are configured in AI Model Configuration — versioned, auditable, and changed
                only with admin approval. WIP limits and shift calendars are hard constraints, not scores.
              </p>
            </div>

            {/* Card 2: Guardrails */}
            <div className="mlp-ta-side-card">
              <h3 className="mlp-ta-side-title">Guardrails</h3>
              <ul className="mlp-ta-guardrails-list">
                {guardrails.map((g, idx) => (
                  <li key={idx} className="mlp-ta-guardrail-item">
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketAssignment;
