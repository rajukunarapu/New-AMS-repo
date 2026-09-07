import React, { useState, useEffect } from "react";
import "../../Styles/ConsultantPage.css";
import "../../Styles/ModuleLeadPage.css";

const defaultSettings = {
  answerLength: "Short",
  tone: "Direct",
  dataScope: "My tickets",
  suggestFix: true,
  showSources: true,
  draftReplies: true,
  warnClock: true,
};

const AIConfiguration = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("neoai_config_settings");
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Error loading AI settings:", e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem("neoai_config_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving AI settings:", e);
    }
  }, [settings]);

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="mlp-aiconfig-container">
      {/* Page Header */}
      <div className="mlp-aiconfig-header">
        <h1 className="mlp-aiconfig-title">AI Configuration</h1>
        <p className="mlp-aiconfig-subtitle">
          Decide how much the AI does for you and what it is allowed to look at. These settings apply to your account only and take effect immediately.
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="mlp-aiconfig-grid">
        {/* Left Card: How answers come back */}
        <div className="mlp-aiconfig-card">
          <div className="mlp-aiconfig-card-header">
            <h3 className="mlp-aiconfig-card-title">How answers come back</h3>
            <button
              type="button"
              className="mlp-aiconfig-reset-btn"
              onClick={handleReset}
            >
              Reset to default
            </button>
          </div>

          {/* Section 1: Answer length */}
          <div className="mlp-aiconfig-section">
            <label className="mlp-aiconfig-label">Answer length</label>
            <p className="mlp-aiconfig-desc">
              Short gives you one line; detailed adds the reasoning.
            </p>
            <div className="mlp-aiconfig-btn-group">
              {["Short", "Balanced", "Detailed"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`mlp-aiconfig-pill-btn ${
                    settings.answerLength === opt ? "active" : ""
                  }`}
                  onClick={() => updateSetting("answerLength", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Tone of drafted replies */}
          <div className="mlp-aiconfig-section">
            <label className="mlp-aiconfig-label">Tone of drafted replies</label>
            <p className="mlp-aiconfig-desc">
              Used when the AI prepares a customer response for you to edit.
            </p>
            <div className="mlp-aiconfig-btn-group">
              {["Direct", "Neutral", "Formal"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`mlp-aiconfig-pill-btn ${
                    settings.tone === opt ? "active" : ""
                  }`}
                  onClick={() => updateSetting("tone", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: What the AI can look at */}
          <div className="mlp-aiconfig-section">
            <label className="mlp-aiconfig-label">What the AI can look at</label>
            <p className="mlp-aiconfig-desc">
              Never beyond the customers you are assigned to.
            </p>
            <div className="mlp-aiconfig-btn-group two-col">
              {["My tickets", "My customers"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`mlp-aiconfig-pill-btn ${
                    settings.dataScope === opt ? "active" : ""
                  }`}
                  onClick={() => updateSetting("dataScope", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Footer setting summary */}
          <div className="mlp-aiconfig-card-footer">
            <span className="mlp-aiconfig-summary-text">
              Current setting · {settings.answerLength} · {settings.tone} · {settings.dataScope}
            </span>
          </div>
        </div>

        {/* Right Card: What the AI does on its own */}
        <div className="mlp-aiconfig-card">
          <div className="mlp-aiconfig-card-header no-border">
            <div>
              <h3 className="mlp-aiconfig-card-title">What the AI does on its own</h3>
              <p className="mlp-aiconfig-card-subtitle">
                Nothing here sends anything to a customer without you approving it first.
              </p>
            </div>
          </div>

          <div className="mlp-aiconfig-divider" />

          {/* Toggle Rows */}
          <div className="mlp-aiconfig-toggle-list">
            {/* Toggle 1: Suggest a fix */}
            <div className="mlp-aiconfig-toggle-row">
              <div className="mlp-aiconfig-toggle-info">
                <span className="mlp-aiconfig-toggle-title">Suggest a fix as I read</span>
                <span className="mlp-aiconfig-toggle-desc">
                  NeoAI drafts a recommendation when you open a ticket
                </span>
              </div>
              <div className="mlp-aiconfig-toggle-action">
                <span className="mlp-aiconfig-toggle-state">
                  {settings.suggestFix ? "On" : "Off"}
                </span>
                <div
                  className={`mlp-aiconfig-switch ${settings.suggestFix ? "on" : "off"}`}
                  onClick={() => toggleSetting("suggestFix")}
                  role="button"
                  tabIndex={0}
                />
              </div>
            </div>

            {/* Toggle 2: Always show sources */}
            <div className="mlp-aiconfig-toggle-row">
              <div className="mlp-aiconfig-toggle-info">
                <span className="mlp-aiconfig-toggle-title">Always show sources</span>
                <span className="mlp-aiconfig-toggle-desc">
                  Every answer lists the tickets and fixes it came from
                </span>
              </div>
              <div className="mlp-aiconfig-toggle-action">
                <span className="mlp-aiconfig-toggle-state">
                  {settings.showSources ? "On" : "Off"}
                </span>
                <div
                  className={`mlp-aiconfig-switch ${settings.showSources ? "on" : "off"}`}
                  onClick={() => toggleSetting("showSources")}
                  role="button"
                  tabIndex={0}
                />
              </div>
            </div>

            {/* Toggle 3: Draft customer replies */}
            <div className="mlp-aiconfig-toggle-row">
              <div className="mlp-aiconfig-toggle-info">
                <span className="mlp-aiconfig-toggle-title">Draft customer replies</span>
                <span className="mlp-aiconfig-toggle-desc">
                  Prepares a reply for you to edit — never sends on its own
                </span>
              </div>
              <div className="mlp-aiconfig-toggle-action">
                <span className="mlp-aiconfig-toggle-state">
                  {settings.draftReplies ? "On" : "Off"}
                </span>
                <div
                  className={`mlp-aiconfig-switch ${settings.draftReplies ? "on" : "off"}`}
                  onClick={() => toggleSetting("draftReplies")}
                  role="button"
                  tabIndex={0}
                />
              </div>
            </div>

            {/* Toggle 4: Warn before target slips */}
            <div className="mlp-aiconfig-toggle-row">
              <div className="mlp-aiconfig-toggle-info">
                <span className="mlp-aiconfig-toggle-title">Warn me before a target slips</span>
                <span className="mlp-aiconfig-toggle-desc">
                  A nudge at 75% of the response or resolution clock
                </span>
              </div>
              <div className="mlp-aiconfig-toggle-action">
                <span className="mlp-aiconfig-toggle-state">
                  {settings.warnClock ? "On" : "Off"}
                </span>
                <div
                  className={`mlp-aiconfig-switch ${settings.warnClock ? "on" : "off"}`}
                  onClick={() => toggleSetting("warnClock")}
                  role="button"
                  tabIndex={0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;

