import React, { useState, useRef, useEffect } from "react";
import "../../Styles/NeoAIChatWidget.css";
import { CircularProgress } from "@mui/material";
import { useNeoAI } from "../../Context/NeoAIContext";
import FormattedMarkdown, { SingleTicketCard, MultiTicketTable } from "./FormattedMessage";

const NeoAIChatWidget = ({
  contextName = "Support Dashboard · Module Lead",
  userEmail = "satish.boddu@neovatic.com",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("chat"); // "chat" | "email"
  const [query, setQuery] = useState("");

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
    // reset so selecting the same file again still fires onChange
    e.target.value = "";
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
  };

  const handleAsk = (questionText) => {
    const q = (questionText || query).trim();
    if (!q && !attachedFile) return;

    // If askNeoAI supports a second (file) argument this passes it through;
    // otherwise it's simply ignored by the existing signature — safe either way.
    if (attachedFile) {
      askNeoAI(q || `Attached file: ${attachedFile.name}`, attachedFile);
    } else {
      askNeoAI(q);
    }

    setQuery("");
    setAttachedFile(null);
  };

  const handleResetChat = () => {
    resetChat();
    setQuery("");
    setAttachedFile(null);
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
        <div className="neoai-floating-popover">
          {viewMode === "chat" ? (
            /* ── Chat View (Screenshot 1) ── */
            <div className="neoai-card-wrapper">
              {/* Header */}
              <div className="neoai-card-header">
                <div className="neoai-header-left">
                  <span className="neoai-indicator-square" />
                  <span className="neoai-header-title">NeOAI</span>
                  <span className="neoai-header-context">Context: {contextName}</span>
                </div>
                <div className="neoai-header-actions">
                  <button
                    type="button"
                    className="neoai-header-btn"
                    title="New Session / Clear"
                    onClick={handleResetChat}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="neoai-header-btn"
                    title="Close"
                    onClick={() => setIsOpen(false)}
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
                    {(defaultSuggestions || []).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="neoai-suggestion-btn"
                        onClick={() => handleAsk(suggestion)}
                      >
                        {suggestion}
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
                            m.text || m.query
                          ) : (
                            <FormattedMarkdown text={m.text || m.header} />
                          )}
                        </div>

                        {/* Single Ticket Detail Card displaying ALL Labels */}
                        {m.sender === "bot" && m.data && Array.isArray(m.data) && m.data.length === 1 && (
                          <SingleTicketCard ticket={m.data[0]} />
                        )}

                        {/* Multi Ticket Table with View All Labels toggle */}
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
                        <span className="neoai-message-time">{m.time}</span>
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

              {/* Attached file chip (shown above footer when a file is selected) */}
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
                  title="Attach file"
                  onClick={handleAttachClick}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

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

                <button
                  type="button"
                  className="neoai-ask-btn"
                  onClick={() => handleAsk()}
                  disabled={(!query.trim() && !attachedFile) || isThinking}
                >
                  Ask
                </button>
              </div>
            </div>
          ) : (
            /* ── New Message / Email Composer View (Screenshot 2) — unchanged ── */
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>NeoAI</span>
      </button>
    </>
  );
};

export default NeoAIChatWidget;