import React from "react";

const Notification = ({ currentNav }) => {
  return (
    <div className="mlp-other-section">
      <h1 className="mlp-page-title">{currentNav.label}</h1>
      <p className="mlp-page-subtitle">This option is clicked</p>
      <div className="mlp-placeholder-card">
        <p style={{ color: "#64748b", margin: 0 }}>
          Showing content for <strong>{currentNav.label}</strong>. You can navigate to other options from the left sidebar or return to <strong>Support Dashboard</strong>.
        </p>
      </div>
    </div>
  );
};

export default Notification;
