import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Skeleton } from "@mui/material";
import "../Styles/ModuleLeadPage.css";
import "../Styles/ConsultantPage.css";
import { ticketsAPI } from "../Services/TicketsAPI";
import { getEmployeesAPI } from "../Services/GetEmployeesAPI";
import { getPriorityAPI } from "../Services/GetPriority";
import { getStatusesAPI } from "../Services/GetStatusAPI";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import { updateTicketsAPI } from "../Services/UpdateTicketsAPI";

// Sub-components
import TicketDetailsPage from "../Features/ModuleLeadComponents/TicketDetailsPage";
import DeliveryWorkflow from "../Features/ModuleLeadComponents/DeliveryWorkflow";
import AIConfiguration from "../Features/ModuleLeadComponents/AIConfiguration";
import Notification from "../Features/ModuleLeadComponents/Notification";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";

const fallbackStatuses = [
  { id: 1, name: "Created" },
  { id: 2, name: "Assigned" },
  { id: 3, name: "Inprocess" },
  { id: 4, name: "In quality" },
  { id: 5, name: "Ready for production" },
  { id: 6, name: "Approved for production" },
  { id: 7, name: "In production" },
  { id: 8, name: "Closed" },
  { id: 9, name: "WCA: Response from customer" },
  { id: 10, name: "WCA: Additional info" },
  { id: 11, name: "WCA: Confirmation from customer" },
  { id: 12, name: "WCA: User acceptance testing" },
  { id: 13, name: "WCA: Solution acceptance" },
  { id: 14, name: "WCA: Customer approval for prod" },
  { id: 15, name: "In Proc: Vendor" },
  { id: 16, name: "In Proc: Internal group" },
  { id: 17, name: "In Proc: On hold" },
  { id: 18, name: "Cancel" },
  { id: 19, name: "Technically Closed" },
];

const fallbackPriorities = [
  { id: 4, name: "Very High (Production Impacted)", code: "P1" },
  { id: 3, name: "High (Business Impacted)", code: "P2" },
  { id: 2, name: "Medium", code: "P3" },
  { id: 1, name: "Low", code: "P4" },
];

const ConsultantPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeNav, setActiveNav] = useState(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) return tabParam;
    if (searchParams.get("ticket")) return "tickets";
    return localStorage.getItem("consultantActiveNav") || "dashboard";
  });

  const [searchText, setSearchText] = useState("");

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [prioties, setPriorities] = useState(fallbackPriorities);
  const [statuses, setStatuses] = useState(fallbackStatuses);

  // Ticket Details state
  const [visibleCount, setVisibleCount] = useState(20);
  const [selectedTicketIdx, setSelectedTicketIdx] = useState(0);
  const [aiPanelOn, setAiPanelOn] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Delivery Workflow state
  const [workflowTicketIdx, setWorkflowTicketIdx] = useState(0);
  const [workflowVisibleCount, setWorkflowVisibleCount] = useState(10);

  // Assign and update form state
  const [assignTo, setAssignTo] = useState("");
  const [assignStatus, setAssignStatus] = useState("");
  const [assignPriority, setAssignPriority] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [showReviewBox, setShowReviewBox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert message state (MUI Alert)
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState("info");
  const [alertMessage, setAlertMessage] = useState("");

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  useEffect(() => {
    if (alertOpen) {
      const timer = setTimeout(() => {
        setAlertOpen(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertOpen]);

  useEffect(() => {
    (async function getData() {
      setLoadingTickets(true);
      try {
        const ticketResponse = await ticketsAPI();
        if (ticketResponse && ticketResponse.data) {
          setTickets(ticketResponse.data);
        }
      } catch (e) {
        console.error("Error fetching tickets", e);
      } finally {
        setLoadingTickets(false);
      }

      try {
        const employeesResponse = await getEmployeesAPI();
        if (employeesResponse && employeesResponse.data) {
          setEmployees(employeesResponse.data);
        }
      } catch (e) {
        console.error("Error fetching employees", e);
      }

      try {
        const priorityResponse = await getPriorityAPI();
        if (priorityResponse && priorityResponse.data && priorityResponse.data.length > 0) {
          setPriorities(priorityResponse.data);
        }
      } catch (e) {
        console.error("Error fetching priorities", e);
      }

      try {
        const statusesResponse = await getStatusesAPI();
        if (statusesResponse && statusesResponse.data && statusesResponse.data.length > 0) {
          const seen = new Set();
          const unique = [];
          for (const item of statusesResponse.data) {
            const rawName = item.name || item.status || item.statusName || "";
            const norm = rawName.trim().replace(/\s+/g, " ");
            if (norm && !seen.has(norm.toLowerCase())) {
              seen.add(norm.toLowerCase());
              unique.push({ ...item, name: norm });
            }
          }
          setStatuses(unique.length > 0 ? unique : fallbackStatuses);
        }
      } catch (e) {
        console.error("Error fetching statuses", e);
      }
    })();
  }, []);

  const uniqueStatuses = useMemo(() => {
    const list = statuses && statuses.length > 0 ? statuses : fallbackStatuses;
    const seen = new Set();
    const result = [];
    for (const item of list) {
      const raw = item.name || item.status || item.statusName || "";
      const cleaned = String(raw).trim().replace(/\s+/g, " ");
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        result.push({ ...item, name: cleaned });
      }
    }
    return result;
  }, [statuses]);

  const uniquePriorities = useMemo(() => {
    return prioties && prioties.length > 0 ? prioties : fallbackPriorities;
  }, [prioties]);

  const formatPriorityCode = (priority) => {
    if (!priority) return "P4";
    const p = String(priority).trim().toLowerCase();
    if (p.includes("very high") || p === "p1" || p.includes("production")) return "P1";
    if (p.includes("high") || p === "p2" || p.includes("business")) return "P2";
    if (p.includes("medium") || p === "p3") return "P3";
    if (p.includes("low") || p === "p4") return "P4";
    return priority;
  };

  const getPriorityClass = (priority) => {
    const code = formatPriorityCode(priority).toLowerCase();
    if (code === "p1") return "p1";
    if (code === "p2") return "p2";
    if (code === "p3") return "p3";
    return "p4";
  };

  const filteredTickets = useMemo(() => {
    if (!searchText) return tickets;
    const q = searchText.toLowerCase();
    return tickets.filter(
      (t) =>
        (t.ticketNo && String(t.ticketNo).toLowerCase().includes(q)) ||
        (t.remarks && String(t.remarks).toLowerCase().includes(q)) ||
        (t.clientName && String(t.clientName).toLowerCase().includes(q)) ||
        (t.ticketStatus && String(t.ticketStatus).toLowerCase().includes(q)) ||
        (t.createdname && String(t.createdname).toLowerCase().includes(q)) ||
        (t.name && String(t.name).toLowerCase().includes(q))
    );
  }, [tickets, searchText]);

  const selectedTicket = useMemo(() => {
    const ticketInUrl = searchParams.get("ticket");
    if (ticketInUrl && filteredTickets.length > 0) {
      const found = filteredTickets.find(
        (t) => String(t.ticketNo).toLowerCase() === String(ticketInUrl).toLowerCase()
      );
      if (found) return found;
    }
    return filteredTickets[selectedTicketIdx] || filteredTickets[0] || null;
  }, [searchParams, filteredTickets, selectedTicketIdx]);

  const visibleTickets = filteredTickets.slice(0, visibleCount);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeNav) {
      setActiveNav(tabFromUrl);
      localStorage.setItem("consultantActiveNav", tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const ticketInUrl = searchParams.get("ticket");
    if (ticketInUrl && filteredTickets.length > 0) {
      const idx = filteredTickets.findIndex(
        (t) => String(t.ticketNo).toLowerCase() === ticketInUrl.toLowerCase()
      );
      if (idx !== -1) {
        if (idx !== selectedTicketIdx) {
          setSelectedTicketIdx(idx);
        }
        if (idx >= visibleCount) {
          setVisibleCount(Math.ceil((idx + 1) / 20) * 20);
        }
      }
    }
  }, [searchParams, filteredTickets]);

  useEffect(() => {
    localStorage.setItem("consultantActiveNav", activeNav);
    if (activeNav === "tickets") {
      setShowReviewBox(false);
      const ticketInUrl = searchParams.get("ticket");
      if (ticketInUrl && filteredTickets.length > 0) {
        const idx = filteredTickets.findIndex(
          (t) => String(t.ticketNo).toLowerCase() === String(ticketInUrl).toLowerCase()
        );
        if (idx !== -1) {
          setSelectedTicketIdx(idx);
          if (idx >= visibleCount) {
            setVisibleCount(Math.ceil((idx + 1) / 20) * 20);
          }
          if (searchParams.get("tab") !== "tickets") {
            setSearchParams({ tab: "tickets", ticket: ticketInUrl });
          }
          return;
        }
      }
      if (!ticketInUrl && filteredTickets.length > 0 && filteredTickets[0]?.ticketNo) {
        setSearchParams({ tab: "tickets", ticket: filteredTickets[0].ticketNo });
      }
    } else {
      if (searchParams.get("tab") !== activeNav || searchParams.get("ticket")) {
        setSearchParams({ tab: activeNav });
      }
    }
  }, [activeNav]);

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    localStorage.setItem("consultantActiveNav", navId);
    if (navId === "tickets") {
      const currentTicket = searchParams.get("ticket") || filteredTickets[0]?.ticketNo;
      if (currentTicket) {
        setSearchParams({ tab: "tickets", ticket: currentTicket });
      } else {
        setSearchParams({ tab: "tickets" });
      }
    } else {
      setSearchParams({ tab: navId });
    }
  };

  const handleSelectTicket = (idx, ticket) => {
    setSelectedTicketIdx(idx);
    setShowReviewBox(false);
    if (ticket && ticket.ticketNo) {
      setSearchParams({ tab: "tickets", ticket: ticket.ticketNo });
    }
  };

  // Only tickets that have a consultant assigned (i.e. 'name' property from API is non-empty)
  const consultantAssignedTickets = useMemo(() => {
    return filteredTickets.filter((t) => Boolean(t.name && String(t.name).trim()));
  }, [filteredTickets]);

  const workflowTickets = useMemo(() => {
    return consultantAssignedTickets.slice(0, workflowVisibleCount);
  }, [consultantAssignedTickets, workflowVisibleCount]);

  const selectedWorkflowTicket = workflowTickets[workflowTicketIdx] || consultantAssignedTickets[0] || null;

  const getFormattedCreatedDate = (dateStr) => {
    if (!dateStr) return "08/30/2026";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "08/30/2026";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const getComputedEndDate = (startDateStr, workingDaysCount, workingHoursCount) => {
    let d = new Date(startDateStr);
    if (isNaN(d.getTime())) d = new Date();
    let days = 1;
    const hasHours = workingHoursCount !== null && workingHoursCount !== undefined && String(workingHoursCount).trim() !== "" && Number(workingHoursCount) > 0;
    const hasDays = workingDaysCount !== null && workingDaysCount !== undefined && String(workingDaysCount).trim() !== "" && Number(workingDaysCount) > 0;

    if (hasHours) {
      days = Math.ceil(Number(workingHoursCount) / 8);
    } else if (hasDays) {
      days = parseInt(workingDaysCount, 10) || 1;
    }

    if (days < 1) days = 1;

    let current = new Date(d);
    let remainingDays = days;
    while (remainingDays > 1) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        remainingDays--;
      }
    }
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    const yyyy = current.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const toPriorityPayloadString = (p) => {
    if (!p) return "Low";
    const raw = String(p).trim().toLowerCase();
    if (raw.includes("very high") || raw === "p1" || raw.includes("production")) return "Very High (Production Impacted)";
    if (raw.includes("high") || raw === "p2" || raw.includes("business")) return "High (Business Impacted)";
    if (raw.includes("medium") || raw === "p3") return "Medium";
    if (raw.includes("low") || raw === "p4") return "Low";
    return p;
  };

  const handleReviewChangeClick = () => {
    const missing = [];
    if (!assignTo.trim()) missing.push("Assign To");
    if (!assignPriority.trim()) missing.push("Priority");
    if (!assignStatus.trim()) missing.push("Status");

    if (missing.length > 0) {
      setAlertType("error");
      setAlertMessage(`Please provide required fields: ${missing.join(", ")}.`);
      setAlertOpen(true);
      setShowReviewBox(false);
      return;
    }

    setAlertOpen(false);
    setShowReviewBox(true);
  };

  const handleConfirmAndWrite = async () => {
    if (!selectedTicket) {
      setAlertType("error");
      setAlertMessage("No ticket selected.");
      setAlertOpen(true);
      return;
    }

    const missing = [];
    if (!assignTo.trim()) missing.push("Assign To");
    if (!assignPriority.trim()) missing.push("Priority");
    if (!assignStatus.trim()) missing.push("Status");

    if (missing.length > 0) {
      setAlertType("error");
      setAlertMessage(`Please provide required fields: ${missing.join(", ")}.`);
      setAlertOpen(true);
      return;
    }

    const ticketId = selectedTicket.ticketNo;
    const priorityPayload = toPriorityPayloadString(assignPriority);

    setIsSubmitting(true);
    try {
      const response = await updateTicketsAPI(
        ticketId,
        assignTo.trim(),
        priorityPayload,
        assignStatus.trim(),
        workNote.trim()
      );

      if (response && response.success) {
        setAlertType("success");
        setAlertMessage(response.message || "Ticket updated successfully.");
        setAlertOpen(true);
        setShowReviewBox(false);

        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.ticketNo === ticketId
              ? {
                  ...t,
                  name: assignTo.trim(),
                  priority: priorityPayload,
                  ticketStatus: assignStatus.trim(),
                }
              : t
          )
        );
      } else {
        const isSuccessMsg =
          response?.message &&
          (response.message.toLowerCase().includes("success") ||
            response.message.toLowerCase().includes("saved") ||
            response.message.toLowerCase().includes("updated"));
        setAlertType(isSuccessMsg ? "success" : "error");
        setAlertMessage(response?.message || "Failed to update ticket.");
        setAlertOpen(true);
        if (isSuccessMsg) {
          setShowReviewBox(false);
          setTickets((prevTickets) =>
            prevTickets.map((t) =>
              t.ticketNo === ticketId
                ? {
                    ...t,
                    name: assignTo.trim(),
                    priority: priorityPayload,
                    ticketStatus: assignStatus.trim(),
                  }
                : t
            )
          );
        }
      }
    } catch (error) {
      console.error("Error confirming ticket update:", error);
      setAlertType("error");
      setAlertMessage("An error occurred while updating the ticket.");
      setAlertOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = useMemo(() => {
    let count = 0;
    if (assignTo && selectedTicket && assignTo !== (selectedTicket.name || "")) count++;
    if (assignStatus && selectedTicket && assignStatus !== (selectedTicket.ticketStatus || "")) count++;
    if (assignPriority && selectedTicket && assignPriority !== (selectedTicket.priority || "")) count++;
    if (workNote && workNote.trim()) count++;
    return count;
  }, [assignTo, assignStatus, assignPriority, workNote, selectedTicket]);

  const selectedPriorityCode = selectedTicket ? formatPriorityCode(selectedTicket.priority) : "P4";

  return (
    <div className="mlp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar
        setSearchText={setSearchText}
        searchText={searchText}
        onNotificationClick={() => handleNavClick("notifications")}
      />

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div className="mlp-body-layout">
        {/* Sidebar */}
        <aside className="mlp-sidebar">
          {/* Navigation Sections */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">MY WORK</div>
            {/* Overview / Dashboard */}
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "dashboard" ? "active" : ""}`}
              onClick={() => handleNavClick("dashboard")}
            >
              <span className="mlp-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              <span>Overview</span>
            </button>

            {/* Tickets */}
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "tickets" ? "active" : ""}`}
              onClick={() => handleNavClick("tickets")}
            >
              <span className="mlp-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                  <line x1="9" y1="9" x2="9" y2="9.01" />
                  <line x1="15" y1="9" x2="15" y2="9.01" />
                  <line x1="9" y1="15" x2="9" y2="15.01" />
                  <line x1="15" y1="15" x2="15" y2="15.01" />
                </svg>
              </span>
              <span>My Ticket Details</span>
            </button>

            {/* Workflow */}
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "workflow" ? "active" : ""}`}
              onClick={() => handleNavClick("workflow")}
            >
              <span className="mlp-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <span>Delivery Workflow</span>
            </button>

            {/* Notifications */}
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => handleNavClick("notifications")}
            >
              <span className="mlp-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>
          </div>

          {/* Knowledge */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">KNOWLEDGE</div>
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "neoai" ? "active" : ""}`}
              onClick={() => handleNavClick("neoai")}
            >
              <span className="mlp-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <span>NeoAI</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="mlp-content">
          {activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : activeNav === "dashboard" ? (
            <div className="cons-dashboard-wrap">
              {/* Breadcrumb */}
              <div className="cons-breadcrumb-row">
                <span className="cons-breadcrumb-muted">CONSULTANT</span>
                <span className="cons-breadcrumb-sep">›</span>
                <span className="cons-breadcrumb-curr">OVERVIEW</span>
              </div>

              {/* Title & Subtitle */}
              <div className="cons-page-header-row">
                <h1 className="cons-dashboard-title">My Dashboard</h1>
                <p className="cons-dashboard-subtitle">
                  Your shift at a glance – assigned work, clocks about to warn, AI assistance used and the notifications that reached you.
                </p>
              </div>

              {/* Info Hint Banner */}
              <div className="cons-info-banner">
                <div className="cons-info-banner-left">
                  <span className="cons-info-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                  <span>Click any figure, ageing bucket, module or timeline entry to open the tickets behind it.</span>
                </div>
                <div className="cons-info-keybadge">⌘ K</div>
              </div>

              {/* Section Header */}
              <div className="cons-section-header">
                <div className="cons-section-eyebrow">ASSIGNED WORK</div>
                <h2 className="cons-section-heading">My work, in motion</h2>
              </div>

              {/* Top 3 Stat Cards */}
              <div className="cons-stat-grid">
                {/* Card 1: Assigned to Me */}
                <div
                  className="cons-stat-card cons-card-emerald"
                  onClick={() => handleNavClick("tickets")}
                  role="button"
                  tabIndex={0}
                >
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
                    <span className="cons-stat-label">ASSIGNED TO ME</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? (
                        <Skeleton width={40} height={24} />
                      ) : (
                        consultantAssignedTickets.length
                      )}
                    </span>
                    <span className="cons-pill-badge cons-pill-emerald">
                      Active Queue <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>WIP limit 6 · opens my ticket details</span>
                  </div>
                </div>

                {/* Card 2: AI Actions Used */}
                <div
                  className="cons-stat-card cons-card-teal"
                  onClick={() => handleNavClick("neoai")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-teal">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">AI ACTIONS USED</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : 0}
                    </span>
                    <span className="cons-pill-badge cons-pill-teal">
                      AI Powered <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>summary, triage, similar, draft</span>
                  </div>
                </div>

                {/* Card 3: Acceptance Rate */}
                <div
                  className="cons-stat-card cons-card-amber"
                  onClick={() => handleNavClick("workflow")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cons-stat-watermark">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="cons-stat-header">
                    <div className="cons-icon-bubble cons-bubble-amber">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <span className="cons-stat-label">ACCEPTANCE RATE</span>
                  </div>
                  <div className="cons-stat-body">
                    <span className="cons-stat-big-num">
                      {loadingTickets ? <Skeleton width={40} height={24} /> : "78%"}
                    </span>
                    <span className="cons-pill-badge cons-pill-amber">
                      Above SLA <span className="cons-pill-chevron">›</span>
                    </span>
                  </div>
                  <div className="cons-stat-footer">
                    <span>your feedback last 30 days</span>
                  </div>
                </div>
              </div>

              {/* Bottom 3 Panels Grid */}
              <div className="cons-panel-grid">
                {/* Panel 1: Ageing */}
                <div className="cons-panel-card">
                  <div className="cons-panel-header">
                    <h3 className="cons-panel-title">Ageing</h3>
                    <span className="cons-panel-badge-neutral">
                      {loadingTickets ? <Skeleton width={40} height={16} /> : `${consultantAssignedTickets.length} open`}
                    </span>
                  </div>

                  <div className="cons-ageing-list">
                    <div className="cons-ageing-row">
                      <div className="cons-ageing-top">
                        <span className="cons-ageing-name">Under 4 hours</span>
                        <span className="cons-ageing-count">0</span>
                      </div>
                      <div className="cons-ageing-track">
                        <div className="cons-ageing-fill" style={{ width: "0%" }} />
                      </div>
                    </div>

                    <div className="cons-ageing-row">
                      <div className="cons-ageing-top">
                        <span className="cons-ageing-name">4 to 24 hours</span>
                        <span className="cons-ageing-count">
                          {loadingTickets ? <Skeleton width={16} height={14} /> : consultantAssignedTickets.length}
                        </span>
                      </div>
                      <div className="cons-ageing-track">
                        <div className="cons-ageing-fill cons-fill-amber" style={{ width: "100%" }} />
                      </div>
                    </div>

                    <div className="cons-ageing-row">
                      <div className="cons-ageing-top">
                        <span className="cons-ageing-name">1 to 3 days</span>
                        <span className="cons-ageing-count">0</span>
                      </div>
                      <div className="cons-ageing-track">
                        <div className="cons-ageing-fill" style={{ width: "0%" }} />
                      </div>
                    </div>

                    <div className="cons-ageing-row">
                      <div className="cons-ageing-top">
                        <span className="cons-ageing-name">Over 3 days</span>
                        <span className="cons-ageing-count">0</span>
                      </div>
                      <div className="cons-ageing-track">
                        <div className="cons-ageing-fill" style={{ width: "0%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="cons-ageing-footer">
                    <span className="cons-ageing-wip">WIP limit 6</span>
                    <span className="cons-ageing-status">
                      <span className="cons-dot-green">●</span> within target
                    </span>
                  </div>
                </div>

                {/* Panel 2: Opened and closed, last 7 days */}
                <div className="cons-panel-card">
                  <div className="cons-panel-header">
                    <h3 className="cons-panel-title">Opened and closed, last 7 days</h3>
                    <span className="cons-panel-badge-live">
                      <span className="cons-pulse-dot" /> live
                    </span>
                  </div>

                  <div className="cons-chart-container">
                    <div className="cons-bar-chart">
                      {/* Mon */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "45%" }} title="Opened: 3" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "55%" }} title="Closed: 4" />
                        </div>
                        <span className="cons-chart-label">Mon</span>
                      </div>

                      {/* Tue */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "75%" }} title="Opened: 5" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "45%" }} title="Closed: 3" />
                        </div>
                        <span className="cons-chart-label">Tue</span>
                      </div>

                      {/* Wed */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "60%" }} title="Opened: 4" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "80%" }} title="Closed: 6" />
                        </div>
                        <span className="cons-chart-label">Wed</span>
                      </div>

                      {/* Thu */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "60%" }} title="Opened: 4" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "25%" }} title="Closed: 2" />
                        </div>
                        <span className="cons-chart-label">Thu</span>
                      </div>

                      {/* Fri */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "75%" }} title="Opened: 5" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "90%" }} title="Closed: 7" />
                        </div>
                        <span className="cons-chart-label">Fri</span>
                      </div>

                      {/* Sat */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "20%" }} title="Opened: 1" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "0%" }} title="Closed: 0" />
                        </div>
                        <span className="cons-chart-label">Sat</span>
                      </div>

                      {/* Sun */}
                      <div className="cons-chart-col">
                        <div className="cons-bar-pair">
                          <div className="cons-bar cons-bar-opened" style={{ height: "0%" }} title="Opened: 0" />
                          <div className="cons-bar cons-bar-closed" style={{ height: "20%" }} title="Closed: 1" />
                        </div>
                        <span className="cons-chart-label">Sun</span>
                      </div>
                    </div>

                    <div className="cons-chart-legend">
                      <div className="cons-legend-item">
                        <span className="cons-legend-swatch cons-swatch-opened" />
                        <span>Opened</span>
                      </div>
                      <div className="cons-legend-item">
                        <span className="cons-legend-swatch cons-swatch-closed" />
                        <span>Closed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Recent activity */}
                <div className="cons-panel-card">
                  <div className="cons-panel-header">
                    <h3 className="cons-panel-title">Recent activity</h3>
                    <span className="cons-panel-badge-live">
                      <span className="cons-pulse-dot" /> live
                    </span>
                  </div>

                  <div className="cons-activity-list">
                    <div
                      className="cons-activity-item"
                      onClick={() => handleNavClick("tickets")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cons-activity-left">
                        <div className="cons-activity-meta">
                          <span className="cons-activity-time">4m ago</span>
                          <span className="cons-activity-dot cons-dot-green">●</span>
                          <span className="cons-activity-status cons-status-green">In Progress</span>
                        </div>
                        <div className="cons-activity-title">
                          {loadingTickets ? (
                            <Skeleton width={140} height={16} />
                          ) : (
                            `${consultantAssignedTickets[0]?.ticketNo || "TKT-1082"} · Status updated`
                          )}
                        </div>
                        <div className="cons-activity-sub">Assigned to you by Lead</div>
                      </div>
                      <div className="cons-activity-chevron">›</div>
                    </div>

                    <div
                      className="cons-activity-item"
                      onClick={() => handleNavClick("workflow")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cons-activity-left">
                        <div className="cons-activity-meta">
                          <span className="cons-activity-time">1h ago</span>
                          <span className="cons-activity-dot cons-dot-amber">●</span>
                          <span className="cons-activity-status cons-status-amber">Pending BUD</span>
                        </div>
                        <div className="cons-activity-title">
                          {loadingTickets ? (
                            <Skeleton width={140} height={16} />
                          ) : (
                            `${consultantAssignedTickets[1]?.ticketNo || "TKT-1079"} · Customer approval`
                          )}
                        </div>
                        <div className="cons-activity-sub">Estimated 16h submitted</div>
                      </div>
                      <div className="cons-activity-chevron">›</div>
                    </div>

                    <div
                      className="cons-activity-item"
                      onClick={() => handleNavClick("workflow")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cons-activity-left">
                        <div className="cons-activity-meta">
                          <span className="cons-activity-time">3h ago</span>
                          <span className="cons-activity-dot cons-dot-green">●</span>
                          <span className="cons-activity-status cons-status-green">Completed</span>
                        </div>
                        <div className="cons-activity-title">
                          {loadingTickets ? (
                            <Skeleton width={140} height={16} />
                          ) : (
                            `${consultantAssignedTickets[2]?.ticketNo || "TKT-1075"} · Delivery step 10 done`
                          )}
                        </div>
                        <div className="cons-activity-sub">Ticket closed successfully</div>
                      </div>
                      <div className="cons-activity-chevron">›</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeNav === "tickets" ? (
            <TicketDetailsPage
              filteredTickets={filteredTickets}
              visibleTickets={visibleTickets}
              visibleCount={visibleCount}
              setVisibleCount={setVisibleCount}
              selectedTicketIdx={selectedTicketIdx}
              selectedTicket={selectedTicket}
              handleSelectTicket={handleSelectTicket}
              loadingTickets={loadingTickets}
              formatPriorityCode={formatPriorityCode}
              getPriorityClass={getPriorityClass}
              aiPanelOn={aiPanelOn}
              setAiPanelOn={setAiPanelOn}
              employees={employees}
              uniqueStatuses={uniqueStatuses}
              uniquePriorities={uniquePriorities}
              assignTo={assignTo}
              setAssignTo={setAssignTo}
              assignStatus={assignStatus}
              setAssignStatus={setAssignStatus}
              assignPriority={assignPriority}
              setAssignPriority={setAssignPriority}
              workNote={workNote}
              setWorkNote={setWorkNote}
              showReviewBox={showReviewBox}
              setShowReviewBox={setShowReviewBox}
              handleReviewChangeClick={handleReviewChangeClick}
              handleConfirmAndWrite={handleConfirmAndWrite}
              isSubmitting={isSubmitting}
              alertOpen={alertOpen}
              alertType={alertType}
              alertMessage={alertMessage}
              handleAlertClose={handleAlertClose}
              pendingCount={pendingCount}
              selectedPriorityCode={selectedPriorityCode}
              toPriorityPayloadString={toPriorityPayloadString}
              searchText={searchText}
              showAssignUpdateCard={false}
            />
          ) : activeNav === "workflow" ? (
            <DeliveryWorkflow
              filteredTickets={consultantAssignedTickets}
              workflowTickets={workflowTickets}
              workflowVisibleCount={workflowVisibleCount}
              setWorkflowVisibleCount={setWorkflowVisibleCount}
              workflowTicketIdx={workflowTicketIdx}
              setWorkflowTicketIdx={setWorkflowTicketIdx}
              selectedWorkflowTicket={selectedWorkflowTicket}
              employees={employees}
              statuses={statuses}
              getFormattedCreatedDate={getFormattedCreatedDate}
              getComputedEndDate={getComputedEndDate}
              loadingTickets={loadingTickets}
              formatPriorityCode={formatPriorityCode}
              getPriorityClass={getPriorityClass}
            />
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : activeNav === "ai-config" ? (
            <AIConfiguration />
          ) : (
            <Notification
              currentNav={{
                id: activeNav,
                label:
                  activeNav === "notifications"
                    ? "Notifications"
                    : activeNav.charAt(0).toUpperCase() + activeNav.slice(1).replace("-", " "),
              }}
            />
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Consultant Workspace" userEmail={emailParam} />
    </div>
  );
};

export default ConsultantPage;
