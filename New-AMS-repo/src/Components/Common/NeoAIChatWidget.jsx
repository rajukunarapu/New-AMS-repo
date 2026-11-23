import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../Styles/NeoAIChatWidget.css";
import { CircularProgress } from "@mui/material";
import { useNeoAI } from "../../Context/NeoAIContext";
import FormattedMarkdown, { SingleTicketCard, MultiTicketTable, ImageThumbnail } from "./FormattedMessage";

const SUGGESTION_ICONS = [
  (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 8 8 12 12 16 12 8" />
    </svg>
  ),
  (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
];

const QUICK_FOLLOWUPS = [
  "Explain SLA risk",
  "Show high priority tickets",
  "Summarize key action items",
];

const NeoAIChatWidget = ({
  contextName = "Support Dashboard · Module Lead",
  userEmail = "satish.boddu@neovatic.com",
  onOpenFullPage,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("chat"); // "chat" | "email"
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [reactions, setReactions] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  // ── Attachment state ──
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const { messages, isThinking, askNeoAI, resetChat, defaultSuggestions } = useNeoAI();

  // Email form state
  const [emailForm, setEmailForm] = useState({
    from: userEmail || "satish.boddu@neovatic.com",
    to: "support@neovatic.com",
    subject: "",
    body: "",
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState("");

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, isOpen]);

  // Escape key closes floating popover
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // ── Open in Full Page Handler ──
  const handleOpenFullPage = () => {
    setIsOpen(false);
    if (onOpenFullPage) {
      onOpenFullPage();
      return;
    }
    const currentPath = location.pathname || "/consultant";
    localStorage.setItem("consultantActiveNav", "neoai");
    localStorage.setItem("moduleLeadActiveNav", "neoai");
    localStorage.setItem("customerActiveNav", "neoai");
    localStorage.setItem("adminActiveNav", "neoai");
    navigate(`${currentPath}?tab=neoai`);
    window.dispatchEvent(new CustomEvent("neoai:open-fullpage"));
  };

  // ── Copy Message ──
  const handleCopyMessage = (msgId, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── Message Reaction ──
  const handleReaction = (msgId, type) => {
    setReactions((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type,
    }));
  };

  // ── Drag & Drop Handlers ──
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  // ── Attachment handlers ──
  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
  };

  const handleAsk = (questionText) => {
    const q = (questionText || query).trim();
    if (!q && !attachedFile) return;

    askNeoAI(q, attachedFile);

    setQuery("");
    setAttachedFile(null);
  };

  const handleResetChat = () => {
    resetChat();
    setQuery("");
    setAttachedFile(null);
    setReactions({});
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!emailForm.subject.trim() || !emailForm.body.trim()) {
      alert("Please enter a subject and description for the new ticket message.");
      return;
    }

    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSuccessMsg("Ticket created & routed to triage agents successfully!");
      setTimeout(() => {
        setEmailSuccessMsg("");
        setEmailForm({
          from: userEmail || "satish.boddu@neovatic.com",
          to: "support@neovatic.com",
          subject: "",
          body: "",
        });
        setViewMode("chat");
      }, 1500);
    }, 1500);
  };

  return (
    <>
      {/* ── Floating Popover Card ── */}
      {isOpen && (
        <div
          className={`neoai-floating-popover ${isDragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="neoai-drag-overlay">
              <div className="neoai-drag-content">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>Drop file to analyze with NeOAI</span>
              </div>
            </div>
          )}

          {viewMode === "chat" ? (
            /* ── Chat View ── */
            <div className="neoai-card-wrapper">
              {/* Header */}
              <div className="neoai-card-header">
                <div className="neoai-header-left">
                  {/* <span className="neoai-online-pulse" title="NeOAI Assistant Active" /> */}
                  <span className="neoai-indicator-square" />
                  <span className="neoai-header-title">NeoAI</span>
                  <span className="neoai-header-context">Context: {contextName}</span>
                </div>
                <div className="neoai-header-actions">
                  <button
                    type="button"
                    className="neoai-header-btn"
                    title="New Session / Clear Chat"
                    onClick={handleResetChat}
                    aria-label="New Session"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </button>

                  {/* ── Fullpage Icon Button (Navigates to NeoAI page) ── */}
                  <button
                    type="button"
                    className="neoai-header-btn neoai-fullpage-icon-btn"
                    title="Open NeoAI in Full Page"
                    onClick={handleOpenFullPage}
                    aria-label="Open Full Page"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="neoai-header-btn neoai-close-icon-btn"
                    title="Close"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="neoai-card-body">
                <p className="neoai-intro-text">
                  Ask about tickets, customers, SLA or knowledge — answers always cite where they came from.
                </p>

                {/* Suggestions if no messages */}
                {messages.length === 0 && (
                  <div className="neoai-suggestions-list">
                    {(defaultSuggestions || []).map((suggestion, idx) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="neoai-suggestion-btn"
                        onClick={() => handleAsk(suggestion)}
                      >
                        <span className="neoai-suggestion-icon-wrap">
                          {SUGGESTION_ICONS[idx % SUGGESTION_ICONS.length]}
                        </span>
                        <span className="neoai-suggestion-text">{suggestion}</span>
                        <span className="neoai-suggestion-arrow">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Conversation Messages */}
                {messages.length > 0 && (
                  <div className="neoai-messages-list">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`neoai-message-bubble ${m.sender === "user" ? "user" : "bot"}`}
                      >
                        <div className="neoai-message-text">
                          {m.sender === "user" ? (
                            <>
                              {m.text || m.query}
                              {m.attachedFileName && (
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", marginTop: "8px", marginBottom: "4px", opacity: 0.9 }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                  </svg>
                                  <span>Attached: <strong>{m.attachedFileName}</strong></span>
                                </div>
                              )}
                              {m.screenshotUrl && (
                                <div style={{ marginTop: "4px" }}>
                                  <ImageThumbnail src={m.screenshotUrl} alt={m.attachedFileName || "Uploaded screenshot"} />
                                </div>
                              )}
                            </>
                          ) : (
                            <FormattedMarkdown text={m.text || m.header} />
                          )}
                        </div>

                        {/* Single Ticket Detail Card */}
                        {m.sender === "bot" && m.data && Array.isArray(m.data) && m.data.length === 1 && (
                          <SingleTicketCard ticket={m.data[0]} />
                        )}

                        {/* Multi Ticket Table */}
                        {m.sender === "bot" && m.data && Array.isArray(m.data) && m.data.length > 1 && (
                          <MultiTicketTable tickets={m.data} />
                        )}

                        {m.bullets && m.bullets.length > 0 && (
                          <ul style={{ margin: "6px 0 4px 16px", padding: 0, fontSize: "12px", lineHeight: "1.4" }}>
                            {m.bullets.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        )}

                        {(m.citation || m.telemetry) && (
                          <div className="neoai-message-citation">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>{m.citation || m.telemetry}</span>
                          </div>
                        )}

                        {/* Interactive message footer with Copy & Reaction */}
                        <div className="neoai-message-bottom-bar">
                          {m.sender === "bot" && (
                            <div className="neoai-msg-actions-row">
                              <button
                                type="button"
                                className="neoai-msg-action-btn"
                                title="Copy response"
                                onClick={() => handleCopyMessage(m.id, m.text || m.header || "")}
                              >
                                {copiedId === m.id ? (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span style={{ color: "#16a34a" }}>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              <div className="neoai-msg-reactions">
                                <button
                                  type="button"
                                  className={`neoai-reaction-btn ${reactions[m.id] === "up" ? "active" : ""}`}
                                  title="Helpful"
                                  onClick={() => handleReaction(m.id, "up")}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className={`neoai-reaction-btn ${reactions[m.id] === "down" ? "active" : ""}`}
                                  title="Not helpful"
                                  onClick={() => handleReaction(m.id, "down")}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                          <span className="neoai-message-time">{m.time}</span>
                        </div>
                      </div>
                    ))}

                    {isThinking && (
                      <div className="neoai-message-bubble bot thinking">
                        <CircularProgress size={12} color="inherit" thickness={5} />
                        <span>Searching grounded knowledge & SLA monitors...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Quick interactive follow-up chips when conversation is active */}
              {messages.length > 0 && !isThinking && (
                <div className="neoai-quick-followups">
                  {QUICK_FOLLOWUPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="neoai-followup-chip"
                      onClick={() => handleAsk(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Attached file chip */}
              {attachedFile && (
                <div className="neoai-attachment-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="neoai-attachment-chip-name" title={attachedFile.name}>
                    {attachedFile.name}
                  </span>
                  <button
                    type="button"
                    className="neoai-attachment-chip-remove"
                    onClick={handleRemoveAttachment}
                    title="Remove attachment"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Footer Input */}
              <div className="neoai-card-footer">
                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileSelected}
                />

                <button
                  type="button"
                  className="neoai-attachment-btn"
                  title="Attach file / screenshot"
                  onClick={handleAttachClick}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                <div className="neoai-input-wrap">
                  <input
                    type="text"
                    className="neoai-chat-input"
                    placeholder="Ask about a ticket, or how to do somethin..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAsk();
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      className="neoai-input-clear-btn"
                      onClick={() => setQuery("")}
                      title="Clear text"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="neoai-ask-btn"
                  onClick={() => handleAsk()}
                  disabled={(!query.trim() && !attachedFile) || isThinking}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "3px" }}>
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {/* <span>Ask</span> */}
                </button>
              </div>
            </div>
          ) : (
            /* ── New Message / Email Composer View ── */
            <div className="neoai-card-wrapper email-view">
              {/* Header */}
              <div className="neoai-email-header">
                <div className="neoai-email-header-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>New message</span>
                </div>
                <button
                  type="button"
                  className="neoai-email-close-btn"
                  onClick={() => setViewMode("chat")}
                  title="Back to NeoAI Chat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Form Body */}
              <form className="neoai-email-body" onSubmit={handleSendEmail}>
                <div className="neoai-email-field-row">
                  <span className="neoai-email-field-lbl">From</span>
                  <span className="neoai-email-field-val mono">{emailForm.from}</span>
                </div>

                <div className="neoai-email-field-row">
                  <span className="neoai-email-field-lbl">To</span>
                  <span className="neoai-email-field-val mono">{emailForm.to}</span>
                </div>

                <input
                  type="text"
                  className="neoai-email-subject-input"
                  placeholder="Subject — e.g. Cannot post AP invoice in FB60, urgent"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                />

                <textarea
                  className="neoai-email-textarea"
                  placeholder="Describe the issue the way a customer would. Mention a transaction code (FB60, MIGO, ME21N), a short dump or an IDoc failure and the triage agent will route it to that team."
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                />

                {emailSuccessMsg && (
                  <div className="neoai-email-success-banner">
                    {emailSuccessMsg}
                  </div>
                )}

                {/* Footer */}
                <div className="neoai-email-footer">
                  <button
                    type="submit"
                    className="neoai-email-send-btn"
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? (
                      <>
                        <CircularProgress size={12} color="inherit" thickness={5} />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>

                  <p className="neoai-email-subtext">
                    Goes to the platform — triage, assignment, SLA and monitoring agents run live.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Right NeoAI Trigger Button ── */}
      <button
        type="button"
        className="neoai-bottom-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="NeoAI Assistant"
      >
        {/* <span className="neoai-trigger-pulse" /> */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <span>NeoAI</span>
      </button>
    </>
  );
};

export default NeoAIChatWidget;