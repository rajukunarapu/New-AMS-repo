import React, { useState, useContext } from "react";
import ThemeContext from "../../Context/ThemeContext";

// Standard label definitions for AMS ticket properties
const STANDARD_LABELS = [
  { keys: ["ticketNo", "ticketId", "id", "number"], label: "Ticket Number / ID", isCode: true },
  { keys: ["clientName", "client"], label: "Client Name", isCode: true },
  { keys: ["ticketStatus", "status"], label: "Ticket Status", isBadge: true, type: "status" },
  { keys: ["priority"], label: "Priority", isBadge: true, type: "priority" },
  { keys: ["typeofticket", "typeOfTicket", "type", "ticketType", "ticket_type", "category", "ticketCategory", "issueType"], label: "Type of Ticket", isCode: true },
  { keys: ["assigntogroup", "group"], label: "Assigned Group", isCode: true },
  { keys: ["module"], label: "Module", isCode: true },
  { keys: ["reportedby", "createdname"], label: "Reported By", isCode: false },
  { keys: ["createdEmails"], label: "Reporter Email", isCode: false },
  { keys: ["reportedon", "createddate"], label: "Reported Date", isCode: true },
  { keys: ["reportedontime"], label: "Reported Time", isCode: true },
  { keys: ["descriptionofTicket", "description", "name"], label: "Description", isFullWidth: true },
  { keys: ["txnId"], label: "Transaction ID", isCode: true },
  { keys: ["ams"], label: "AMS System", isCode: true },
  { keys: ["remarks"], label: "Remarks / Notes", isFullWidth: true },
  { keys: ["screenshort", "attachment"], label: "Screenshot / Attachment", isFullWidth: true },
];

/**
 * Helper to determine current theme (Dark or Light)
 */
const useIsDark = () => {
  const themeCtx = useContext(ThemeContext);
  if (themeCtx && typeof themeCtx.isDark === "boolean") {
    return themeCtx.isDark;
  }
  if (typeof document !== "undefined") {
    return document.body.classList.contains("dark-theme") || document.documentElement.getAttribute("data-theme") === "dark";
  }
  return false;
};

/**
 * Helper to get value for a label definition from a ticket dictionary
 */
const getFieldValue = (ticket, keys) => {
  for (const k of keys) {
    if (ticket && ticket[k] !== undefined && ticket[k] !== null && String(ticket[k]).trim() !== "") {
      return ticket[k];
    }
  }
  return null;
};

/**
 * Priority Badge styling helper
 */
const renderPriorityBadge = (val, isDark) => {
  const v = String(val || "").toLowerCase();
  const textColor = isDark ? "#ffffff" : "#000000";

  if (v.includes("missing") || v.includes("required") || v.includes("not provided")) {
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 700,
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2",
          color: isDark ? "#f87171" : "#dc2626",
          border: `1px solid ${isDark ? "#ef4444" : "#fca5a5"}`,
          display: "inline-block",
        }}
      >
        {val}
      </span>
    );
  }

  let bg = isDark ? "#450a0a" : "#fef2f2";
  let border = isDark ? "#991b1b" : "#fca5a5";

  if (v.includes("very high") || v.includes("critical") || v.includes("p1")) {
    bg = isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2";
    border = isDark ? "#ef4444" : "#fca5a5";
  } else if (v.includes("high") || v.includes("p2")) {
    bg = isDark ? "rgba(249, 115, 22, 0.2)" : "#fff7ed";
    border = isDark ? "#f97316" : "#fdba74";
  } else if (v.includes("medium") || v.includes("p3")) {
    bg = isDark ? "rgba(234, 179, 8, 0.2)" : "#fefce8";
    border = isDark ? "#eab308" : "#fde047";
  } else {
    bg = isDark ? "rgba(14, 165, 233, 0.2)" : "#f0f9ff";
    border = isDark ? "#0ea5e9" : "#7dd3fc";
  }

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 700,
        backgroundColor: bg,
        color: textColor,
        border: `1px solid ${border}`,
        display: "inline-block",
      }}
    >
      {val}
    </span>
  );
};

