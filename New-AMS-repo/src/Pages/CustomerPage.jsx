import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Styles/CustomerPage.css";
import "../Styles/ConsultantPage.css";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";
import { ticketsAPI } from "../Services/TicketsAPI";
import { getDeliveryWorkflowAPI } from "../Services/GetDeliveryWorkflowAPI";
import { postCustomerApprovedHours } from "../Services/PostCustomerApprovedHours";
import { CircularProgress, Alert, Skeleton } from "@mui/material";
import Notification from "../Features/ModuleLeadComponents/Notification";

const navItemsList = [
  { id: "portal", label: "Customer Portal" },
  { id: "notifications", label: "Notifications" },
  { id: "neoai", label: "NeoAI" },
];

const STEPS = [
  { key: "ticketAck", label: "Ticket Ack", docType: "Ticket ACK" },
  { key: "brd", label: "BRD", docType: "BRD" },
  { key: "bud", label: "BUD", docType: "BUD" },
];

const parseDateTimestamp = (dateStr) => {
  if (!dateStr) return 0;
  if (dateStr instanceof Date) return dateStr.getTime();
  const s = String(dateStr).trim();

  // 1. Check if DD-MM-YYYY or MM/DD/YYYY with optional time and AM/PM
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null;

    if (ampm) {
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      // In format like "10/1/2026 11:49:04 AM" with slashes and AM/PM: p1 is Month, p2 is Day
      if (s.includes("/")) {
        return new Date(year, p1 - 1, p2, hour, min, sec).getTime();
      }
    }

    // If p1 > 12, p1 is day and p2 is month (e.g. 30-09-2026)
    if (p1 > 12) {
      return new Date(year, p2 - 1, p1, hour, min, sec).getTime();
    }
    // If p2 > 12, p2 is day and p1 is month
    if (p2 > 12) {
      return new Date(year, p1 - 1, p2, hour, min, sec).getTime();
    }
    // If hyphenated like "30-09-2026", standard format is DD-MM-YYYY
    if (s.includes("-")) {
      return new Date(year, p2 - 1, p1, hour, min, sec).getTime();
    }
    // Slashed format with no AM/PM: try native or default MM/DD/YYYY
    const nativeTs = Date.parse(s);
    if (!isNaN(nativeTs)) return nativeTs;
    return new Date(year, p1 - 1, p2, hour, min, sec).getTime();
  }

  // 2. Handle YYYY-MM-DD or YYYY/MM/DD with optional time
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    let hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const ampm = ymdMatch[7] ? ymdMatch[7].toUpperCase() : null;
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return new Date(year, month, day, hour, min, sec).getTime();
  }

  const nativeParsed = Date.parse(s);
  if (!isNaN(nativeParsed)) return nativeParsed;

  return 0;
};

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return "";
  const ts = parseDateTimestamp(dateVal);
  if (!ts) return String(dateVal);
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const getLatestStepRecord = (stepsArray, docType) => {
  if (!Array.isArray(stepsArray) || stepsArray.length === 0 || !docType) return null;
  const targetDt = docType.trim().toLowerCase();
  const matching = stepsArray.filter((s) => {
    if (!s || !s.documentType) return false;
    const sDt = String(s.documentType).trim().toLowerCase();
    if (targetDt === "ticket ack" || targetDt === "tck ack") {
      return sDt === "ticket ack" || sDt === "tck ack" || sDt.includes("ticket ack");
    }
    return sDt === targetDt;
  });
  if (matching.length === 0) return null;
  if (matching.length === 1) return matching[0];
  matching.sort((a, b) => {
    const timeA = parseDateTimestamp(a.startDate);
    const timeB = parseDateTimestamp(b.startDate);
    return timeB - timeA;
  });
  return matching[0];
};

const isDocCompleted = (stepsArray, docType) => {
  if (!Array.isArray(stepsArray) || stepsArray.length === 0 || !docType) return false;
  const targetDt = docType.trim().toLowerCase();
  return stepsArray.some((s) => {
    if (!s || !s.documentType) return false;
    const sDt = String(s.documentType).trim().toLowerCase();
    if (targetDt === "ticket ack" || targetDt === "tck ack") {
      return sDt === "ticket ack" || sDt === "tck ack" || sDt.includes("ticket ack");
    }
    return sDt === targetDt;
  });
};

