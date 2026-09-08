import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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

  const workflowTickets = useMemo(() => {
    return filteredTickets.slice(0, workflowVisibleCount);
  }, [filteredTickets, workflowVisibleCount]);

  const selectedWorkflowTicket = workflowTickets[workflowTicketIdx] || filteredTickets[0] || null;

  const getFormattedCreatedDate = (dateStr) => {
    if (!dateStr) return "08/30/2026";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "08/30/2026";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const getComputedEndDate = (startDateStr, workingDaysCount) => {
    let d = new Date(startDateStr);
    if (isNaN(d.getTime())) d = new Date();
    let days = parseInt(workingDaysCount, 10) || 1;
    let current = new Date(d);
    while (days > 1) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days--;
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
    if (raw.includes("very high") || raw === "p1" || raw.includes("production")) return "Very High";
    if (raw.includes("high") || raw === "p2" || raw.includes("business")) return "High";
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
          {/* Top Identity Block */}
          <div className="mlp-identity-row">
            <div className="mlp-identity-user">
              <div className="mlp-sidebar-avatar">{userInitial}</div>
              <span className="mlp-sidebar-name">{userName}</span>
            </div>
            <button
              type="button"
              className="mlp-exit-btn"
              onClick={handleExit}
              title="Exit to Home"
              aria-label="Exit to Home"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">MY WORK</div>
            {/* dashboard */}
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "dashboard" ? "active" : ""}`}
              onClick={() => handleNavClick("dashboard")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              <span>My Dashboard</span>
            </button>

            {/* Tickets */}
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "tickets" ? "active" : ""}`}
              onClick={() => handleNavClick("tickets")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>Notifications</span>
            </button>
          </div>

          {/* Help, AI Configuration */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">HELP ME</div>
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "ai-config" ? "active" : ""}`}
              onClick={() => handleNavClick("ai-config")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span>AI Configuration</span>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
            <>
              <h1 className="mlp-page-title">My Dashboard</h1>
              <p className="mlp-page-subtitle">
                Your shift at a glance – assigned work, clocks about to warn, AI assistance used and the notifications that reached you.
              </p>
              <div className="mlp-page-hint">
                Click any figure, ageing bucket, module or timeline entry to open the tickets behind it.
              </div>

              {/* Top 3 Stat Cards */}
              <div className="mlp-stat-grid">
                <div className="mlp-stat-card blue">
                  <div className="mlp-stat-label">ASSIGNED TO ME</div>
                  <div className="mlp-stat-value">2</div>
                  <div className="mlp-stat-note">WIP limit 6 · opens my ticket details</div>
                </div>

                <div className="mlp-stat-card green">
                  <div className="mlp-stat-label">AI ACTIONS USED</div>
                  <div className="mlp-stat-value">0</div>
                  <div className="mlp-stat-note">summary, triage, similar, draft</div>
                </div>

                <div className="mlp-stat-card gold">
                  <div className="mlp-stat-label">ACCEPTANCE RATE</div>
                  <div className="mlp-stat-value">78%</div>
                  <div className="mlp-stat-note">your feedback last 30 days</div>
                </div>
              </div>

              {/* Bottom 3 Panels */}
              <div className="mlp-panel-grid">
                {/* Panel 1: Ageing */}
                <div className="mlp-panel">
                  <div className="mlp-panel-header">
                    <h3 className="mlp-panel-title">Ageing</h3>
                    <span className="mlp-panel-meta">2 open</span>
                  </div>

                  <div className="mlp-ageing-row">
                    <div className="mlp-ageing-labels">
                      <span>Under 4 hours</span>
                      <span>0</span>
                    </div>
                    <div className="mlp-progress-track">
                      <div className="mlp-progress-fill" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div className="mlp-ageing-row">
                    <div className="mlp-ageing-labels">
                      <span>4 to 24 hours</span>
                      <span>2</span>
                    </div>
                    <div className="mlp-progress-track">
                      <div className="mlp-progress-fill" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="mlp-ageing-row">
                    <div className="mlp-ageing-labels">
                      <span>1 to 3 days</span>
                      <span>0</span>
                    </div>
                    <div className="mlp-progress-track">
                      <div className="mlp-progress-fill" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div className="mlp-ageing-row">
                    <div className="mlp-ageing-labels">
                      <span>Over 3 days</span>
                      <span>0</span>
                    </div>
                    <div className="mlp-progress-track">
                      <div className="mlp-progress-fill" style={{ width: "0%" }} />
                    </div>
                  </div>
                </div>

                {/* Panel 2: My performance */}
                <div className="mlp-panel">
                  <div className="mlp-panel-header">
                    <h3 className="mlp-panel-title">My performance</h3>
                  </div>
                  <div className="mlp-panel-sub">Your own tickets only, for the current period.</div>

                  <div className="mlp-perf-row">
                    <div className="mlp-perf-top">
                      <span className="mlp-perf-label">First reply</span>
                      <span className="mlp-perf-val">22 min</span>
                    </div>
                    <div className="mlp-perf-track">
                      <div className="mlp-perf-fill" style={{ width: "36%" }} />
                    </div>
                    <div className="mlp-perf-target">target 60 min</div>
                  </div>

                  <div className="mlp-perf-row">
                    <div className="mlp-perf-top">
                      <span className="mlp-perf-label">Time to fix</span>
                      <span className="mlp-perf-val">6.1 h</span>
                    </div>
                    <div className="mlp-perf-track">
                      <div className="mlp-perf-fill" style={{ width: "76%" }} />
                    </div>
                    <div className="mlp-perf-target">target 8 h</div>
                  </div>

                  <div className="mlp-perf-row" style={{ marginBottom: 0 }}>
                    <div className="mlp-perf-top">
                      <span className="mlp-perf-label">Reopened</span>
                      <span className="mlp-perf-val">1 of 24</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Opened and closed, last 7 days */}
                <div className="mlp-panel">
                  <div className="mlp-panel-header">
                    <h3 className="mlp-panel-title">Opened and closed, last 7 days</h3>
                  </div>

                  <div className="mlp-trend-chart">
                    {/* Mon */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "45%" }} />
                        <div className="mlp-bar-closed" style={{ height: "55%" }} />
                      </div>
                      <span className="mlp-day-label">Mon</span>
                    </div>

                    {/* Tue */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "75%" }} />
                        <div className="mlp-bar-closed" style={{ height: "45%" }} />
                      </div>
                      <span className="mlp-day-label">Tue</span>
                    </div>

                    {/* Wed */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "60%" }} />
                        <div className="mlp-bar-closed" style={{ height: "80%" }} />
                      </div>
                      <span className="mlp-day-label">Wed</span>
                    </div>

                    {/* Thu */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "60%" }} />
                        <div className="mlp-bar-closed" style={{ height: "25%" }} />
                      </div>
                      <span className="mlp-day-label">Thu</span>
                    </div>

                    {/* Fri */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "75%" }} />
                        <div className="mlp-bar-closed" style={{ height: "90%" }} />
                      </div>
                      <span className="mlp-day-label">Fri</span>
                    </div>

                    {/* Sat */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "20%" }} />
                        <div className="mlp-bar-closed" style={{ height: "0%" }} />
                      </div>
                      <span className="mlp-day-label">Sat</span>
                    </div>

                    {/* Sun */}
                    <div className="mlp-trend-col">
                      <div className="mlp-trend-bars">
                        <div className="mlp-bar-opened" style={{ height: "0%" }} />
                        <div className="mlp-bar-closed" style={{ height: "20%" }} />
                      </div>
                      <span className="mlp-day-label">Sun</span>
                    </div>
                  </div>

                  <div className="mlp-trend-legend">
                    <div className="mlp-legend-item">
                      <span className="mlp-legend-sq opened" />
                      <span>Opened</span>
                    </div>
                    <div className="mlp-legend-item">
                      <span className="mlp-legend-sq closed" />
                      <span>Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
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
              filteredTickets={filteredTickets}
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
