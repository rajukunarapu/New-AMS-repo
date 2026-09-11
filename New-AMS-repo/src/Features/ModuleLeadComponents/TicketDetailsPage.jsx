import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Skeleton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import { GetScreenshotAPI } from "../../Services/GetScreenshotAPI";

const TicketDetailsPage = ({
  filteredTickets,
  visibleTickets,
  visibleCount,
  setVisibleCount,
  selectedTicketIdx,
  selectedTicket,
  handleSelectTicket,
  loadingTickets,
  formatPriorityCode,
  getPriorityClass,
  aiPanelOn,
  setAiPanelOn,
  employees,
  uniqueStatuses,
  uniquePriorities,
  assignTo,
  setAssignTo,
  assignStatus,
  setAssignStatus,
  assignPriority,
  setAssignPriority,
  workNote,
  setWorkNote,
  showReviewBox,
  setShowReviewBox,
  handleReviewChangeClick,
  handleConfirmAndWrite,
  isSubmitting,
  alertOpen,
  alertType,
  alertMessage,
  handleAlertClose,
  pendingCount,
  selectedPriorityCode,
  toPriorityPayloadString,
  searchText,
  showAssignUpdateCard = true,
}) => {
  const [screenshotData, setScreenshotData] = useState(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const fetchScreenshot = useCallback(async (ticketId) => {
    if (!ticketId) {
      setScreenshotData(null);
      return;
    }
    setLoadingScreenshot(true);
    try {
      const res = await GetScreenshotAPI(ticketId);
      if (res) {
        setScreenshotData(res);
      } else {
        setScreenshotData(null);
      }
    } catch (err) {
      console.error("Error fetching ticket screenshot:", err);
      setScreenshotData({
        success: false,
        screenshot: null,
        message: "No screen shot found for this ticket",
      });
    } finally {
      setLoadingScreenshot(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicket?.ticketNo) {
      fetchScreenshot(selectedTicket.ticketNo);
    } else {
      setScreenshotData(null);
    }
  }, [selectedTicket?.ticketNo, fetchScreenshot]);

  const handleCardClick = (idx, ticket) => {
    if (handleSelectTicket) {
      handleSelectTicket(idx, ticket);
    }
    if (ticket && ticket.ticketNo) {
      fetchScreenshot(ticket.ticketNo);
    }
  };

  const getScreenshotDataUrl = (data) => {
    if (!data || !data.screenshot) return "";
    const raw = String(data.screenshot).trim();
    if (raw.startsWith("data:")) return raw;
    const mime = data.contentType || "image/png";
    return `data:${mime};base64,${raw}`;
  };

  const handleDownloadScreenshot = () => {
    if (!screenshotData?.screenshot) return;
    const dataUrl = getScreenshotDataUrl(screenshotData);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download =
      screenshotData.fileName ||
      `Ticket_${selectedTicket?.ticketNo || "screenshot"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <>
      {/* ── Ticket Details Page ── */}
      <h1 className="mlp-page-title">Ticket Details</h1>
      <p className="mlp-page-subtitle">
        Four advisory actions. Every output is validated, carries a confidence score and its evidence — accept, edit or reject.
      </p>

      {/* ALL TICKETS Section */}
      <div className="mlp-tickets-header">
        <span className="mlp-tickets-section-label">All tickets</span>
        <span className="mlp-tickets-count">
          {loadingTickets
            ? "Loading tickets..."
            : `${Math.min(visibleCount, filteredTickets.length)} of ${filteredTickets.length || 0} tickets`}
        </span>
      </div>

      {/* Horizontal Ticket Cards Scroll / Skeleton Loader */}
      {loadingTickets ? (
        <div className="mlp-ticket-cards-scroll">
          {[1, 2, 3, 4, 5, 6, 7].map((sk) => (
            <div
              key={sk}
              className="mlp-ticket-card"
              style={{
                minWidth: 200,
                height: 92,
                cursor: "default",
                opacity: 0.85,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "10px 14px",
              }}
            >
              <div className="mlp-tc-row1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Skeleton variant="text" width={75} height={18} />
                <Skeleton variant="rounded" width={26} height={16} sx={{ borderRadius: "4px" }} />
              </div>
              <Skeleton variant="text" width="90%" height={22} sx={{ my: 0.5 }} />
              <Skeleton variant="text" width="55%" height={16} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mlp-ticket-cards-scroll">
          {visibleTickets.map((ticket, idx) => {
            const pCode = formatPriorityCode(ticket.priority);
            const isCardSelected = selectedTicket && String(selectedTicket.ticketNo).toLowerCase() === String(ticket.ticketNo).toLowerCase();
            return (
              <div
                key={ticket.ticketNo || idx}
                className={`mlp-ticket-card ${isCardSelected ? "selected" : ""}`}
                onClick={() => handleCardClick(idx, ticket)}
              >
                <div className="mlp-tc-row1">
                  <span className="mlp-tc-no">{ticket.ticketNo || "-"}</span>
                  <span className={`mlp-tc-priority ${getPriorityClass(ticket.priority)}`}>
                    {pCode}
                  </span>
                </div>
                <div className="mlp-tc-name">{ticket.description || "NA"}</div>
                <div className="mlp-tc-status">{ticket.ticketStatus || "-"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show More Button */}
      {!loadingTickets && visibleCount < filteredTickets.length && (
        <div className="mlp-show-more-row">
          <button
            type="button"
            className="mlp-show-more-btn"
            onClick={() => setVisibleCount((prev) => prev + 20)}
          >
            <span>Show more</span>
            <span>({filteredTickets.length - visibleCount} remaining)</span>
          </button>
        </div>
      )}

      {/* Sub-bar Pills Row */}
      {selectedTicket && (
        <div className="mlp-ticket-subbar">
          <div className="mlp-ticket-subbar-left">
            <span className="mlp-subbar-pill">{selectedPriorityCode}</span>
            <span className="mlp-subbar-pill">{selectedTicket.ticketStatus || "-"}</span>
            <span className="mlp-subbar-pill">{selectedTicket.module || "-"}</span>
            <span className="mlp-subbar-text">
              {selectedTicket.clientName || "-"}
            </span>
            <span className="mlp-subbar-delivery">
              {/* Delivery 1 of 10 · TICKET ACK */}
            </span>
          </div>

          <div className="mlp-ticket-subbar-right">
            <span>AI help panel</span>
            <div
              className={`mlp-toggle-switch ${aiPanelOn ? "on" : "off"}`}
              onClick={() => setAiPanelOn(!aiPanelOn)}
            />
            <span style={{ fontWeight: 600 }}>{aiPanelOn ? "On" : "Off"}</span>
          </div>
        </div>
      )}

      {/* Main Grid: 2-column if aiPanelOn is ON, or full-width with bottom AI cards if OFF */}
      {selectedTicket ? (
        <div className={`mlp-td-main-grid ${aiPanelOn ? "" : "full-width"}`}>
          {/* ── LEFT COLUMN (6 Cards) ── */}
          <div className="mlp-td-left-col">
            {/* Card 1: Ticket Overview */}
            <div className="mlp-td-card">
              <h2 className="mlp-td-overview-name">
                {loadingScreenshot ? (
                  <Skeleton variant="text" width="60%" height={30} />
                ) : (
                  (screenshotData?.description && screenshotData.description.trim()) ||
                  selectedTicket.description ||
                  "NA"
                )}
              </h2>
              <div className="mlp-td-divider" />

              <div className="mlp-td-overview-grid">
                <div className="mlp-td-field">
                  <span className="mlp-td-label">TICKET</span>
                  <span className="mlp-td-value">{selectedTicket.ticketNo}</span>
                </div>
                <div className="mlp-td-field">
                  <span className="mlp-td-label">CUSTOMER</span>
                  <span className="mlp-td-value">{selectedTicket.clientName || "-"}</span>
                </div>
                <div className="mlp-td-field">
                  <span className="mlp-td-label">MODULE</span>
                  <span className="mlp-td-value">{selectedTicket.module || "-"}</span>
                </div>

                <div className="mlp-td-field">
                  <span className="mlp-td-label">RAISED ON</span>
                  <span className="mlp-td-value">
                    {selectedTicket.createddate
                      ? new Date(selectedTicket.createddate).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "26 Aug 2024, 18:38"}
                  </span>
                </div>
                <div className="mlp-td-field">
                  <span className="mlp-td-label">TICKET RAISED BY</span>
                  <span className="mlp-td-value">
                    {selectedTicket.createdname || "-"}
                  </span>
                </div>
                <div className="mlp-td-field">
                  <span className="mlp-td-label">ASSIGNED CONSULTANT</span>
                  <span className="mlp-td-value">
                    {selectedTicket.name || "-"}
                  </span>
                </div>

                <div className="mlp-td-field">
                  <span className="mlp-td-label">PRIORITY</span>
                  <span className="mlp-td-value">{selectedTicket.priority || "-"}</span>
                </div>
                <div className="mlp-td-field">
                  <span className="mlp-td-label">SOURCE CHANNEL</span>
                  <span className="mlp-td-value">{selectedTicket.createdEmails || "—"}</span>
                </div>
                <div className="mlp-td-field">
                  <span className="mlp-td-label">TICKET STATUS</span>
                  <span className="mlp-td-value">{selectedTicket.ticketStatus || "-"}</span>
                </div>
              </div>

              {/* SLA & Policy Section */}
              <div className="mlp-td-sla-box">
                <div className="mlp-td-sla-row">
                  <span className="mlp-td-sla-title">SLA</span>
                  <div className="mlp-td-sla-track">
                    <div className="mlp-td-sla-fill" style={{ width: "35%" }} />
                  </div>
                  <span className="mlp-td-sla-text">Delivery 1 of 10 completed</span>
                </div>

                <p className="mlp-td-policy-text">
                  {/* Scope bound to Aabalat Fine Oil at sign-in. Audit correlation ID: aab-20240826-2608266. Runtime policy: ENFORCE_ALL. */}
                </p>
              </div>
            </div>

            {/* Card 2: Documents on this ticket */}
            <div className="mlp-td-card">
              <div className="mlp-td-card-header">
                <h3 className="mlp-td-card-title">Documents on this ticket</h3>
                <span className="mlp-td-card-meta" style={{ fontSize: 11, color: "#64748b" }}>
                  FS · Technical Design · Test Scripts — attached on acceptance
                </span>
              </div>

              <div
                style={{
                  border: "1px dashed #cbd5e1",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  margin: "6px 0 12px",
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: "1.5",
                  backgroundColor: "#fafbfc",
                }}
              >
                Only the acknowledgement email sent to the customer, below. Accepting an AI-drafted FS, Technical Design or Test Script in the delivery workflow attaches it here as a version on the ticket.
              </div>

              {loadingScreenshot ? (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "14px 16px",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <Skeleton variant="text" width="45%" height={22} />
                  <Skeleton variant="text" width="25%" height={16} />
                </div>
              ) : screenshotData?.screenshot ? (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "200px", flex: 1 }}>
                    <div
                      onClick={() => setPreviewModalOpen(true)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 4,
                        border: "1px solid #cbd5e1",
                        overflow: "hidden",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f8fafc",
                        flexShrink: 0,
                      }}
                      title="Click to view full screenshot"
                    >
                      <img
                        src={getScreenshotDataUrl(screenshotData)}
                        alt={screenshotData?.fileName || "Screenshot"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", overflow: "hidden" }}>
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color: "#1e40af",
                          cursor: "pointer",
                          wordBreak: "break-all",
                        }}
                        onClick={() => setPreviewModalOpen(true)}
                        title={screenshotData?.fileName || "Screenshot"}
                      >
                        {screenshotData?.fileName || `Ticket_${selectedTicket?.ticketNo || "-"}.png`}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {screenshotData?.contentType ? `Attachment · ${screenshotData.contentType}` : "Screenshot attachment"}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons: View and Download */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setPreviewModalOpen(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        backgroundColor: "#f8fafc",
                        color: "#1e293b",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="View screenshot preview"
                    >
                      <VisibilityOutlined style={{ fontSize: "16px", color: "#475569" }} />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadScreenshot}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        backgroundColor: "#15803d",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Download screenshot file"
                    >
                      <DownloadOutlined style={{ fontSize: "16px" }} />
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 4,
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8fafc",
                      color: "#94a3b8",
                      flexShrink: 0,
                    }}
                  >
                    <InsertDriveFileOutlined fontSize="small" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 500, color: "#64748b" }}>
                      {screenshotData?.message || "No screen shot found for this ticket"}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: "#334155",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  All documents shared
                </button>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "6px 0 0" }}>
                  Documents go out together with the customer reply and stay on the ticket as reference and history.
                </p>
              </div>
            </div>

            {/* Card 3: Reported error and evidence */}
            <div className="mlp-td-card">
              <div className="mlp-td-card-header">
                <h3 className="mlp-td-card-title">Reported error and evidence</h3>
                <span className="mlp-td-card-meta" style={{ fontSize: 11, color: "#64748b" }}>
                  {/* received 50h ago at support@noevatic.com */}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>ERROR CODE</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#1e293b" }}>-</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>TRANSACTION</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#1e293b" }}>-</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>SYSTEM · CLIENT</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>-</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>USERS AFFECTED</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#1e293b" }}>-</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>FIRST SEEN</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#1e293b" }}>-</span>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>OCCURRENCES</span>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#1e293b" }}>-</span>
              </div>

              {/* Inbound Email Box */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f1f5f9",
                    padding: "7px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "11px",
                    color: "#475569",
                    fontWeight: 500,
                  }}
                >
                  <span>Inbound email · THR-81779</span>
                  {/* <span style={{ fontFamily: "monospace", color: "#64748b" }}>raw-message.eml</span> */}
                </div>
                <div style={{ padding: "12px 14px", backgroundColor: "#ffffff" }}>
                  <div
                    style={{
                      border: "1px solid #fecaca",
                      backgroundColor: "#fff1f2",
                      color: "#991b1b",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      !
                    </span>
                    <span>{selectedTicket.createdname || selectedTicket.remarks || "Yugandhar Kukka"}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "6px 14px", fontSize: "11.5px", fontFamily: "monospace, sans-serif" }}>
                    <span style={{ color: "#64748b" }}>From</span>
                    <span style={{ color: "#1e293b", fontWeight: 500 }}>customer contact</span>

                    <span style={{ color: "#64748b" }}>Module</span>
                    <span style={{ color: "#1e293b", fontWeight: 500 }}>{selectedTicket.module || "SAP SAC"}</span>

                    <span style={{ color: "#64748b" }}>Priority</span>
                    <span style={{ color: "#1e293b", fontWeight: 500 }}>{selectedPriorityCode} · triage</span>

                    <span style={{ color: "#64748b" }}>Confidence</span>
                    <span style={{ color: "#1e293b", fontWeight: 500 }}>0.84</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: "11px", color: "#64748b", margin: "8px 0 14px" }}>
                No screenshot was attached to this request. The raw message is stored immutably and is the evidence of record until the consultant captures more.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                    STEPS TO REPRODUCE
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11.5px", color: "#334155" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ color: "#0284c7", fontWeight: 600 }}>01</span>
                      <span>Reproduce the reported behaviour in the customer environment.</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ color: "#0284c7", fontWeight: 600 }}>02</span>
                      <span>Capture the message text and the system log entry as evidence.</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ color: "#0284c7", fontWeight: 600 }}>03</span>
                      <span>Confirm scope: users, transactions and business process affected.</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                    ATTACHMENTS AND IMPACT
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 500, color: "#1e293b", marginBottom: "6px" }}>
                    {/* <span style={{ fontFamily: "monospace" }}>raw-message.eml</span> */}
                    <span style={{ color: "#94a3b8" }}>—</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: 1.45 }}>
                    Impact not yet quantified — confirm it with the customer during first response, before the priority is fixed.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Conversation */}
            <div className="mlp-td-card">
              <h3 className="mlp-td-card-title">Conversation (1 message)</h3>
              <div className="mlp-td-convo-list">
                <div className="mlp-td-convo-item customer">
                  <div className="mlp-td-convo-meta">
                    {selectedTicket.createdname || "-"} · {selectedTicket.createddate} · CustomerInboundEmail
                  </div>
                  <div className="mlp-td-convo-body">
                    {selectedTicket.createdname || "-"}, Reported by the customer through the support mailbox: 0 messages on this thread.
                  </div>
                </div>

                <div className="mlp-td-convo-item agent">
                  <div className="mlp-td-convo-meta">Triage & Assignment agent TicketEmailReceived</div>
                  <div className="mlp-td-convo-body">
                    Structured fields extracted and acknowledgement sent with reference {selectedTicket.ticketNo || "-"}.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Ticket actions — deterministic */}
            {/* <div className="mlp-td-card">
              <h3 className="mlp-td-card-title" style={{ marginBottom: 10 }}>
                Ticket actions — deterministic, written through the Ticket API
              </h3>
              <div className="mlp-td-actions-row">
                <button type="button" className="mlp-td-action-btn active">Assign</button>
                <button type="button" className="mlp-td-action-btn">Change status</button>
                <button type="button" className="mlp-td-action-btn">Add work note</button>
                <button type="button" className="mlp-td-action-btn">Pause clock (customer)</button>
                <button type="button" className="mlp-td-action-btn">Downgrade priority</button>
              </div>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>
              </p>
            </div> */}
                {/* Tier 0 auto · Tier 1 one-click approval · Tier 2 human only — you hold Tier 2 authority. */}

            {/* Card 6: Assign and update */}
            {showAssignUpdateCard && (
              <div className="mlp-td-card">
                <div className="mlp-td-card-header">
                  <h3 className="mlp-td-card-title">
                    Assign and update {selectedTicket.ticketNo || "-"}
                  </h3>
                  {/* <span className="mlp-td-pill-badge">human in the loop</span> */}
                </div>
                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px" }}>
                  Nothing is written until you confirm. NeoAI can propose an owner and the next status; the decision and the record stay with you.
                </p>

                <div className="mlp-td-form-grid">
                  {/* ASSIGN TO */}
                  <div className="mlp-td-form-field">
                    <label className="mlp-td-form-label">
                      ASSIGN TO <span>*</span>
                    </label>
                    <select
                      className="mlp-td-select"
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                    >
                      <option value="">Select consultant</option>
                      {assignTo &&
                        !employees.some(
                          (emp) =>
                            (emp.name || emp.employeeName || "").trim().toLowerCase() ===
                            assignTo.trim().toLowerCase()
                        ) && <option value={assignTo}>{assignTo}</option>}
                      {employees.map((emp) => {
                        const empName = emp.name || emp.employeeName || "";
                        return (
                          <option key={emp.id || emp.employeeId || empName} value={empName}>
                            {empName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* STATUS */}
                  <div className="mlp-td-form-field">
                    <label className="mlp-td-form-label">
                      STATUS <span>*</span>
                    </label>
                    <select
                      className="mlp-td-select"
                      value={assignStatus}
                      onChange={(e) => setAssignStatus(e.target.value)}
                    >
                      <option value="">Select status</option>
                      {assignStatus &&
                        !uniqueStatuses.some(
                          (s) =>
                            (s.name || "").trim().toLowerCase() ===
                            assignStatus.trim().toLowerCase()
                        ) && <option value={assignStatus}>{assignStatus}</option>}
                      {uniqueStatuses.map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PRIORITY */}
                  <div className="mlp-td-form-field">
                    <label className="mlp-td-form-label">
                      PRIORITY <span>*</span>
                    </label>
                    <select
                      className="mlp-td-select"
                      value={assignPriority}
                      onChange={(e) => setAssignPriority(e.target.value)}
                    >
                      <option value="">Select priority</option>
                      {assignPriority &&
                        !uniquePriorities.some(
                          (p) =>
                            (p.name || "").trim().toLowerCase() ===
                            assignPriority.trim().toLowerCase()
                        ) && <option value={assignPriority}>{assignPriority}</option>}
                      {uniquePriorities.map((p) => {
                        const pCode = p.code || formatPriorityCode(p.name);
                        const pLabel = `${pCode} · ${p.name}`;
                        return (
                          <option key={p.id || p.code || p.name} value={p.name}>
                            {pLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="mlp-td-form-field">
                  <label className="mlp-td-form-label">Work note (optional)</label>
                  <textarea
                    className="mlp-td-textarea"
                    placeholder="Add work note..."
                    value={workNote}
                    onChange={(e) => setWorkNote(e.target.value)}
                  />
                </div>

                <div className="mlp-td-form-btns">
                  <button
                    type="button"
                    className="mlp-td-btn-submit"
                    onClick={handleReviewChangeClick}
                  >
                    Review change
                  </button>
                  <button type="button" className="mlp-td-btn-recommend">
                    Ask NeoAI to recommend
                  </button>
                  {/* <button type="button" className="mlp-td-link-btn">
                    See ranked candidates
                  </button> */}
                  {/* <span className="mlp-td-sub-muted">
                    {pendingCount > 0 ? `${pendingCount} pending changes` : "2 pending changes"}
                  </span> */}
                </div>

                {/* Alert Message right below Review change button */}
                {alertOpen && (
                  <div style={{ marginTop: 12, marginBottom: 12, animation: "fadeInUp 0.25s ease-out" }}>
                    <Alert
                      severity={alertType}
                      onClose={handleAlertClose}
                      sx={{
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      {alertMessage}
                    </Alert>
                  </div>
                )}

                {/* Review change confirmation box */}
                {showReviewBox && (
                  <div className="mlp-td-review-box">
                    <h4 className="mlp-td-review-title">
                      Confirm these changes to {selectedTicket.ticketNo || "AAB2608266"}
                    </h4>
                    <div className="mlp-td-review-table">
                      <div className="mlp-td-review-row">
                        <span className="mlp-td-review-label">Owner</span>
                        <span className="mlp-td-review-val">
                          {assignTo || selectedTicket.name || "Abhineet Anand"}
                        </span>
                      </div>
                      <div className="mlp-td-review-row">
                        <span className="mlp-td-review-label">Status</span>
                        <span className="mlp-td-review-val">
                          {assignStatus || selectedTicket.ticketStatus || "Inprocess"}
                        </span>
                      </div>
                      {assignPriority && (
                        <div className="mlp-td-review-row">
                          <span className="mlp-td-review-label">Priority</span>
                          <span className="mlp-td-review-val">
                            {toPriorityPayloadString(assignPriority)}
                          </span>
                        </div>
                      )}
                      {workNote && (
                        <div className="mlp-td-review-row">
                          <span className="mlp-td-review-label">Description</span>
                          <span className="mlp-td-review-val">
                            {workNote}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mlp-td-review-actions">
                      <button
                        type="button"
                        className="mlp-td-btn-submit"
                        disabled={isSubmitting}
                        onClick={handleConfirmAndWrite}
                      >
                        {isSubmitting ? "Writing changes..." : "Confirm and write"}
                      </button>
                      <button
                        type="button"
                        className="mlp-td-review-cancel"
                        disabled={isSubmitting}
                        onClick={() => setShowReviewBox(false)}
                      >
                        Cancel
                      </button>
                    </div>

                    {isSubmitting && (
                      <div style={{ width: "100%", marginTop: "10px", borderRadius: "4px", overflow: "hidden" }}>
                        <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: AI ASSIST CARDS STACK (Shown when AI Help Panel is ON) ── */}
          {aiPanelOn && (
            <div className="mlp-td-right-col">
              {/* Card 1: AI Assist */}
              <div className="mlp-ai-card">
                <div className="mlp-ai-header">
                  <h4 className="mlp-ai-title">AI Assist</h4>
                  <span className="mlp-ai-badge">advisory only</span>
                </div>
                <p className="mlp-ai-desc">
                  Recommendations are advisory. Every output carries a confidence score and the evidence behind it — data policy is enforced by the platform, not by you.
                </p>
              </div>

              {/* Card 2: AI Summary */}
              <div className="mlp-ai-card">
                <div className="mlp-ai-header">
                  <h4 className="mlp-ai-title">AI Summary</h4>
                  <span className="mlp-ai-badge">AI RECOMMENDATION</span>
                </div>
                <p className="mlp-ai-desc">
                  Condense the description, email thread and approved attachments into a reviewable summary.
                </p>
                <button type="button" className="mlp-ai-btn">
                  Generate AI Summary
                </button>
              </div>

              {/* Card 3: Category & Assignment */}
              <div className="mlp-ai-card">
                <div className="mlp-ai-header">
                  <h4 className="mlp-ai-title">Category & Assignment</h4>
                  <span className="mlp-ai-badge">TRIAGE</span>
                </div>
                <p className="mlp-ai-desc">
                  Recommend category, priority, sentiment and resolver team with a confidence score.
                </p>
                <button type="button" className="mlp-ai-btn">
                  Suggest Category & Assignment
                </button>
              </div>

              {/* Card 4: Similar Tickets */}
              <div className="mlp-ai-card">
                <div className="mlp-ai-header">
                  <h4 className="mlp-ai-title">Similar Tickets</h4>
                  <span className="mlp-ai-badge">FAISS + BM25</span>
                </div>
                <p className="mlp-ai-desc">
                  Retrieve authorised historical tickets and approved knowledge articles.
                </p>
                <button type="button" className="mlp-ai-btn">
                  Find Similar Tickets
                </button>
              </div>

              {/* Card 5: Draft Customer Response */}
              <div className="mlp-ai-card">
                <div className="mlp-ai-header">
                  <h4 className="mlp-ai-title">Draft Customer Response</h4>
                  <span className="mlp-ai-badge">HUMAN SEND ONLY</span>
                </div>
                <p className="mlp-ai-desc">
                  Prepare a response for the consultant to review. Never sent automatically.
                </p>
                <button type="button" className="mlp-ai-btn">
                  Draft Customer Response
                </button>
              </div>
            </div>
          )}

          {/* ── BOTTOM AI ASSIST SECTION (Shown below all ticket cards when AI Help Panel is toggled OFF) ── */}
          {!aiPanelOn && (
            <div className="mlp-td-ai-bottom-section">
              <div className="mlp-td-ai-bottom-header">
                <div className="mlp-td-ai-bottom-header-left">
                  <h4 className="mlp-td-ai-bottom-title">AI Assist</h4>
                  <p className="mlp-td-ai-bottom-subtitle">
                    Recommendations are advisory. Every output carries a confidence score and the evidence behind it — data policy is enforced by the platform, not by you.
                  </p>
                </div>
                <span className="mlp-td-ai-bottom-badge">advisory only</span>
              </div>

              <div className="mlp-td-ai-bottom-grid">
                {/* Card 1: AI Summary */}
                <div className="mlp-ai-card">
                  <div className="mlp-ai-header">
                    <h4 className="mlp-ai-title">AI Summary</h4>
                    <span className="mlp-ai-badge">AI RECOMMENDATION</span>
                  </div>
                  <p className="mlp-ai-desc">
                    Condense the description, email thread and approved attachments into a reviewable summary.
                  </p>
                  <button type="button" className="mlp-ai-btn">
                    Generate AI Summary
                  </button>
                </div>

                {/* Card 2: Category & Assignment */}
                <div className="mlp-ai-card">
                  <div className="mlp-ai-header">
                    <h4 className="mlp-ai-title">Category & Assignment</h4>
                    <span className="mlp-ai-badge">TRIAGE</span>
                  </div>
                  <p className="mlp-ai-desc">
                    Recommend category, priority, sentiment and resolver team with a confidence score.
                  </p>
                  <button type="button" className="mlp-ai-btn">
                    Suggest Category & Assignment
                  </button>
                </div>

                {/* Card 3: Similar Tickets */}
                <div className="mlp-ai-card">
                  <div className="mlp-ai-header">
                    <h4 className="mlp-ai-title">Similar Tickets</h4>
                    <span className="mlp-ai-badge">FAISS + BM25</span>
                  </div>
                  <p className="mlp-ai-desc">
                    Retrieve authorised historical tickets and approved knowledge articles.
                  </p>
                  <button type="button" className="mlp-ai-btn">
                    Find Similar Tickets
                  </button>
                </div>

                {/* Card 4: Draft Customer Response */}
                <div className="mlp-ai-card">
                  <div className="mlp-ai-header">
                    <h4 className="mlp-ai-title">Draft Customer Response</h4>
                    <span className="mlp-ai-badge">OUTBOUND DRAFT</span>
                  </div>
                  <p className="mlp-ai-desc">
                    Prepare a response for the consultant to review. Never sent automatically.
                  </p>
                  <button type="button" className="mlp-ai-btn">
                    Draft Customer Response
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="mlp-placeholder-card" style={{ marginTop: 20 }}>
          <p style={{ color: "#64748b", margin: 0 }}>
            {searchText ? `No tickets match "${searchText}".` : "No tickets available."}
          </p>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 8,
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <span>{screenshotData?.fileName || `Ticket_${selectedTicket?.ticketNo || ""}.png`}</span>
            {selectedTicket?.ticketNo && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: "#334155",
                  color: "#cbd5e1",
                  fontWeight: 500,
                }}
              >
                {selectedTicket.ticketNo}
              </span>
            )}
          </div>
          <IconButton
            onClick={() => setPreviewModalOpen(false)}
            size="small"
            style={{ color: "#cbd5e1" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          style={{
            padding: "20px",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "350px",
            overflow: "auto",
          }}
        >
          {screenshotData?.screenshot ? (
            <img
              src={getScreenshotDataUrl(screenshotData)}
              alt={screenshotData.fileName || "Ticket Screenshot"}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                backgroundColor: "#ffffff",
              }}
            />
          ) : (
            <p style={{ color: "#64748b" }}>No screenshot image available to preview.</p>
          )}
        </DialogContent>
        <DialogActions
          style={{
            padding: "10px 20px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {screenshotData?.contentType ? `Format: ${screenshotData.contentType}` : "Image"}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            {screenshotData?.screenshot && (
              <Button
                variant="contained"
                size="small"
                onClick={handleDownloadScreenshot}
                startIcon={<DownloadOutlined />}
                style={{
                  backgroundColor: "#15803d",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                Download
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPreviewModalOpen(false)}
              style={{
                color: "#475569",
                borderColor: "#cbd5e1",
                textTransform: "none",
                fontSize: "12px",
              }}
            >
              Close
            </Button>
          </div>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TicketDetailsPage;
