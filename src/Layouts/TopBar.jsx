import React, { useState, useEffect, useRef } from 'react';
import { NeovaticMark } from "../Components/Common/NeovaticLogo";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/ConsultantPage.css";
import { getUserInfo } from '../Utils/GetUserInfoHelper';
import { useTheme } from '../Context/ThemeContext';

// Helper to determine the console configuration and role based on current pathname
const getConsoleInfo = (pathname) => {
    const p = (pathname || "").toLowerCase();
    if (p.includes("consultant")) {
        return {
            title: "Consultant",
            role: "AMS CONSULTANT · SAP FICO",
            consoleTitle: "AMS Consultant console",
            scopeLabel: "Scope bound at sign-in: 4 customers · SAP FICO queue · Tier 0-1",
            path: "/consultant",
            scopeDesc: "Signed in through Entra ID with MFA. Scope: four customers, own queue, Tier 0-1 actions.",
        };
    }
    if (p.includes("modulelead")) {
        return {
            title: "Module Lead",
            role: "MODULE LEAD",
            consoleTitle: "Module Lead console",
            scopeLabel: "Scope bound at sign-in: 4 customers · all queues · Tier 0-2",
            path: "/moduleLead",
            scopeDesc: "Signed in through Entra ID with MFA. Scope: four customers, all queues, Tier 0-2 actions.",
        };
    }
    if (p.includes("executivesponser") || p.includes("executivesponsor")) {
        return {
            title: "Executive Sponsor",
            role: "EXECUTIVE SPONSOR",
            consoleTitle: "Executive Sponsor console",
            scopeLabel: "Portfolio read-only · no ticket content",
            path: "/ExecutiveSponser",
            scopeDesc: "Signed in through Entra ID with MFA. Scope: portfolio read-only, no ticket content.",
        };
    }
    if (p.includes("admin")) {
        return {
            title: "Platform Administrator",
            role: "PLATFORM ADMINISTRATOR",
            consoleTitle: "Platform Administrator console",
            scopeLabel: "Platform configuration · no customer data by default",
            path: "/administrator",
            scopeDesc: "Signed in through Entra ID with MFA. Scope: platform configuration and governance controls.",
        };
    }
    if (p.includes("slaframework") || p.includes("sla")) {
        return {
            title: "SLA Framework",
            role: "SLA FRAMEWORK",
            consoleTitle: "SLA Framework console",
            scopeLabel: "Framework owner · all customers · governance, KPIs and audit",
            path: "/SLAFramework",
            scopeDesc: "Signed in through Entra ID with MFA. Scope: framework owner, all customers, audit.",
        };
    }
    if (p.includes("customer")) {
        return {
            title: "Customer",
            role: "CUSTOMER",
            consoleTitle: "Customer console",
            scopeLabel: "Own tickets only · documents, timelines, UAT and sign-off",
            path: "/customer",
            scopeDesc: "Signed in through Entra ID with MFA. Scope: own tickets only, UAT and sign-off.",
        };
    }
    return {
        title: "Module Lead",
        role: "MODULE LEAD",
        consoleTitle: "Module Lead console",
        scopeLabel: "Scope bound at sign-in: 4 customers · all queues · Tier 0-2",
        path: "/moduleLead",
        scopeDesc: "Signed in through Entra ID with MFA. Scope: four customers, all queues, Tier 0-2 actions.",
    };
};

