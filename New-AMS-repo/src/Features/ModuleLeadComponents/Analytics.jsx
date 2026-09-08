import React from "react";
import "../../Styles/ModuleLeadPage.css";

const modulePerformanceData = [
  { module: "SAP FICO", stats: "MTTR 5.9h · FCR 42% · reopen 3.1%" },
  { module: "SAP MM", stats: "MTTR 6.8h · FCR 36% · reopen 4.4%" },
  { module: "ABAP", stats: "MTTR 8.1h · FCR 28% · reopen 5.2%" },
  { module: "Integration", stats: "MTTR 9.6h · FCR 22% · reopen 6.8%" },
  { module: "Security", stats: "MTTR 3.4h · FCR 61% · reopen 1.9%" },
];

const driftEvaluationData = [
  {
    title: "Breach model AUC",
    sub: "within tolerance · review at 0.75",
    value: "0.81 → 0.78",
  },
  {
    title: "Feature drift (PSI)",
    sub: "workload feature shifting at shift change",
    value: "0.11",
  },
  {
    title: "Triage confidence mean",
    sub: "stable across 30 days",
    value: "0.83 → 0.81",
  },
  {
    title: "Embedding version",
    sub: "reindex required before any change",
    value: "BGE-M3 · v1",
  },
];

const backlogFlowPairs = [
  { inflow: 65, closure: 55 },
  { inflow: 85, closure: 70 },
  { inflow: 80, closure: 86 },
  { inflow: 92, closure: 84 },
  { inflow: 76, closure: 95 },
  { inflow: 82, closure: 98 },
  { inflow: 72, closure: 88 },
  { inflow: 80, closure: 94 },
];

const Analytics = () => {
  return (
    <div className="mlp-analytics-container">
      {/* Page Header */}
      <div className="mlp-analytics-header">
        <h1 className="mlp-analytics-title">Analytics</h1>
        <p className="mlp-analytics-subtitle">
          Backlog flow, module performance, model calibration and drift — the evidence behind promotion decisions.
        </p>
      </div>

      {/* Top 3-Card Grid */}
      <div className="mlp-analytics-top-grid">
        {/* Card 1: Backlog flow — inflow vs closure */}
        <div className="mlp-analytics-card">
          <h3 className="mlp-analytics-card-title">Backlog flow — inflow vs closure</h3>

          <div className="mlp-analytics-barchart-wrap">
            <div className="mlp-analytics-barchart">
              {backlogFlowPairs.map((pair, idx) => (
                <div key={idx} className="mlp-analytics-bar-pair">
                  <div
                    className="mlp-analytics-bar inflow"
                    style={{ height: `${pair.inflow}%` }}
                    title={`Inflow: ${pair.inflow}`}
                  />
                  <div
                    className="mlp-analytics-bar closure"
                    style={{ height: `${pair.closure}%` }}
                    title={`Closure: ${pair.closure}`}
                  />
                </div>
              ))}
            </div>
            <div className="mlp-analytics-chart-baseline" />
          </div>

          <p className="mlp-analytics-card-note">
            Dark: inflow. Light: closures. Closure overtakes inflow from week 3 of phase 2.
          </p>
        </div>

        {/* Card 2: Breach model calibration */}
        <div className="mlp-analytics-card">
          <h3 className="mlp-analytics-card-title">Breach model calibration</h3>

          <div className="mlp-analytics-linechart-wrap">
            <svg
              className="mlp-analytics-svg-chart"
              viewBox="0 0 280 140"
              preserveAspectRatio="none"
            >
              {/* Axes */}
              <line x1="15" y1="10" x2="15" y2="125" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="15" y1="125" x2="270" y2="125" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Dashed reference line */}
              <line
                x1="18"
                y1="115"
                x2="265"
                y2="20"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Smooth actual calibration curve */}
              <path
                d="M 18 118 Q 70 95, 120 72 T 200 42 T 260 22"
                fill="none"
                stroke="#15803d"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="mlp-analytics-card-note">
            Predicted vs observed breach rate. Dashed is perfect calibration; the model is slightly conservative in the mid band.
          </p>
        </div>

        {/* Card 3: Module performance */}
        <div className="mlp-analytics-card">
          <h3 className="mlp-analytics-card-title">Module performance</h3>

          <div className="mlp-analytics-perf-list">
            {modulePerformanceData.map((item) => (
              <div key={item.module} className="mlp-analytics-perf-row">
                <span className="mlp-analytics-perf-module">{item.module}</span>
                <span className="mlp-analytics-perf-stats">{item.stats}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Drift and evaluation */}
      <div className="mlp-analytics-bottom-grid">
        <div className="mlp-analytics-card mlp-analytics-drift-card">
          <h3 className="mlp-analytics-card-title">Drift and evaluation</h3>

          <div className="mlp-analytics-drift-list">
            {driftEvaluationData.map((item) => (
              <div key={item.title} className="mlp-analytics-drift-row">
                <div className="mlp-analytics-drift-info">
                  <span className="mlp-analytics-drift-name">{item.title}</span>
                  <span className="mlp-analytics-drift-sub">{item.sub}</span>
                </div>
                <span className="mlp-analytics-drift-val">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