/**
 * Status Badge styling helper
 */
const renderStatusBadge = (val, isDark) => {
  const v = String(val || "").toLowerCase();
  const textColor = isDark ? "#ffffff" : "#000000";

  if (v.includes("missing") || v.includes("required")) {
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 700,
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2",
          color: isDark ? "#f87171" : "#dc2626",
          border: `1px solid ${isDark ? "#ef4444" : "#fca5a5"}`,
          display: "inline-block",
        }}
      >
        {val}
      </span>
    );
  }

  let bg = isDark ? "rgba(34, 197, 94, 0.2)" : "#f0fdf4";
  let border = isDark ? "#22c55e" : "#86efac";

  if (v.includes("closed") || v.includes("resolved") || v.includes("completed")) {
    bg = isDark ? "rgba(148, 163, 184, 0.2)" : "#f3f4f6";
    border = isDark ? "#64748b" : "#d1d5db";
  } else if (v.includes("progress") || v.includes("working") || v.includes("allocation")) {
    bg = isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff";
    border = isDark ? "#3b82f6" : "#93c5fd";
  } else if (v.includes("triage") || v.includes("pending")) {
    bg = isDark ? "rgba(249, 115, 22, 0.2)" : "#fff7ed";
    border = isDark ? "#f97316" : "#fdba74";
  }

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 700,
        backgroundColor: bg,
        color: textColor,
        border: `1px solid ${border}`,
        display: "inline-block",
      }}
    >
      {val}
    </span>
  );
};

/**
 * Render a single Ticket Card showing ALL extracted labels
 */
