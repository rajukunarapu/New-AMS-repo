import React, { useState, useRef, useEffect } from "react";
import "../../Styles/NeoAIFullPage.css";
import { CircularProgress } from "@mui/material";
import { useNeoAI } from "../../Context/NeoAIContext";
import FormattedMarkdown, { SingleTicketCard, MultiTicketTable } from "./FormattedMessage";
 
const NeoAIFullPage = () => {
  const [query, setQuery] = useState("");
  const { messages, isThinking, activeTrace, askNeoAI, defaultSuggestions } = useNeoAI();

  // ── Attachment state ──
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
 
  const chatEndRef = useRef(null);
 
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking]);

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
            {/* Scrollable Messages Container */}
            <div className="neoai-chat-stream">
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
 
        {/* Right Column: Pipeline & Trace Sidebars */}
        <div className="neoai-sidebar-column">
          {/* Panel 1: RETRIEVAL PIPELINE */}
          <div className="neoai-side-panel">
            <h3 className="neoai-side-panel-title">RETRIEVAL PIPELINE</h3>
            <div className="neoai-pipeline-list">
              <div className="neoai-pipeline-step">
                <span className="neoai-step-num">1</span>
                <span className="neoai-step-desc">Detect intent: lookup, knowledge, report or action</span>
              </div>
              <div className="neoai-pipeline-step">
                <span className="neoai-step-num">2</span>
                <span className="neoai-step-desc">Apply identity, role, customer and assignment filters</span>
              </div>
              <div className="neoai-pipeline-step">
                <span className="neoai-step-num">3</span>
                <span className="neoai-step-desc">Hybrid search: vector + keyword, direct SQL for exact ids</span>
              </div>
              <div className="neoai-pipeline-step">
                <span className="neoai-step-num">4</span>
                <span className="neoai-step-desc">Rerank and require a minimum evidence score</span>
              </div>
              <div className="neoai-pipeline-step">
                <span className="neoai-step-num">5</span>
                <span className="neoai-step-desc">Answer with citations, or return insufficient evidence</span>
              </div>
              <div className="neoai-pipeline-step">
                <span className="neoai-step-num">6</span>
                <span className="neoai-step-desc">Route any write action to the confirmation workflow</span>
              </div>
            </div>
          </div>
 
          {/* Panel 2: RETRIEVAL TRACE */}
          <div className="neoai-side-panel">
            <h3 className="neoai-side-panel-title">RETRIEVAL TRACE</h3>
            <div className="neoai-trace-table">
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Intent</span>
                <span className="neoai-trace-val">{activeTrace.intent}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Scope filter</span>
                <span className="neoai-trace-val">{activeTrace.scope}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Retrieval</span>
                <span className="neoai-trace-val">{activeTrace.retrieval}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Reranker</span>
                <span className="neoai-trace-val">{activeTrace.reranker}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Min evidence score</span>
                <span className="neoai-trace-val">{activeTrace.minEvidence}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Route</span>
                <span className="neoai-trace-val">{activeTrace.route}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Write actions</span>
                <span className="neoai-trace-val">{activeTrace.writeActions}</span>
              </div>
              <div className="neoai-trace-row">
                <span className="neoai-trace-key">Last call</span>
                <span className="neoai-trace-val">{activeTrace.lastCall}</span>
              </div>
            </div>
            <p className="neoai-trace-note">
              Identity, role, customer and assignment filters are applied before retrieval prompt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default NeoAIFullPage;