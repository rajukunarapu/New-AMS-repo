import React, { useState, useRef, useEffect } from "react";
import "../../Styles/NeoAIFullPage.css";
import { CircularProgress } from "@mui/material";
import { useNeoAI } from "../../Context/NeoAIContext";
import FormattedMarkdown, { SingleTicketCard, MultiTicketTable } from "./FormattedMessage";
 
const NeoAIFullPage = () => {
  const [query, setQuery] = useState("");
  const { messages, isThinking, askNeoAI, resetChat, loadConversation, defaultSuggestions } = useNeoAI();

  // ── History management state ──
  const [historySessions, setHistorySessions] = useState(() => {
    try {
      const stored = localStorage.getItem("neoai_chat_history_sessions");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // ── Attachment state ──
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
 
  const chatEndRef = useRef(null);
 
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking]);

  // ── Helper: Save current session to history ──
  const saveSessionToStorage = (msgsToSave) => {
    if (!msgsToSave || msgsToSave.length === 0) return;
    try {
      const existing = JSON.parse(localStorage.getItem("neoai_chat_history_sessions") || "[]");
      const firstUserMsg = msgsToSave.find((m) => m.sender === "user");
      const title = firstUserMsg ? (firstUserMsg.query || firstUserMsg.text) : "Conversation session";
      const newSession = {
        id: "session_" + Date.now(),
        timestamp: new Date().toISOString(),
        dateStr: new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        preview: title.length > 60 ? title.substring(0, 60) + "..." : title,
        messageCount: msgsToSave.length,
        messages: msgsToSave,
      };

      if (existing.length > 0 && JSON.stringify(existing[0].messages) === JSON.stringify(msgsToSave)) {
        return;
      }

      const updated = [newSession, ...existing.slice(0, 29)];
      localStorage.setItem("neoai_chat_history_sessions", JSON.stringify(updated));
      setHistorySessions(updated);
    } catch (e) {
      console.error("Error saving session to history", e);
    }
  };

  // ── Clear chat handler ──
  const handleClear = () => {
    if (messages && messages.length > 0) {
      saveSessionToStorage(messages);
    }
    resetChat();
    setAttachedFile(null);
    setQuery("");
  };

  // ── History restoration handlers ──
  const handleSelectSession = (session) => {
    if (messages && messages.length > 0) {
      saveSessionToStorage(messages);
    }
    loadConversation(session.messages);
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    const updated = historySessions.filter((s) => s.id !== sessionId);
    localStorage.setItem("neoai_chat_history_sessions", JSON.stringify(updated));
    setHistorySessions(updated);
  };

  const handleClearAllHistory = () => {
    localStorage.removeItem("neoai_chat_history_sessions");
    setHistorySessions([]);
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

    if (attachedFile) {
      askNeoAI(q || `Attached file: ${attachedFile.name}`, attachedFile);
    } else {
      askNeoAI(q);
    }

    setQuery("");
    setAttachedFile(null);
  };
 
  return (
    <div className="neoai-fullpage-container">
      {/* Header Section */}
      <div className="neoai-fullpage-header">
        <h1 className="neoai-fullpage-title">NeOAI</h1>
        <p className="neoai-fullpage-subtitle">
          Ask about tickets, customers and past fixes in plain language. Answers cite where they came from, and an unsupported question gets "no answer" rather than a guess.
        </p>
      </div>
 
      {/* Main 2-Column Layout */}
      <div className="neoai-fullpage-grid">
        {/* Left Column: Interactive Chat Area */}
        <div className="neoai-chat-column">
          <div className="neoai-chat-box">
            {/* Chat Header Toolbar with Clear and History Controls */}
            <div className="neoai-chat-toolbar">
              <div className="neoai-toolbar-status">
                <span className="neoai-status-dot" />
                <span className="neoai-toolbar-status-text">
                  {messages.length > 0
                    ? `${messages.length} message${messages.length > 1 ? "s" : ""} in session`
                    : "NeoAI Intelligence Active · Ready for questions"}
                </span>
              </div>
              <div className="neoai-toolbar-actions">
                <button
                  type="button"
                  className="neoai-toolbar-btn history"
                  onClick={() => setShowHistory(true)}
                  title="View conversation history"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>History</span>
                  {historySessions.length > 0 && (
                    <span className="neoai-history-pill">{historySessions.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="neoai-toolbar-btn clear"
                  onClick={handleClear}
                  disabled={messages.length === 0}
                  title="Clear current conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Scrollable Messages Container */}
            <div className="neoai-chat-stream">
              {messages.length === 0 && (
                <div className="neoai-chat-empty-state">
                  <div className="neoai-empty-state-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2d4f7c" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3 className="neoai-empty-state-title">How can NeoAI help you today?</h3>
                  <p className="neoai-empty-state-desc">
                    Ask questions about incident tickets, SLA risks, consultant workloads, or module resolutions. Or click any suggested query below to get started.
                  </p>
                </div>
              )}

              {messages.map((m) => {
                if (m.sender === "user") {
                  return (
                    <div key={m.id} className="neoai-user-bubble-wrap">
                      <span className="neoai-bubble-sender-lbl user">YOU</span>
                      <div className="neoai-user-bubble">
                        {m.query || m.text}
                      </div>
                    </div>
                  );
                }
 
                return (
                  <div key={m.id} className="neoai-bot-response-wrap">
                    <span className="neoai-bubble-sender-lbl bot">NEOAI</span>
                    <div className="neoai-bot-card">
                      <FormattedMarkdown text={m.text || m.header} />
                      
                      {/* Single Ticket Detail Card displaying ALL Labels */}
                      {m.data && Array.isArray(m.data) && m.data.length === 1 && (
                        <SingleTicketCard ticket={m.data[0]} />
                      )}

                      {/* Multi Ticket Table with View All Labels toggle */}
                      {m.data && Array.isArray(m.data) && m.data.length > 1 && (
                        <MultiTicketTable tickets={m.data} />
                      )}
                      {m.bullets && m.bullets.length > 0 && (
                        <ul className="neoai-bot-bullets">
                          {m.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {m.action && (
                        <p className="neoai-bot-action-text">{m.action}</p>
                      )}
                    </div>
 
                    {/* Tag Pills */}
                    {m.tags && (
                      <div className="neoai-citation-tags-row">
                        {m.tags.map((tag) => (
                          <span key={tag} className="neoai-citation-tag-pill">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
 
                    {/* Telemetry Subtext */}
                    {m.telemetry && (
                      <div className="neoai-telemetry-subtext">
                        {m.telemetry}
                      </div>
                    )}
                  </div>
                );
              })}
 
              {isThinking && (
                <div className="neoai-bot-response-wrap thinking">
                  <span className="neoai-bubble-sender-lbl bot">NEOAI</span>
                  <div className="neoai-bot-card thinking-card">
                    <CircularProgress size={14} color="inherit" thickness={5} />
                    <span>Executing hybrid vector + SQL retrieval pipeline...</span>
                  </div>
                </div>
              )}
 
              <div ref={chatEndRef} />
            </div>

            {/* Attached file chip (shown above the input row when a file is selected) */}
            {attachedFile && (
              <div className="neoai-fullpage-attachment-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="neoai-fullpage-attachment-chip-name" title={attachedFile.name}>
                  {attachedFile.name}
                </span>
                <button
                  type="button"
                  className="neoai-fullpage-attachment-chip-remove"
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
 
            {/* Input Row */}
            <div className="neoai-input-wrapper">
              {/* Hidden native file input */}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />

              <button
                type="button"
                className="neoai-fullpage-attachment-btn"
                title="Attach file"
                onClick={handleAttachClick}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              <input
                type="text"
                className="neoai-fullpage-input"
                placeholder="Ask about tickets, SLA, knowledge or contracts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAsk();
                }}
              />
              <button
                type="button"
                className="neoai-fullpage-ask-btn"
                onClick={() => handleAsk()}
                disabled={(!query.trim() && !attachedFile) || isThinking}
              >
                Ask
              </button>
            </div>
 
            {/* Suggested Prompt Pills */}
            <div className="neoai-suggestions-row">
              {(defaultSuggestions || []).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="neoai-suggestion-pill-btn"
                  onClick={() => handleAsk(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Conversation History Drawer Modal ── */}
      {showHistory && (
        <div className="neoai-history-backdrop" onClick={() => setShowHistory(false)}>
          <div className="neoai-history-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="neoai-history-drawer-header">
              <div className="neoai-history-title-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <h3>Conversation History</h3>
              </div>
              <button
                type="button"
                className="neoai-history-close-btn"
                onClick={() => setShowHistory(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="neoai-history-drawer-body">
              {historySessions.length === 0 ? (
                <div className="neoai-history-empty">
                  <div className="neoai-history-empty-icon">💬</div>
                  <p className="neoai-history-empty-title">No conversation history yet</p>
                  <p className="neoai-history-empty-desc">
                    When you clear or finish a conversation, it will be automatically saved here so you can review or restore it anytime.
                  </p>
                </div>
              ) : (
                <div className="neoai-history-list">
                  {historySessions.map((session) => (
                    <div
                      key={session.id}
                      className="neoai-history-item"
                      onClick={() => handleSelectSession(session)}
                    >
                      <div className="neoai-history-item-top">
                        <span className="neoai-history-item-date">{session.dateStr}</span>
                        <button
                          type="button"
                          className="neoai-history-item-delete"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete this session"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="neoai-history-item-preview">{session.preview}</div>
                      <div className="neoai-history-item-meta">
                        <span className="neoai-history-item-count">
                          {session.messageCount} message{session.messageCount > 1 ? "s" : ""}
                        </span>
                        <span className="neoai-history-item-restore-lbl">Restore conversation →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {historySessions.length > 0 && (
              <div className="neoai-history-drawer-footer">
                <button
                  type="button"
                  className="neoai-history-clear-all-btn"
                  onClick={handleClearAllHistory}
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
 
export default NeoAIFullPage;