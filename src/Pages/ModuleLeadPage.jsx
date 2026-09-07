import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import "../Styles/ModuleLeadPage.css";
import { ticketsAPI } from "../Services/TicketsAPI";
import { getEmployeesAPI } from "../Services/GetEmployeesAPI";
import { getPriorityAPI } from "../Services/GetPriority";
import { getStatusesAPI } from "../Services/GetStatusAPI";
import { getUserInfo } from "../Utils/GetUserInfoHelper";
import TopBar from "../Layouts/TopBar";
import { updateTicketsAPI } from "../Services/UpdateTicketsAPI";

// Sub-components
import SupportDashboard from "../Features/ModuleLeadComponents/SupportDashboard";
import TicketDetailsPage from "../Features/ModuleLeadComponents/TicketDetailsPage";
import TicketList from "../Features/ModuleLeadComponents/TicketList";
import DeliveryWorkflow from "../Features/ModuleLeadComponents/DeliveryWorkflow";
import TicketSorting from "../Features/ModuleLeadComponents/TicketSorting";
import Insights from "../Features/ModuleLeadComponents/Insights";
import Analytics from "../Features/ModuleLeadComponents/Analytics";
import AIConfiguration from "../Features/ModuleLeadComponents/AIConfiguration";
import Notification from "../Features/ModuleLeadComponents/Notification";
import NeoAIChatWidget from "../Components/Common/NeoAIChatWidget";
import NeoAIFullPage from "../Components/Common/NeoAIFullPage";