export const SingleTicketCard = ({ ticket, title = null }) => {
  const isDark = useIsDark();
  if (!ticket || typeof ticket !== "object") return null;

  const textColor = isDark ? "#ffffff" : "#000000";
  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const cardBorder = isDark ? "#334155" : "#000000";
  const codeBg = isDark ? "rgba(255, 255, 255, 0.12)" : "#f1f5f9";
  const codeBorder = isDark ? "rgba(255, 255, 255, 0.25)" : "#cbd5e1";

  const extracted = [];
  const processedKeys = new Set();

  STANDARD_LABELS.forEach((def) => {
    const val = getFieldValue(ticket, def.keys);
    if (val !== null) {
      extracted.push({
        label: def.label,
        value: val,
        isBadge: def.isBadge,
        type: def.type,
        isCode: def.isCode,
        isFullWidth: def.isFullWidth,
      });
      def.keys.forEach((k) => processedKeys.add(k));
    }
  });

  Object.keys(ticket).forEach((k) => {
    if (!processedKeys.has(k) && !k.startsWith("_") && ticket[k] !== null && ticket[k] !== undefined && String(ticket[k]).trim() !== "") {
      const humanLabel = k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
      extracted.push({
        label: humanLabel,
        value: ticket[k],
        isBadge: false,
        isCode: false,
        isFullWidth: String(ticket[k]).length > 40,
      });
    }
  });

  const ticketIdVal = getFieldValue(ticket, ["ticketNo", "ticketId", "txnId", "id"]) || "Ticket Details";

  return (
    <div
      style={{
        marginTop: "10px",
        marginBottom: "10px",
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: "8px",
        padding: "12px 14px",
        boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.4)" : "0 2px 8px rgba(0, 0, 0, 0.08)",
        color: textColor,
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${isDark ? "#1e293b" : "#000000"}`,
          paddingBottom: "8px",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px", color: textColor }}>
            {title || `Ticket: ${ticketIdVal}`}
          </span>
        </div>
        {getFieldValue(ticket, ["ticketStatus", "status"]) && (
          renderStatusBadge(getFieldValue(ticket, ["ticketStatus", "status"]), isDark)
        )}
      </div>

      {/* Grid of all Labels & Values */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px 14px",
          fontSize: "12px",
          color: textColor,
        }}
      >
        {extracted.map((item, idx) => (
          <div
            key={idx}
            style={{
              gridColumn: item.isFullWidth ? "1 / -1" : "span 1",
              background: item.isFullWidth ? (isDark ? "#1e293b" : "#f8fafc") : "transparent",
              padding: item.isFullWidth ? "6px 8px" : "0",
              borderRadius: item.isFullWidth ? "4px" : "0",
              border: item.isFullWidth ? `1px solid ${isDark ? "#334155" : "#e2e8f0"}` : "none",
            }}
          >
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: textColor, fontWeight: 700, marginBottom: "2px" }}>
              {item.label}
            </div>
            <div style={{ color: textColor, wordBreak: "break-word", lineHeight: "1.4" }}>
              {item.isBadge ? (
                item.type === "priority" ? (
                  renderPriorityBadge(item.value, isDark)
                ) : (
                  renderStatusBadge(item.value, isDark)
                )
              ) : item.isCode ? (
                <code style={{ background: codeBg, border: `1px solid ${codeBorder}`, padding: "2px 5px", borderRadius: "3px", fontSize: "11px", color: textColor, fontWeight: 600 }}>
                  {String(item.value)}
                </code>
              ) : (
                String(item.value)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Multi Ticket Table with interactive expansion
 */
export const MultiTicketTable = ({ tickets }) => {
  const isDark = useIsDark();
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) return null;

  const textColor = isDark ? "#ffffff" : "#000000";
  const tableBg = isDark ? "#0f172a" : "#ffffff";
  const headerBg = isDark ? "#1e293b" : "#f1f5f9";
  const tableBorder = isDark ? "#334155" : "#000000";
  const rowBorder = isDark ? "#1e293b" : "#e2e8f0";

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div style={{ marginTop: "10px", overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          fontSize: "11px",
          borderCollapse: "collapse",
          border: `1px solid ${tableBorder}`,
          borderRadius: "6px",
          overflow: "hidden",
          color: textColor,
          background: tableBg,
        }}
      >
        <thead>
          <tr style={{ background: headerBg, textAlign: "left", color: textColor, borderBottom: `2px solid ${tableBorder}` }}>
            <th style={{ padding: "6px 8px", color: textColor, fontWeight: 700 }}>Ticket ID</th>
            <th style={{ padding: "6px 8px", color: textColor, fontWeight: 700 }}>Client</th>
            <th style={{ padding: "6px 8px", color: textColor, fontWeight: 700 }}>Type</th>
            <th style={{ padding: "6px 8px", color: textColor, fontWeight: 700 }}>Priority</th>
            <th style={{ padding: "6px 8px", color: textColor, fontWeight: 700 }}>Status</th>
            <th style={{ padding: "6px 8px", color: textColor, fontWeight: 700 }}>Group</th>
            <th style={{ padding: "6px 8px", textAlign: "center", color: textColor, fontWeight: 700 }}>All Labels</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((row, idx) => {
            const ticketId = getFieldValue(row, ["ticketNo", "ticketId", "txnId", "id"]) || `T-${idx + 1}`;
            const client = getFieldValue(row, ["clientName", "client"]) || "—";
            const type = getFieldValue(row, ["typeofticket", "typeOfTicket", "type", "ticketType", "ticket_type", "category", "ticketCategory", "issueType"]) || "Incident";
            const priority = getFieldValue(row, ["priority"]);
            const status = getFieldValue(row, ["ticketStatus", "status"]);
            const group = getFieldValue(row, ["assigntogroup", "group", "module"]) || "—";
            const isExpanded = expandedIndex === idx;

            return (
              <React.Fragment key={idx}>
                <tr style={{ borderBottom: `1px solid ${rowBorder}`, background: isExpanded ? (isDark ? "#1e293b" : "#f8fafc") : tableBg, color: textColor }}>
                  <td style={{ padding: "6px 8px", fontWeight: 700, color: textColor }}>{ticketId}</td>
                  <td style={{ padding: "6px 8px", color: textColor }}>{client}</td>
                  <td style={{ padding: "6px 8px", color: textColor }}>{type}</td>
                  <td style={{ padding: "6px 8px", color: textColor }}>{priority ? renderPriorityBadge(priority, isDark) : "—"}</td>
                  <td style={{ padding: "6px 8px", color: textColor }}>{status ? renderStatusBadge(status, isDark) : "—"}</td>
                  <td style={{ padding: "6px 8px", color: textColor }}>{group}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(idx)}
                      style={{
                        background: isExpanded ? (isDark ? "#ffffff" : "#000000") : (isDark ? "#1e293b" : "#f1f5f9"),
                        color: isExpanded ? (isDark ? "#000000" : "#ffffff") : textColor,
                        border: `1px solid ${isDark ? "#475569" : "#000000"}`,
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontSize: "10px",
                        cursor: "pointer",
                        fontWeight: 700,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isExpanded ? "Hide Labels ▲" : "View All Labels ▼"}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={7} style={{ padding: "8px", background: isDark ? "#0f172a" : "#f8fafc" }}>
                      <SingleTicketCard ticket={row} title={`Full Label Breakdown: ${ticketId}`} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Custom Theme-Aware Markdown Renderer Component
 * - Renders WHITE text in Dark Mode, BLACK text in Light Mode
 * - Renders missing required field status/value in RED
 */
export const FormattedMarkdown = ({ text }) => {
  const isDark = useIsDark();
  if (!text) return null;

  const textColor = isDark ? "#ffffff" : "#000000";
  const tableBg = isDark ? "#0f172a" : "#ffffff";
  const headerBg = isDark ? "#1e293b" : "#f1f5f9";
  const tableBorder = isDark ? "#475569" : "#000000";
  const cellBorder = isDark ? "#334155" : "#e2e8f0";
  const altRowBg = isDark ? "#1e293b" : "#f8fafc";
  const missingRedColor = isDark ? "#f87171" : "#dc2626";

  const lines = String(text).split("\n");
  const elements = [];
  let inList = false;
  let listItems = [];
  let inTable = false;
  let tableRows = [];

  const flushList = (keyPrefix) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-ul`} style={{ margin: "6px 0 8px 18px", padding: 0, color: textColor }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ marginBottom: "4px", lineHeight: "1.5", color: textColor }}>
              {renderInlineMarkdown(item, isDark)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = (keyPrefix) => {
    if (inTable && tableRows.length > 0) {
      const validRows = tableRows.filter(
        (r) => !r.every((cell) => /^[:\s-]+$/.test(cell.trim()))
      );

      if (validRows.length > 0) {
        const headerRow = validRows[0];
        const bodyRows = validRows.slice(1);

        elements.push(
          <div key={`${keyPrefix}-table-wrap`} style={{ overflowX: "auto", margin: "10px 0" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                border: `1px solid ${tableBorder}`,
                color: textColor,
                background: tableBg,
                borderRadius: "4px",
              }}
            >
              <thead>
                <tr style={{ background: headerBg, borderBottom: `2px solid ${tableBorder}` }}>
                  {headerRow.map((cell, idx) => (
                    <th
                      key={idx}
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: textColor,
                        borderRight: idx < headerRow.length - 1 ? `1px solid ${tableBorder}` : "none",
                      }}
                    >
                      {renderInlineMarkdown(cell.trim(), isDark)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: `1px solid ${cellBorder}`,
                      background: rIdx % 2 === 0 ? tableBg : altRowBg,
                    }}
                  >
                    {row.map((cell, cIdx) => {
                      const cellTrimmed = cell.trim();
                      const isMissingStatusCell = /missing|required/i.test(cellTrimmed) && !/optional/i.test(cellTrimmed);
                      const isNotProvidedCell = /not\s+provided/i.test(cellTrimmed);
                      const isRedCell = isMissingStatusCell || isNotProvidedCell;

                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: "8px 10px",
                            color: isRedCell ? missingRedColor : textColor,
                            fontWeight: isMissingStatusCell ? 700 : (isNotProvidedCell ? 600 : 400),
                            fontStyle: isNotProvidedCell ? "italic" : "normal",
                            verticalAlign: "top",
                            borderRight: cIdx < row.length - 1 ? `1px solid ${cellBorder}` : "none",
                            lineHeight: "1.45",
                          }}
                        >
                          {renderInlineMarkdown(cellTrimmed, isDark)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    const isTableLine = trimmed.startsWith("|") && (trimmed.endsWith("|") || trimmed.includes("|"));

    if (isTableLine) {
      flushList(index);
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      let cells = trimmed.split("|");
      if (cells.length > 1) {
        if (cells[0].trim() === "") cells.shift();
        if (cells.length > 0 && cells[cells.length - 1].trim() === "") cells.pop();
        tableRows.push(cells);
      }
    } else {
      flushTable(index);

      if (trimmed.startsWith("### ")) {
        elements.push(
          <h4 key={index} style={{ margin: "10px 0 4px 0", fontSize: "14px", color: textColor, fontWeight: 700 }}>
            {renderInlineMarkdown(trimmed.replace(/^###\s+/, ""), isDark)}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h3 key={index} style={{ margin: "12px 0 6px 0", fontSize: "15px", color: textColor, fontWeight: 700 }}>
            {renderInlineMarkdown(trimmed.replace(/^##\s+/, ""), isDark)}
          </h3>
        );
      } else if (trimmed.startsWith("# ")) {
        elements.push(
          <h2 key={index} style={{ margin: "14px 0 6px 0", fontSize: "16px", color: textColor, fontWeight: 700 }}>
            {renderInlineMarkdown(trimmed.replace(/^#\s+/, ""), isDark)}
          </h2>
        );
      } else if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        elements.push(
          <hr key={index} style={{ border: "none", borderTop: `1px solid ${tableBorder}`, margin: "10px 0" }} />
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      } else if (trimmed.startsWith("> ")) {
        elements.push(
          <blockquote
            key={index}
            style={{
              margin: "8px 0",
              padding: "8px 12px",
              borderLeft: `4px solid ${missingRedColor}`,
              background: isDark ? "rgba(30, 41, 59, 0.8)" : "#f8fafc",
              borderRadius: "0 4px 4px 0",
              fontSize: "12px",
              color: textColor,
              borderTop: `1px solid ${cellBorder}`,
              borderRight: `1px solid ${cellBorder}`,
              borderBottom: `1px solid ${cellBorder}`,
            }}
          >
            {renderInlineMarkdown(trimmed.replace(/^>\s+/, ""), isDark)}
          </blockquote>
        );
      } else if (trimmed === "") {
        // empty line
      } else {
        elements.push(
          <p key={index} style={{ margin: "4px 0", lineHeight: "1.5", color: textColor }}>
            {renderInlineMarkdown(line, isDark)}
          </p>
        );
      }
    }
  });

  flushList("end");
  flushTable("end");

  return <div style={{ color: textColor }}>{elements}</div>;
};

/**
 * Helper to replace **bold**, *italic*, `code`, and inline formatting in strings
 * - Automatically renders missing required fields and warnings in RED
 */
const renderInlineMarkdown = (textStr, isDark) => {
  if (!textStr) return "";

  const textColor = isDark ? "#ffffff" : "#000000";
  const missingRedColor = isDark ? "#f87171" : "#dc2626";

  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(textStr)) !== null) {
    if (match.index > lastIdx) {
      parts.push(textStr.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2);
      const isMissingToken = /missing|required|not provided/i.test(inner) && !/optional/i.test(inner);
      parts.push(
        <strong
          key={match.index}
          style={{
            color: isMissingToken ? missingRedColor : textColor,
            fontWeight: 700,
          }}
        >
          {inner}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.12)" : "#f1f5f9",
            border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.25)" : "#cbd5e1"}`,
            padding: "1px 5px",
            borderRadius: "3px",
            fontSize: "11px",
            color: textColor,
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        >
          {inner}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1);
      const isMissingToken = /not provided|missing/i.test(inner);
      parts.push(
        <em
          key={match.index}
          style={{
            color: isMissingToken ? missingRedColor : textColor,
            fontStyle: "italic",
            fontWeight: isMissingToken ? 600 : 400,
          }}
        >
          {inner}
        </em>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < textStr.length) {
    parts.push(textStr.substring(lastIdx));
  }

  return parts;
};

export default FormattedMarkdown;
