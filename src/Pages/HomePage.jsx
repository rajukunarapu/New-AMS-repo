import React from "react";
import { useNavigate } from "react-router-dom";
import { NeovaticLogo, NeoAIServiceDeskBrand } from "../Components/Common/NeovaticLogo";
import "../Styles/HomePage.css";

// Data for the console cards
const consoles = [
  {
    title: "AMS Consultant",
    description: "4 customers \u00b7 own queue \u00b7 Tier 0-1",
    path: "/consultant",
    consoleTitle: "AMS Consultant console",
    scopeLabel: "Scope bound at sign-in: 4 customers \u00b7 SAP FICO queue \u00b7 Tier 0-1",
  },
  {
    title: "Module Lead",
    description: "4 customers \u00b7 all queues \u00b7 Tier 0-2",
    path: "/moduleLead",
    consoleTitle: "Module Lead console",
    scopeLabel: "Scope bound at sign-in: 4 customers \u00b7 all queues \u00b7 Tier 0-2",
  },
  {
    title: "Executive Sponsor",
    description: "Portfolio read-only \u00b7 no ticket content",
    path: "/ExecutiveSponser",
    consoleTitle: "Executive Sponsor console",
    scopeLabel: "Portfolio read-only \u00b7 no ticket content",
  },
  {
    title: "Platform Administrator",
    description: "Platform configuration \u00b7 no customer data by default",
    path: "/administrator",
    consoleTitle: "Platform Administrator console",
    scopeLabel: "Platform configuration \u00b7 no customer data by default",
  },
  {
    title: "SLA Framework",
    description: "Framework owner \u00b7 all customers \u00b7 governance, KPIs and audit",
    path: "/SLAFramework",
    consoleTitle: "SLA Framework console",
    scopeLabel: "Framework owner \u00b7 all customers \u00b7 governance, KPIs and audit",
  },
  {
    title: "Customer",
    description: "Own tickets only \u00b7 documents, timelines, UAT and sign-off",
    path: "/customer",
    consoleTitle: "Customer console",
    scopeLabel: "Own tickets only \u00b7 documents, timelines, UAT and sign-off",
  },
];

// Data for the footer information
const footerInfo = [
  {
    heading: "Session scope",
    body: "Customer set is bound at sign-in and enforced in the API, retriever and analytics layers.",
  },
  {
    heading: "Audit",
    body: "Sign-in, role, scope and every side-effecting action are correlated by one id.",
  },
  {
    heading: "Fallback",
    body: "If the model layer is unavailable the deterministic AMS path continues.",
  },
  {
    heading: "Classification",
    body: "Internal draft \u2013 customer-identifiable data must stay in approved environments.",
  },
];

const HomePage = () => {

// Get the state passed from the previous page (LoginPage)
  const navigate = useNavigate();

  // Function to handle card click and navigate to the LoginPage with state
  const handleCardClick = (c) => {
    localStorage.setItem("lastConsolePath", c.path);
    navigate("/login", {
      state: {
        consoleTitle: c.consoleTitle,
        scopeLabel: c.scopeLabel,
        destinationPath: c.path,
      },
    });
  };

  return (
    <div className="hp-page">
      {/* Logo */}
      <div className="hp-logo-wrap">
        <NeovaticLogo height={48} className="hp-logo" />
      </div>

      {/* Hero header */}
      <div className="hp-hero">
        <div className="hp-hero-left">
          <NeoAIServiceDeskBrand height={62} className="hp-hero-brand-svg" />
        </div>
      </div>

      <hr className="hp-divider" />

      {/* Console chooser */}
      <div className="hp-console-section">
        <h2 className="hp-console-title">Choose your console</h2>
        <p className="hp-console-desc">
          Each console has its own sign-in, its own navigation and its own data scope. SSO and MFA
          through Entra ID: services authenticate with managed identities - no shared credentials,
          and no database credential is ever issued to a model.
        </p>

        {/* cards */}
        <div className="hp-cards-grid">
          {consoles.map((c) => (
            <button key={c.title} className="hp-card" onClick={() => handleCardClick(c)}>
              <h3 className="hp-card-title">{c.title}</h3>
              <p className="hp-card-desc">{c.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer info strip */}
      <div className="hp-footer">
        {footerInfo.map((f) => (
          <div key={f.heading} className="hp-footer-col">
            <p className="hp-footer-heading">{f.heading}</p>
            <p className="hp-footer-body">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
