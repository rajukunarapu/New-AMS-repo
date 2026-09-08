import React from "react";
import "../../Styles/ModuleLeadPage.css";

const recurringProblemClusters = [
  {
    id: 1,
    title: "Post-transport tax configuration",
    ticketCount: "14 tickets",
    trend: "+3 this month",
    action: "Add a pre-transport validation step to the release checklist",
    impact: "~9h / month",
    progress: 75,
  },
  {
    id: 2,
    title: "Role-change authorisation gaps",
    ticketCount: "11 tickets",
    trend: "stable",
    action: "Automate an authorisation trace on every role change",
    impact: "~6h / month",
    progress: 55,
  },
  {
    id: 3,
    title: "Overnight IDoc partner-profile drift",
    ticketCount: "8 tickets",
    trend: "+2",
    action: "Monitor partner profile changes and alert before the batch window",
    impact: "~11h / month",
    progress: 60,
  },
  {
    id: 4,
    title: "Vendor master data completeness",
    ticketCount: "7 tickets",
    trend: "-1",
    action: "Validate withholding tax fields at vendor creation",
    impact: "~4h / month",
    progress: 35,
  },
];

const overrideGroundingData = [
  {
    id: 1,
    name: "Module override rate",
    rate: "6.2%",
    detail: "mostly MM ↔ Integration boundary",
  },
  {
    id: 2,
    name: "Priority override rate",
    rate: "9.8%",
    detail: "model under-calls P1 on batch failures",
  },
  {
    id: 3,
    name: "Assignment override rate",
    rate: "11.4%",
    detail: "workload signal stale at shift change",
  },
  {
    id: 4,
    name: "Draft edit rate",
    rate: "34%",
    detail: "tone edits, not factual corrections",
  },
  {
    id: 5,
    name: "No-answer rate (RAG)",
    rate: "12%",
    detail: "target below 15% — evidence threshold holding",
  },
];

const Insights = () => {
  return (
    <div className="mlp-insights-container">
      {/* Page Header */}
      <div className="mlp-insights-header">
        <h1 className="mlp-insights-title">Insights</h1>
        <p className="mlp-insights-subtitle">
          Problems that keep coming back, work worth automating, where people overrule the AI, and where capacity is about to run short.
        </p>
      </div>

      {/* Card 1: Recurring problem clusters */}
      <div className="mlp-insights-card">
        <div className="mlp-insights-card-header">
          <div>
            <h3 className="mlp-insights-card-title">Recurring problem clusters</h3>
            <p className="mlp-insights-card-desc">
              Embedding-based clusters of repeated symptoms and root causes — the input to problem management and automation candidates.
            </p>
          </div>
        </div>

        <div className="mlp-insights-clusters-list">
          {recurringProblemClusters.map((item) => (
            <div key={item.id} className="mlp-insights-cluster-row">
              <div className="mlp-insights-cluster-title-col">
                <span className="mlp-insights-cluster-name">{item.title}</span>
              </div>
              <div className="mlp-insights-cluster-count-col">
                <span className="mlp-insights-cluster-count">{item.ticketCount}</span>
              </div>
              <div className="mlp-insights-cluster-trend-col">
                <span className="mlp-insights-cluster-trend">{item.trend}</span>
              </div>
              <div className="mlp-insights-cluster-action-col">
                <span className="mlp-insights-cluster-action">{item.action}</span>
              </div>
              <div className="mlp-insights-cluster-impact-col">
                <span className="mlp-insights-cluster-impact">{item.impact}</span>
                <div className="mlp-insights-progress-track">
                  <div
                    className="mlp-insights-progress-fill"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: Override and grounding analysis */}
      <div className="mlp-insights-card">
        <div className="mlp-insights-card-header">
          <h3 className="mlp-insights-card-title">Override and grounding analysis</h3>
        </div>

        <div className="mlp-insights-override-list">
          {overrideGroundingData.map((item) => (
            <div key={item.id} className="mlp-insights-override-row">
              <div className="mlp-insights-override-name-col">
                <span className="mlp-insights-override-name">{item.name}</span>
              </div>
              <div className="mlp-insights-override-rate-col">
                <span className="mlp-insights-override-rate">{item.rate}</span>
              </div>
              <div className="mlp-insights-override-detail-col">
                <span className="mlp-insights-override-detail">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Insights;