const hasAssignedConsultant = (t) => {
  if (!t) return false;
  const consultant = t.responsibleBy || t.name || t.assignedConsultant || t.assignedTo || "";
  return String(consultant).trim().length > 0;
};

const CustomerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("portal");
  const [searchText, setSearchText] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // Workflow cache per ticket: { [ticketId]: stepsArray }
  const [workflowCache, setWorkflowCache] = useState({});
  const [loadingWorkflow, setLoadingWorkflow] = useState({});
  const [expandedStep, setExpandedStep] = useState({}); // { [ticketId]: "ticketAck" | "brd" | "bud" | null }
  const [customerApprovedHours, setCustomerApprovedHours] = useState({}); // { [ticketId]: string }
  const [submittingHours, setSubmittingHours] = useState({}); // { [ticketId]: boolean }
  const [budAlert, setBudAlert] = useState({}); // { [ticketId]: { type, message } }

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  useEffect(() => {
    (async function loadTickets() {
      setLoadingTickets(true);
      try {
        const res = await ticketsAPI();
        if (res && res.data && Array.isArray(res.data)) {
          setTickets(res.data);
        } else {
          setTickets([]);
        }
      } catch (err) {
        console.error("Error fetching tickets in CustomerPage:", err);
        setTickets([]);
      } finally {
        setLoadingTickets(false);
      }
    })();
  }, []);

  // Filter only tickets that have an assigned consultant (responsibleBy / name / assignedConsultant)
  const ticketsWithConsultant = useMemo(() => {
    return tickets.filter(hasAssignedConsultant);
  }, [tickets]);

  // Filtered tickets based on search
  const filteredTickets = useMemo(() => {
    if (!searchText) return ticketsWithConsultant;
    const lower = searchText.toLowerCase();
    return ticketsWithConsultant.filter(
      (t) =>
        (t.ticketNo && String(t.ticketNo).toLowerCase().includes(lower)) ||
        (t.description && String(t.description).toLowerCase().includes(lower)) ||
        (t.remarks && String(t.remarks).toLowerCase().includes(lower)) ||
        (t.clientName && String(t.clientName).toLowerCase().includes(lower)) ||
        (t.name && String(t.name).toLowerCase().includes(lower)) ||
        (t.responsibleBy && String(t.responsibleBy).toLowerCase().includes(lower))
    );
  }, [ticketsWithConsultant, searchText]);

  // Limit tickets by visibleCount (initial 10, expandable via "Show More")
  const visibleTickets = useMemo(() => {
    return filteredTickets.slice(0, visibleCount);
  }, [filteredTickets, visibleCount]);

  const fetchTicketWorkflow = useCallback(async (ticketId, forceRefresh = false) => {
    if (!ticketId) return;
    if (!forceRefresh && workflowCache[ticketId]) return;

    setLoadingWorkflow((prev) => ({ ...prev, [ticketId]: true }));
    try {
      const res = await getDeliveryWorkflowAPI(ticketId);
      if (res && res.data) {
        let stepsData = [];
        if (Array.isArray(res.data)) {
          stepsData = res.data;
        } else if (res.data.steps && Array.isArray(res.data.steps)) {
          stepsData = res.data.steps;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          stepsData = res.data.data;
        }
        setWorkflowCache((prev) => ({ ...prev, [ticketId]: stepsData }));
      } else {
        setWorkflowCache((prev) => ({ ...prev, [ticketId]: [] }));
      }
    } catch (err) {
      console.error("Error fetching delivery workflow for ticket:", ticketId, err);
      setWorkflowCache((prev) => ({ ...prev, [ticketId]: [] }));
    } finally {
      setLoadingWorkflow((prev) => ({ ...prev, [ticketId]: false }));
    }
  }, [workflowCache]);

  // Automatically fetch workflow for visible tickets to populate the 3-step SLA progress bar
  useEffect(() => {
    if (visibleTickets.length === 0) return;
    visibleTickets.forEach((ticket) => {
      const ticketId = ticket.ticketNo || ticket.id;
      if (ticketId && !workflowCache[ticketId] && !loadingWorkflow[ticketId]) {
        fetchTicketWorkflow(ticketId);
      }
    });
  }, [visibleTickets, workflowCache, loadingWorkflow, fetchTicketWorkflow]);

  // Compute completed steps out of 3 (Ticket ACK, BRD, BUD)
  const getCompletedStepsCount = (ticketId) => {
    const stepsData = workflowCache[ticketId];
    if (!Array.isArray(stepsData) || stepsData.length === 0) return 0;
    let count = 0;
    if (isDocCompleted(stepsData, "Ticket ACK")) count++;
    if (isDocCompleted(stepsData, "BRD")) count++;
    if (isDocCompleted(stepsData, "BUD")) count++;
    return count;
  };

  const handleStepClick = async (ticket, stepKey) => {
    const ticketId = ticket.ticketNo || ticket.id;
    if (!ticketId) return;

    if (expandedStep[ticketId] === stepKey) {
      // Toggle close if already open
      setExpandedStep((prev) => ({ ...prev, [ticketId]: null }));
      return;
    }

    setExpandedStep((prev) => ({ ...prev, [ticketId]: stepKey }));
    if (!workflowCache[ticketId]) {
      fetchTicketWorkflow(ticketId);
    }
  };

  const handleSaveBudHours = async (ticketId, maxTotalHours) => {
    const hoursVal = customerApprovedHours[ticketId];
    if (hoursVal === undefined || hoursVal === null || String(hoursVal).trim() === "") {
      setBudAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "warning",
          message: "Customer Approved Hours is required. Please enter approved hours.",
        },
      }));
      return;
    }

    const numHours = Number(hoursVal);
    if (isNaN(numHours) || numHours <= 0) {
      setBudAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "warning",
          message: "Please enter a valid positive number for Customer Approved Hours.",
        },
      }));
      return;
    }

    if (maxTotalHours !== undefined && maxTotalHours !== null && !isNaN(maxTotalHours) && maxTotalHours > 0) {
      if (numHours > maxTotalHours) {
        setBudAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "error",
            message: `Customer Approved Hours (${numHours}) cannot exceed Estimated Total Hours (${maxTotalHours} hrs).`,
          },
        }));
        return;
      }
    }

    setSubmittingHours((prev) => ({ ...prev, [ticketId]: true }));
    setBudAlert((prev) => ({ ...prev, [ticketId]: null }));

    try {
      const res = await postCustomerApprovedHours(ticketId, "BUD", numHours);
      if (res && res.success) {
        setBudAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "success",
            message: res.message || "Customer approved hours saved successfully.",
          },
        }));
        // Refresh workflow to update latest state
        await fetchTicketWorkflow(ticketId, true);
      } else {
        setBudAlert((prev) => ({
          ...prev,
          [ticketId]: {
            type: "error",
            message: res?.message || "Failed to update Customer Approved Hours. Please try again.",
          },
        }));
      }
    } catch (err) {
      console.error("Error submitting Customer Approved Hours:", err);
      setBudAlert((prev) => ({
        ...prev,
        [ticketId]: {
          type: "error",
          message: "An error occurred while updating. Please try again.",
        },
      }));
    } finally {
      setSubmittingHours((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Customer Portal",
  };

  return (
    <div className="cp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar
        setSearchText={setSearchText}
        searchText={searchText}
        onNotificationClick={() => setActiveNav("notifications")}
      />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="cp-body-layout">
        {/* Sidebar */}
        <aside className="cp-sidebar">
          {/* 1. PORTAL */}
          <div className="cp-nav-group">
            <div className="cp-nav-group-title">PORTAL</div>
            <button
              type="button"
              className={`cp-nav-item ${activeNav === "portal" ? "active" : ""}`}
              onClick={() => setActiveNav("portal")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>Customer Portal</span>
            </button>

            <button
              type="button"
              className={`cp-nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => setActiveNav("notifications")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>

            <button
              type="button"
              className={`cp-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => setActiveNav("neoai")}
            >
              <span className="cp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="cp-content">
          {activeNav === "portal" ? (
            <div className="cp-portal-main">
              {/* Breadcrumb */}
              <div className="cons-breadcrumb-row">
                <span className="cons-breadcrumb-muted">CUSTOMER</span>
                <span className="cons-breadcrumb-sep">›</span>
                <span className="cons-breadcrumb-curr">CUSTOMER PORTAL</span>
              </div>

              {/* Header */}
              <div className="cp-header-wrap">
                <h1 className="cp-page-title">Customer Portal</h1>
                <p className="cp-page-subtitle">
                  Your tickets only, enforced at the data layer. Review documents, accept timelines, run UAT and sign off.
                </p>
                {/* <div className="cp-page-meta">
                  Vantage Foods · signed in as {userName || "Customer"}
                </div> */}
              </div>

              {/* 4 Stat Cards */}
              <div className="cons-stat-grid-4" style={{ marginBottom: "20px" }}>
                {/* Card 1: OPEN IN MY TEAM */}
                <div className="cons-stat-card cons-card-emerald">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-emerald">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">OPEN IN MY TEAM</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : (filteredTickets.length || 20)}
                    </span>
                    <span className="cons-pill-badge cons-pill-emerald">
                      Active Queue <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>SAP FICO · click to open the list</span>
                  </div>
                </div>

                {/* Card 2: AWAITING MY ALLOCATION */}
                <div className="cons-stat-card cons-card-teal">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-teal">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">AWAITING MY ALLOCATION</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 331}
                    </span>
                    <span className="cons-pill-badge cons-pill-teal">
                      Unassigned <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>routed to my module by the agent</span>
                  </div>
                </div>

                {/* Card 3: SLA AT RISK */}
                <div className="cons-stat-card cons-card-amber">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-amber">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">SLA AT RISK</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 3499}
                    </span>
                    <span className="cons-pill-badge cons-pill-amber">
                      At Risk <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>above 75% of the resolution target</span>
                  </div>
                </div>

                {/* Card 4: WITH THE CUSTOMER */}
                <div className="cons-stat-card cons-card-purple">
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-purple">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">WITH THE CUSTOMER</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 2}
                    </span>
                    <span className="cons-pill-badge cons-pill-purple">
                      Paused <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>clock paused where the contract allows</span>
                  </div>
                </div>
              </div>

              {/* All Tickets Section Header Row with Show More at Beginning */}
              <div className="cp-tickets-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span className="cp-tickets-section-label" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    All Tickets
                  </span>
                  <span className="cp-tickets-count" style={{ fontSize: "11.5px", fontWeight: 600, color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "9999px" }}>
                    {loadingTickets
                      ? "Loading tickets..."
                      : `${Math.min(visibleCount, filteredTickets.length)} of ${filteredTickets.length || 0} tickets`}
                  </span>
                </div>

                {!loadingTickets && visibleCount < filteredTickets.length && (
                  <button
                    type="button"
                    className="cp-show-more-btn"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    <span>Show more tickets</span>
                    <span className="cp-show-more-count">
                      ({filteredTickets.length - visibleCount} remaining)
                    </span>
                  </button>
                )}
              </div>

              {/* Ticket Cards List */}
              <div className="cp-tickets-list">
                {loadingTickets ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="cp-ticket-wrapper-card" style={{ pointerEvents: "none" }}>
                        <div className="cp-ticket-row-card">
                          <div className="cp-ticket-info-block" style={{ width: "100%" }}>
                            <div className="cp-ticket-title-line" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <Skeleton variant="rectangular" width={100} height={22} sx={{ borderRadius: "4px" }} />
                              <Skeleton variant="text" width="55%" height={22} />
                            </div>
                            <div className="cp-ticket-stage-line" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                              <Skeleton variant="text" width={80} height={18} />
                              <Skeleton variant="text" width={180} height={18} />
                            </div>
                            <div className="cp-ticket-sla-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                              <Skeleton variant="text" width={28} height={16} />
                              <Skeleton variant="rectangular" width={200} height={7} sx={{ borderRadius: "10px" }} />
                              <Skeleton variant="text" width={130} height={16} />
                            </div>
                          </div>
                          <div className="cp-ticket-actions-row">
                            <Skeleton variant="rectangular" width={85} height={32} sx={{ borderRadius: "6px" }} />
                            <Skeleton variant="rectangular" width={55} height={32} sx={{ borderRadius: "6px" }} />
                            <Skeleton variant="rectangular" width={55} height={32} sx={{ borderRadius: "6px" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visibleTickets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "#ffffff", borderRadius: "8px" }}>
                    No tickets found.
                  </div>
                ) : (
                  <>
                    {visibleTickets.map((ticket) => {
                      const ticketId = ticket.ticketNo ;
                      const activeStepKey = expandedStep[ticketId];
                      const stepsData = workflowCache[ticketId] || [];
                      const isLoading = loadingWorkflow[ticketId];
                      const completedCount = getCompletedStepsCount(ticketId);

                      return (
                        <div key={ticketId} className="cp-ticket-wrapper-card">
                          {/* Main Row Line */}
                          <div className="cp-ticket-row-card">
                            <div className="cp-ticket-info-block">
                              <div className="cp-ticket-title-line">
                                <span className="cp-ticket-id">{ticket.ticketNo}</span>
                                <span className="cp-ticket-title">
                                  {ticket.description || "No description provided"}
                                </span>
                              </div>
                              <div className="cp-ticket-stage-line">
                                <span className="cp-ticket-status">{ticket.ticketStatus || ""}</span>
                                {" · "}
                                current stage: <span className="cp-ticket-stage">Delivery Workflow (3 Steps)</span>
                              </div>

                              {/* SLA 3-Step Progress Indicator */}
                              <div className="cp-ticket-sla-row">
                                <span className="cp-ticket-sla-title">SLA</span>
                                <div className="cp-ticket-sla-track">
                                  <div
                                    className="cp-ticket-sla-fill"
                                    style={{
                                      width: `${(completedCount / 3) * 100}%`,
                                      transition: "width 0.4s ease",
                                    }}
                                  />
                                </div>
                                <span className="cp-ticket-sla-text">
                                  {isLoading && !workflowCache[ticketId]
                                    ? "Loading steps..."
                                    : `Delivery ${completedCount} of 3 completed`}
                                </span>
                              </div>
                            </div>

                            {/* 3 Step Action Buttons: Ticket Ack, BRD, BUD */}
                            <div className="cp-ticket-actions-row">
                              {STEPS.map((step) => {
                                const isActive = activeStepKey === step.key;
                                return (
                                  <button
                                    key={step.key}
                                    type="button"
                                    className={`cp-step-btn ${isActive ? "active" : ""}`}
                                    onClick={() => handleStepClick(ticket, step.key)}
                                  >
                                    {step.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Step Details Card when a step is clicked */}
                          {activeStepKey && (
                            <div className="cp-step-detail-container">
                              {isLoading ? (
                                <div className="cp-step-detail-loading">
                                  <CircularProgress size={20} />
                                  <span>Loading {STEPS.find((s) => s.key === activeStepKey)?.label} details...</span>
                                </div>
                              ) : (
                                (() => {
                                  const stepDef = STEPS.find((s) => s.key === activeStepKey);
                                  const rec = getLatestStepRecord(stepsData, stepDef?.docType);
                                  const isBud = activeStepKey === "bud";
                                  const isStepCompleted = Boolean(rec);
                                  const statusChipLabel = isStepCompleted ? "Completed" : "Pending";

                                  const startDateVal = formatDateDisplay(rec?.startDate);
                                  const endDateVal = formatDateDisplay(rec?.endDate);
                                  const consultantVal = rec?.responsibleBy || "";
                                  const stepStatusVal = rec?.stepStatus || (rec ? "Completed" : "Pending");
                                  const custAckVal = formatDateDisplay(rec?.customerAcknowledgement);

                                  const budStatusVal = rec?.stepStatus || (rec ? "Completed" : "Pending");

                                  const rawEstTech = rec?.estimatedTechnicalHours !== null && rec?.estimatedTechnicalHours !== undefined && !isNaN(Number(rec.estimatedTechnicalHours))
                                    ? Number(rec.estimatedTechnicalHours)
                                    : 0;
                                  const rawEstFunc = rec?.estimatedFunctionalHours !== null && rec?.estimatedFunctionalHours !== undefined && !isNaN(Number(rec.estimatedFunctionalHours))
                                    ? Number(rec.estimatedFunctionalHours)
                                    : 0;
                                  const rawEstTotal = rec?.estimatedTotalHours !== null && rec?.estimatedTotalHours !== undefined && !isNaN(Number(rec.estimatedTotalHours)) && Number(rec.estimatedTotalHours) > 0
                                    ? Number(rec.estimatedTotalHours)
                                    : (rawEstTech + rawEstFunc > 0 ? rawEstTech + rawEstFunc : null);

                                  const estTechHours = rec?.estimatedTechnicalHours || "";
                                  const estFuncHours = rec?.estimatedFunctionalHours || "";
                                  const estTotalHours = rawEstTotal !== null ? String(rawEstTotal) : (rec?.estimatedTotalHours || "");

                                  const rawApprovedVal =
                                    rec?.customerApprovedHours !== undefined && rec?.customerApprovedHours !== null && String(rec?.customerApprovedHours).trim() !== ""
                                      ? rec.customerApprovedHours
                                      : (rec?.approvedHours !== undefined && rec?.approvedHours !== null && String(rec?.approvedHours).trim() !== ""
                                          ? rec.approvedHours
                                          : null);

                                  // If backend sends "0.0", "0", 0, null, or empty, it should NOT be considered submitted
                                  const isHoursSubmitted =
                                    rawApprovedVal !== null &&
                                    String(rawApprovedVal).trim() !== "" &&
                                    !isNaN(Number(rawApprovedVal)) &&
                                    Number(rawApprovedVal) > 0;

                                  const approvedHoursVal = isHoursSubmitted
                                    ? String(rawApprovedVal)
                                    : (customerApprovedHours[ticketId] !== undefined
                                        ? customerApprovedHours[ticketId]
                                        : "");

                                  return (
                                    <div className="cp-step-detail-card">
                                      {/* Alert Feedback for BUD actions */}
                                      {isBud && budAlert[ticketId] && (
                                        <Alert
                                          severity={budAlert[ticketId].type}
                                          onClose={() => setBudAlert((prev) => ({ ...prev, [ticketId]: null }))}
                                          sx={{ mb: 1.5, fontSize: "12.5px" }}
                                        >
                                          {budAlert[ticketId].message}
                                        </Alert>
                                      )}

                                      <div className="cp-step-detail-header">
                                        <div className="cp-step-detail-title-wrap">
                                          <span className="cp-step-pill-indicator">{stepDef?.label}</span>
                                          <h4 className="cp-step-detail-title">
                                            {stepDef?.label === "Ticket Ack"
                                              ? "Ticket Acknowledgement (Ticket ACK)"
                                              : stepDef?.label === "BRD"
                                              ? "Business Requirement Document (BRD)"
                                              : "Business Understanding Document (BUD)"}
                                          </h4>
                                        </div>
                                        <span className={`cp-step-status-chip ${isStepCompleted ? "completed" : "pending"}`}>
                                          {statusChipLabel}
                                        </span>
                                      </div>

                                      {/* Fields Grid */}
                                      <div className="cp-step-fields-grid">
                                        {/* 1. Start Date */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">START DATE</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={startDateVal}
                                          />
                                        </div>

                                        {/* 2. End Date */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">END DATE</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={endDateVal}
                                          />
                                        </div>

                                        {/* 3. Assigned Consultant */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">ASSIGNED CONSULTANT</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={consultantVal}
                                          />
                                        </div>

                                        {/* 4. Ticket Ack Status / Step Status */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">
                                            {stepDef?.label === "Ticket Ack"
                                              ? "TICKET ACK STATUS"
                                              : `${stepDef?.label} STATUS`}
                                          </label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={isBud ? budStatusVal : stepStatusVal}
                                          />
                                        </div>

                                        {/* 5. Customer Acknowledged On */}
                                        <div className="cp-step-field-group">
                                          <label className="cp-step-field-lbl">CUSTOMER ACKNOWLEDGED ON</label>
                                          <input
                                            type="text"
                                            disabled
                                            className="cp-step-input-disabled"
                                            value={custAckVal}
                                          />
                                        </div>

                                        {/* Extra fields for BUD */}
                                        {isBud && (
                                          <>
                                            {/* 6. Estimated Technical Hours */}
                                            <div className="cp-step-field-group">
                                              <label className="cp-step-field-lbl">ESTIMATED TECHNICAL HOURS</label>
                                              <input
                                                type="text"
                                                disabled
                                                className="cp-step-input-disabled"
                                                value={estTechHours}
                                              />
                                            </div>

                                            {/* 7. Estimated Functional Hours */}
                                            <div className="cp-step-field-group">
                                              <label className="cp-step-field-lbl">ESTIMATED FUNCTIONAL HOURS</label>
                                              <input
                                                type="text"
                                                disabled
                                                className="cp-step-input-disabled"
                                                value={estFuncHours}
                                              />
                                            </div>

                                            {/* 8. Estimated Total Hours */}
                                            <div className="cp-step-field-group">
                                              <label className="cp-step-field-lbl">ESTIMATED TOTAL HOURS</label>
                                              <input
                                                type="text"
                                                disabled
                                                className="cp-step-input-disabled"
                                                value={estTotalHours}
                                              />
                                            </div>

                                            {/* 9. Customer Approved Hours */}
                                            <div className={`cp-step-field-group ${!isHoursSubmitted ? "cp-step-field-highlight" : ""}`}>
                                              <label className={`cp-step-field-lbl ${!isHoursSubmitted ? "cp-lbl-editable" : ""}`}>
                                                CUSTOMER APPROVED HOURS {!isHoursSubmitted && <span style={{ color: "#2563eb" }}>*</span>}
                                              </label>
                                              <input
                                                type={isHoursSubmitted ? "text" : "number"}
                                                disabled={isHoursSubmitted}
                                                className={isHoursSubmitted ? "cp-step-input-disabled" : "cp-step-input-editable"}
                                                placeholder={isHoursSubmitted ? "" : "Enter approved hours..."}
                                                value={approvedHoursVal}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setCustomerApprovedHours((prev) => ({
                                                    ...prev,
                                                    [ticketId]: val,
                                                  }));
                                                  const enteredNum = Number(val);
                                                  if (rawEstTotal !== null && rawEstTotal > 0 && !isNaN(enteredNum) && val !== "" && enteredNum > rawEstTotal) {
                                                    setBudAlert((prev) => ({
                                                      ...prev,
                                                      [ticketId]: {
                                                        type: "error",
                                                        message: `Customer Approved Hours (${enteredNum}) cannot exceed Estimated Total Hours (${rawEstTotal} hrs).`,
                                                      },
                                                    }));
                                                  } else if (budAlert[ticketId]?.type === "error" && budAlert[ticketId]?.message?.includes("cannot exceed")) {
                                                    setBudAlert((prev) => ({
                                                      ...prev,
                                                      [ticketId]: null,
                                                    }));
                                                  }
                                                }}
                                                min={0}
                                              />
                                              {isHoursSubmitted && (
                                                <span className="cp-step-submitted-note">
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                  </svg>
                                                  Customer approved hours already submitted.
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* BUD Submit Button */}
                                      {isBud && !isHoursSubmitted && (
                                        <div className="cp-bud-action-row">
                                          <button
                                            type="button"
                                            className="cp-submit-hours-btn"
                                            disabled={submittingHours[ticketId]}
                                            onClick={() => handleSaveBudHours(ticketId, rawEstTotal)}
                                          >
                                            {submittingHours[ticketId] ? (
                                              <>
                                                <CircularProgress size={14} color="inherit" />
                                                <span>Submitting...</span>
                                              </>
                                            ) : (
                                              <>
                                                {/* <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="20 6 9 17 4 12" />
                                                </svg> */}
                                                <span>Submit</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}

                                      {!rec && (
                                        <p className="cp-step-empty-note">
                                          No specific record available yet for {stepDef?.label}. Fields shown above are in pending state.
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Bottom Footer Note */}
              <div className="cp-footer-note">
                Documents open from the ticket record. Accepting timelines, UAT results and sign-off are recorded with your identity and timestamp — the same evidence your service review reports on.
              </div>
            </div>
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage roleName="CUSTOMER" />
          ) : (
            <Notification currentNav={currentNav} roleName="CUSTOMER" />
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Customer Portal" userEmail={emailParam} />
    </div>
  );
};

export default CustomerPage;