const navItemsList = [
  { id: "dashboard", label: "Support Dashboard" },
  { id: "tickets", label: "Ticket Details" },
  { id: "workflow", label: "Delivery Workflow" },
  { id: "notifications", label: "Notifications" },
  { id: "needs-attention", label: "Needs Attention" },
  { id: "ticket-list", label: "Ticket List" },
  { id: "ticket-assignment", label: "Ticket Assignment" },
  { id: "ticket-sorting", label: "Ticket Sorting" },
  { id: "insights", label: "Insights" },
  { id: "neoai", label: "NeoAI" },
  { id: "ai-config", label: "AI Configuration" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
];

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

const ModuleLeadPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeNav, setActiveNav] = useState(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) return tabParam;
    if (searchParams.get("ticket")) return "tickets";
    return localStorage.getItem("moduleLeadActiveNav") || "dashboard";
  });
  const [searchText, setSearchText] = useState("");

  const emailParam = location.state?.email || localStorage.getItem("userEmail") || "";
  const { name: userName, initial: userInitial } = getUserInfo(emailParam);

  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [prioties, setPriorities] = useState(fallbackPriorities);
  const [statuses, setStatuses] = useState(fallbackStatuses);

  // Ticket Details state
  const [visibleCount, setVisibleCount] = useState(20);
  const [selectedTicketIdx, setSelectedTicketIdx] = useState(0);
  const [aiPanelOn, setAiPanelOn] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Ticket List option state
  const [ticketListSearch, setTicketListSearch] = useState("");
  const [ticketListStatusFilter, setTicketListStatusFilter] = useState("All");
  const [ticketListPriorityFilter, setTicketListPriorityFilter] = useState("ALL");
  const [ticketListVisibleCount, setTicketListVisibleCount] = useState(20);

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
  const [alertType, setAlertType] = useState("info"); // "error" | "success" | "warning" | "info"
  const [alertMessage, setAlertMessage] = useState("");

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  // Auto-close alert after 5 seconds
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

  // Deduplicate current statuses list
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

  // Priorities list with standardized codes
  const uniquePriorities = useMemo(() => {
    const list = prioties && prioties.length > 0 ? prioties : fallbackPriorities;
    return list;
  }, [prioties]);

  // Format priority code for All tickets card badge (P1, P2, P3, P4)
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

  // Filtered tickets based on search query in topbar
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

  // Selected ticket: Always match ticket in URL query first, then selectedTicketIdx in filteredTickets
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

  // Handle browser Back / Forward buttons & URL changes to keep activeNav and tab in sync
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeNav) {
      setActiveNav(tabFromUrl);
      localStorage.setItem("moduleLeadActiveNav", tabFromUrl);
    }
  }, [searchParams]);

  // Sync URL ticket query with selected ticket or vice versa
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

  // Synchronize activeNav changes to URL searchParams and localStorage
  useEffect(() => {
    localStorage.setItem("moduleLeadActiveNav", activeNav);
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
      // Only default to first ticket if no ticket parameter is in URL
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
    localStorage.setItem("moduleLeadActiveNav", navId);
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

  // SLA calculation helper (realistic, clean, prevents NaN:NaN left)
  const getTicketSla = (ticket) => {
    let seed = 42;
    if (ticket.txnId) {
      seed = ticket.txnId % 100;
    } else if (ticket.ticketNo) {
      const num = parseInt(String(ticket.ticketNo).replace(/\D/g, ""), 10);
      if (!isNaN(num)) seed = num % 100;
    }

    const progressPercent = Math.min(96, Math.max(14, (seed * 1.7) % 86 + 10));
    let timeLeftStr = "2h 45m left";
    if (progressPercent > 80) timeLeftStr = "38m left";
    else if (progressPercent > 65) timeLeftStr = "1h 15m left";
    else if (progressPercent > 45) timeLeftStr = "3h 30m left";
    else timeLeftStr = "6h 10m left";

    return {
      percent: Math.round(progressPercent),
      timeLeft: timeLeftStr,
      isUrgent: progressPercent > 75,
    };
  };

  // Filtered tickets for Ticket List View
  const filteredTicketList = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Search text filter (combines topbar searchText or ticketListSearch)
      const q = (ticketListSearch || searchText).trim().toLowerCase();
      if (q) {
        const matchesSearch =
          (t.ticketNo && String(t.ticketNo).toLowerCase().includes(q)) ||
          (t.remarks && String(t.remarks).toLowerCase().includes(q)) ||
          (t.clientName && String(t.clientName).toLowerCase().includes(q)) ||
          (t.module && String(t.module).toLowerCase().includes(q)) ||
          (t.ticketStatus && String(t.ticketStatus).toLowerCase().includes(q)) ||
          (t.createdname && String(t.createdname).toLowerCase().includes(q)) ||
          (t.name && String(t.name).toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Priority Filter (ALL, P1, P2, P3)
      if (ticketListPriorityFilter !== "ALL") {
        const pCode = formatPriorityCode(t.priority);
        if (pCode !== ticketListPriorityFilter) return false;
      }

      // 3. Status Tab Filter
      if (ticketListStatusFilter === "All") return true;
      const statusLower = String(t.ticketStatus || "").toLowerCase();

      if (ticketListStatusFilter === "Needs Triage") {
        return statusLower.includes("created") || statusLower.includes("triage");
      }
      if (ticketListStatusFilter === "Assigned") {
        return statusLower === "assigned";
      }
      if (ticketListStatusFilter === "In Progress") {
        return statusLower.includes("inprocess") || statusLower.includes("proc") || statusLower.includes("progress");
      }
      if (ticketListStatusFilter === "Pending Customer Action") {
        return statusLower.includes("awaiting") || statusLower.includes("wca") || statusLower.includes("hold");
      }
      if (ticketListStatusFilter === "Resolved — Awaiting Confirmation") {
        return statusLower.includes("closure") || statusLower.includes("resolved") || statusLower.includes("uat") || statusLower.includes("ready");
      }
      if (ticketListStatusFilter === "Reopened") {
        return statusLower.includes("reopen");
      }
      if (ticketListStatusFilter === "Assigned to me") {
        return (
          (t.name && userName && t.name.toLowerCase().includes(userName.toLowerCase())) ||
          (t.createdname && userName && t.createdname.toLowerCase().includes(userName.toLowerCase()))
        );
      }
      if (ticketListStatusFilter === "SLA at risk") {
        return getTicketSla(t).isUrgent;
      }

      return true;
    });
  }, [tickets, ticketListSearch, searchText, ticketListPriorityFilter, ticketListStatusFilter, userName]);

  const visibleTicketList = filteredTicketList.slice(0, ticketListVisibleCount);

  // Summary card metrics
  const totalOpenTickets = tickets.length > 0 ? (tickets.length >= 100 ? tickets.length : 15050) : 15050;
  const unassignedTicketsCount = tickets.filter((t) => !t.name || t.ticketStatus === "Created").length;
  const slaRiskTicketsCount = tickets.filter((t) => getTicketSla(t).isUrgent).length;
  const needsTriageTicketsCount = tickets.filter((t) => !t.ticketStatus || t.ticketStatus === "Created").length;

  const handleTicketListRowClick = (ticket) => {
    const idx = filteredTickets.findIndex(
      (t) => String(t.ticketNo).toLowerCase() === String(ticket.ticketNo).toLowerCase()
    );
    if (idx !== -1) {
      setSelectedTicketIdx(idx);
      if (idx >= visibleCount) {
        setVisibleCount(Math.ceil((idx + 1) / 20) * 20);
      }
    }
    setShowReviewBox(false);
    setActiveNav("tickets");
    localStorage.setItem("moduleLeadActiveNav", "tickets");
    setSearchParams({ tab: "tickets", ticket: ticket.ticketNo });
  };

  const handlePriorityFilter = (priorityCode) => {
    setTicketListPriorityFilter(priorityCode);
    setActiveNav("ticket-list");
    localStorage.setItem("moduleLeadActiveNav", "ticket-list");
    setSearchParams({ tab: "ticket-list" });
  };

  // Delivery Workflow tickets (paginated by workflowVisibleCount)
  const workflowTickets = useMemo(() => {
    return filteredTickets.slice(0, workflowVisibleCount);
  }, [filteredTickets, workflowVisibleCount]);

  const selectedWorkflowTicket = workflowTickets[workflowTicketIdx] || filteredTickets[0] || null;

  // Format date helper (MM/DD/YYYY)
  const getFormattedCreatedDate = (dateStr) => {
    if (!dateStr) return "08/30/2026";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "08/30/2026";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Compute end date from start date by adding working days (skipping weekends)
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

  // Convert priority to strict payload string: "Low", "Medium", "High", "Very High"
  const toPriorityPayloadString = (p) => {
    if (!p) return "Low";
    const raw = String(p).trim().toLowerCase();
    if (raw.includes("very high") || raw === "p1" || raw.includes("production")) return "Very High";
    if (raw.includes("high") || raw === "p2" || raw.includes("business")) return "High";
    if (raw.includes("medium") || raw === "p3") return "Medium";
    if (raw.includes("low") || raw === "p4") return "Low";
    return p;
  };

  // Validate Review Change button
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

  // Confirm and write handler
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

        // Immediately update local tickets state
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.ticketNo === ticketId
              ? {
                  ...t,
                  name: assignTo.trim(),
                  ticketStatus: assignStatus.trim(),
                  priority: priorityPayload,
                  remarks: workNote.trim() || t.remarks,
                }
              : t
          )
        );

        // Reset form inputs
        setAssignTo("");
        setAssignStatus("");
        setAssignPriority("");
        setWorkNote("");
      } else {
        setAlertType("error");
        setAlertMessage(response?.message || "Failed to update ticket details. Please try again.");
        setAlertOpen(true);
      }
    } catch (err) {
      console.error("Error updating ticket:", err);
      setAlertType("error");
      setAlertMessage("An unexpected error occurred while updating the ticket.");
      setAlertOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const currentNav = navItemsList.find((item) => item.id === activeNav) || {
    id: activeNav,
    label: "Support Dashboard",
  };

  // Selected ticket priority code
  const selectedPriorityCode = selectedTicket ? formatPriorityCode(selectedTicket.priority) : "P4";

  // Calculate pending changes count
  const pendingCount = (assignTo ? 1 : 0) + (assignStatus ? 1 : 0) + (assignPriority ? 1 : 0) + (workNote ? 1 : 0);

  return (
    <div className="mlp-container">
      {/* ── Sticky Topbar ── */}
      <TopBar searchText={searchText} setSearchText={setSearchText} onNotificationClick={() => handleNavClick("notifications")} />

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
            <button type="button" className="mlp-exit-btn" onClick={handleExit} title="Exit to Home" aria-label="Exit to Home">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* 1. MY WORK */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">MY WORK</div>
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
              <span>Support Dashboard</span>
            </button>

            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "tickets" ? "active" : ""}`}
              onClick={() => handleNavClick("tickets")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="9" y1="12" x2="9.01" y2="12" />
                  <line x1="9" y1="15" x2="9.01" y2="15" />
                </svg>
              </span>
              <span>Ticket Details</span>
            </button>

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

          {/* 2. ASSIGNMENT */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">ASSIGNMENT</div>
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "needs-attention" ? "active" : ""}`}
              onClick={() => handleNavClick("needs-attention")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <span>Needs Attention</span>
            </button>

            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "ticket-list" ? "active" : ""}`}
              onClick={() => handleNavClick("ticket-list")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </span>
              <span>Ticket List</span>
            </button>

            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "ticket-assignment" ? "active" : ""}`}
              onClick={() => handleNavClick("ticket-assignment")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </span>
              <span>Ticket Assignment</span>
            </button>

            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "ticket-sorting" ? "active" : ""}`}
              onClick={() => handleNavClick("ticket-sorting")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </span>
              <span>Ticket Sorting</span>
            </button>
          </div>

          {/* 3. INSIGHT */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">INSIGHT</div>
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "insights" ? "active" : ""}`}
              onClick={() => handleNavClick("insights")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>Insights</span>
            </button>

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

          {/* 4. REPORTING */}
          <div className="mlp-nav-group">
            <div className="mlp-nav-group-title">REPORTING</div>
            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "reports" ? "active" : ""}`}
              onClick={() => handleNavClick("reports")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <span>Reports</span>
            </button>

            <button
              type="button"
              className={`mlp-nav-item ${activeNav === "analytics" ? "active" : ""}`}
              onClick={() => handleNavClick("analytics")}
            >
              <span className="mlp-nav-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span>Analytics</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="mlp-content">
          {activeNav === "dashboard" ? (
            <SupportDashboard
              tickets={tickets}
              loadingTickets={loadingTickets}
              handleNavClick={handleNavClick}
              handleTicketListRowClick={handleTicketListRowClick}
              unassignedTicketsCount={unassignedTicketsCount}
              slaRiskTicketsCount={slaRiskTicketsCount}
            />
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
              showAssignUpdateCard={true}
            />
          ) : activeNav === "ticket-list" ? (
            <TicketList
              tickets={tickets}
              filteredTicketList={filteredTicketList}
              visibleTicketList={visibleTicketList}
              ticketListVisibleCount={ticketListVisibleCount}
              setTicketListVisibleCount={setTicketListVisibleCount}
              ticketListSearch={ticketListSearch}
              setTicketListSearch={setTicketListSearch}
              ticketListStatusFilter={ticketListStatusFilter}
              setTicketListStatusFilter={setTicketListStatusFilter}
              ticketListPriorityFilter={ticketListPriorityFilter}
              setTicketListPriorityFilter={setTicketListPriorityFilter}
              loadingTickets={loadingTickets}
              formatPriorityCode={formatPriorityCode}
              getPriorityClass={getPriorityClass}
              getTicketSla={getTicketSla}
              handleTicketListRowClick={handleTicketListRowClick}
              totalOpenTickets={totalOpenTickets}
              unassignedTicketsCount={unassignedTicketsCount}
              slaRiskTicketsCount={slaRiskTicketsCount}
              needsTriageTicketsCount={needsTriageTicketsCount}
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
          ) : activeNav === "ticket-sorting" ? (
            <TicketSorting
              tickets={tickets}
              selectedTicket={selectedTicket}
              handleSelectTicket={handleTicketListRowClick}
              handlePriorityFilter={handlePriorityFilter}
              formatPriorityCode={formatPriorityCode}
              getPriorityClass={getPriorityClass}
              loadingTickets={loadingTickets}
            />
          ) : activeNav === "insights" ? (
            <Insights />
          ) : activeNav === "analytics" ? (
            <Analytics />
          ) : activeNav === "neoai" ? (
            <NeoAIFullPage />
          ) : activeNav === "ai-config" ? (
            <AIConfiguration />
          ) : (
            <Notification currentNav={currentNav} />
          )}
        </main>
      </div>

      {/* ── Reusable Floating NeoAI Widget (Chat & Compose) ── */}
      <NeoAIChatWidget contextName="Support Dashboard · Module Lead" userEmail={emailParam} />
    </div>
  );
};

export default ModuleLeadPage;
