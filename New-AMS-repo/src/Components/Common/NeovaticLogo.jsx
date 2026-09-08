import React from "react";

export const NeovaticMark = ({ size = 32, className = "", style = {} }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <defs>
        <linearGradient id="neoMarkTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="neoMarkRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="neoMarkLeft" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <radialGradient id="neoMarkNode" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#091424" />
        </radialGradient>
      </defs>
      <g transform="translate(60, 60)">
        <circle cx="0" cy="-20" r="28" fill="none" stroke="url(#neoMarkTop)" strokeWidth="8.5" strokeLinecap="round" opacity="0.95" />
        <circle cx="-17.32" cy="10" r="28" fill="none" stroke="url(#neoMarkLeft)" strokeWidth="8.5" strokeLinecap="round" opacity="0.95" />
        <circle cx="17.32" cy="10" r="28" fill="none" stroke="url(#neoMarkRight)" strokeWidth="8.5" strokeLinecap="round" opacity="0.95" />
        <line x1="0" y1="0" x2="0" y2="-20" stroke="#091424" strokeWidth="5" strokeLinecap="round" />
        <line x1="0" y1="0" x2="-17.32" y2="10" stroke="#091424" strokeWidth="5" strokeLinecap="round" />
        <line x1="0" y1="0" x2="17.32" y2="10" stroke="#091424" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="6" fill="url(#neoMarkNode)" />
        <circle cx="0" cy="-20" r="5.5" fill="url(#neoMarkNode)" />
        <circle cx="-17.32" cy="10" r="5.5" fill="url(#neoMarkNode)" />
        <circle cx="17.32" cy="10" r="5.5" fill="url(#neoMarkNode)" />
      </g>
    </svg>
  );
};

export const NeovaticLogo = ({ height = 48, className = "", style = {} }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 95"
      height={height}
      className={`neovatic-brand-logo ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle", height: `${height}px`, width: "auto", ...style }}
    >
      <defs>
        <linearGradient id="logoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="logoNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="logoNavyDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Wordmark NEOVATIC */}
      <g className="neo-logo-main-group" fill="#0f172a" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="800" fontSize="52" letterSpacing="3">
        {/* N */}
        <text x="10" y="54" className="neo-logo-text" fill="url(#logoNavy)">N</text>
        
        {/* Stylized E in emerald */}
        <g fill="url(#logoGreen)">
          <path d="M 68 18 L 100 18 L 100 24 L 75 24 L 75 33 L 96 33 L 96 39 L 75 39 L 75 48 L 100 48 L 100 54 L 68 54 Z" />
        </g>

        {/* O */}
        <text x="112" y="54" className="neo-logo-text" fill="url(#logoNavy)">O</text>

        {/* Stylized V in emerald */}
        <text x="168" y="54" fill="url(#logoGreen)" fontWeight="700">V</text>

        {/* Stylized A with crossbar */}
        <g>
          <text x="216" y="54" className="neo-logo-text" fill="url(#logoNavy)">A</text>
          <rect x="228" y="38" width="16" height="4.5" fill="url(#logoGreen)" rx="1" />
        </g>

        {/* T */}
        <text x="268" y="54" className="neo-logo-text" fill="url(#logoNavy)">T</text>

        {/* I */}
        <text x="312" y="54" className="neo-logo-text" fill="url(#logoNavy)">I</text>

        {/* C */}
        <text x="336" y="54" className="neo-logo-text" fill="url(#logoNavy)">C</text>
        
        {/* Registered symbol */}
        <circle cx="396" cy="22" r="7" className="neo-logo-r-circle" fill="none" stroke="#0f172a" strokeWidth="1.5" />
        <text x="396" y="25" className="neo-logo-r-text" fontSize="9" fontWeight="600" textAnchor="middle" fill="#0f172a">R</text>
      </g>

      {/* Subtitle: INNOVATION. INSIGHT. INTEGRITY. */}
      <text
        x="12"
        y="80"
        className="neo-logo-sub"
        fill="#475569"
        fontFamily="'Inter', 'Segoe UI', sans-serif"
        fontSize="12.5"
        fontWeight="600"
        letterSpacing="4.5"
      >
        INNOVATION. INSIGHT. INTEGRITY.
      </text>
    </svg>
  );
};

export const NeoAIServiceDeskBrand = ({ height = 54, className = "", style = {} }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 68"
      height={height}
      className={`neo-servicedesk-brand ${className}`}
      style={{ display: "block", height: `${height}px`, width: "auto", maxWidth: "100%", ...style }}
      aria-label="Neo AI Service Desk - EVERY TICKET UNDERSTOOD. EVERY STEP GOVERNED. EVERY ISSUE RESOLVED."
    >
      <defs>
        <linearGradient id="brandAiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* Main Title: Neo [AI] Service Desk */}
      <g fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif">
        {/* "Neo" */}
        <text
          x="1"
          y="35"
          className="brand-title-main"
          fontSize="36"
          fontWeight="800"
          letterSpacing="-0.6"
        >
          Neo
        </text>

        {/* "AI" Stylized Badge */}
        <g transform="translate(76, 9)">
          <rect
            x="0"
            y="0"
            width="38"
            height="27"
            rx="6"
            fill="url(#brandAiGrad)"
          />
          <text
            x="19"
            y="19"
            fontSize="15.5"
            fontWeight="800"
            letterSpacing="0.6"
            textAnchor="middle"
            fill="#ffffff"
          >
            AI
          </text>
        </g>

        {/* "Service Desk" */}
        <text
          x="124"
          y="35"
          className="brand-title-main"
          fontSize="36"
          fontWeight="800"
          letterSpacing="-0.6"
        >
          Service Desk
        </text>
      </g>

      {/* Tagline Subtitle */}
      <g fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif" fontWeight="700" fontSize="11" letterSpacing="1.2">
        <text x="1" y="58" className="brand-tagline-text">
          EVERY TICKET UNDERSTOOD. EVERY STEP GOVERNED. EVERY ISSUE RESOLVED.
        </text>
      </g>
    </svg>
  );
};

export default NeovaticLogo;