const formatDisplayName = (emailStr) => {
    if (!emailStr || typeof emailStr !== "string") return "User";
    const clean = emailStr.trim();
    if (clean.includes("@")) {
        const local = clean.split("@")[0];
        const parts = local.split(/[._-]/).filter(Boolean);
        if (parts.length > 1) {
            const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const last = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            return `${first} ${last}`;
        } else if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
    }
    return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const formatAvatarInitial = (emailStr) => {
    if (!emailStr || typeof emailStr !== "string") return "U";
    const clean = emailStr.trim();
    if (clean.includes("@")) {
        const local = clean.split("@")[0];
        const parts = local.split(/[._-]/).filter(Boolean);
        if (parts.length > 1) {
            return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        } else if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
    }
    return clean.charAt(0).toUpperCase();
};

const TopBar = ({ setSearchText, searchText, onNotificationClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get the email from location state or localStorage
    const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";

    // Derive display name, initial, and console metadata
    const displayName = formatDisplayName(emailParam);
    const userInitial = formatAvatarInitial(emailParam);
    const consoleInfo = getConsoleInfo(location.pathname);

    // Profile card open state and ref for outside click
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef(null);

    // Theme hook
    const { toggleTheme, isDark } = useTheme();

    // Outside click & Escape key listeners for popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setShowProfile(false);
            }
        };

        if (showProfile) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [showProfile]);

    const handleNotificationClick = () => {
        if (onNotificationClick) {
            onNotificationClick();
        } else {
            const currentParams = new URLSearchParams(location.search);
            currentParams.set("tab", "notifications");
            navigate(`?${currentParams.toString()}`);
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("tokenTime");
        localStorage.removeItem("userEmail");
        setShowProfile(false);
        navigate("/login", {
            state: {
                consoleTitle: consoleInfo.consoleTitle,
                scopeLabel: consoleInfo.scopeLabel,
                destinationPath: consoleInfo.path,
            },
            replace: true,
        });
    };

    return (
        <>
            <header className="mlp-topbar">
                {/* Left: Brand Logo & Title */}
                <div className="mlp-topbar-brand" onClick={() => navigate("/")}>
                    <NeovaticMark size={26} className="mlp-brand-logo" />
                    <div className="mlp-brand-text">
                        <span className="mlp-brand-name">Neo AI Service Desk</span>
                        <span className="mlp-brand-tagline">UNDERSTOOD. GOVERNED. RESOLVED.</span>
                    </div>
                </div>

                {/* Center: Action Icons & Search */}
                <div className="mlp-topbar-center">
                    {/* notifications */}
                    <button
                        type="button"
                        className="mlp-icon-btn"
                        title="Notifications"
                        onClick={handleNotificationClick}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>

                    {/* Home */}
                    <button type="button" className="mlp-icon-btn" title="Home" onClick={() => navigate("/")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </button>

                    {/* Back*/}
                    <button type="button" className="mlp-icon-btn" title="Back" onClick={() => navigate(-1)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    {/* Forward */}
                    <button type="button" className="mlp-icon-btn" title="Forward">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>

                    {/* Search bar */}
                    <div className="mlp-search-box">
                        <span className="mlp-search-icon">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            className="mlp-search-input"
                            placeholder="Search tickets, customers, modules"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right: Theme toggle & User Avatar with Profile Popover */}
                <div className="mlp-topbar-right" ref={profileRef}>
                    {/* Toggle Theme */}
                    <button
                        type="button"
                        className="mlp-icon-btn"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        onClick={toggleTheme}
                    >
                        {isDark ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {/* Avatar Badge & Profile Popover Card */}
                    <div className="mlp-avatar-wrapper">
                        <div
                            className={`mlp-avatar-badge ${showProfile ? "active" : ""}`}
                            title={displayName}
                            onClick={() => setShowProfile((prev) => !prev)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setShowProfile((prev) => !prev);
                                }
                            }}
                        >
                            {userInitial}
                        </div>

                        {/* Popover Card */}
                        {showProfile && (
                            <div className="mlp-profile-card" onClick={(e) => e.stopPropagation()}>
                                <div className="mlp-profile-header">
                                    <h4 className="mlp-profile-name">{displayName}</h4>
                                    <span className="mlp-profile-role">{consoleInfo.role}</span>
                                    <span className="mlp-profile-email">{emailParam || "user@neovatic.com"}</span>
                                </div>

                                <div className="mlp-profile-divider" />

                                <div className="mlp-profile-body">
                                    <p className="mlp-profile-scope">{consoleInfo.scopeDesc}</p>
                                </div>

                                <div className="mlp-profile-divider" />

                                <div className="mlp-profile-footer">
                                    <button
                                        type="button"
                                        className="mlp-profile-signout-btn"
                                        onClick={handleSignOut}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        <span>Sign out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};

export default TopBar;