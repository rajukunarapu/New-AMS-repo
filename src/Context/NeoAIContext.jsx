import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export const DEFAULT_SUGGESTIONS = [
  "Which tickets are at breach risk today?",
  "Has FB60 error F5 507 happened before?",
  "What is our SLA compliance this month?",
  "Show me payroll data for all customers",
];

export const KNOWLEDGE_RESPONSES = {
  "Which tickets are at breach risk today?": {
    header: "Three open tickets are above the 0.80 breach-probability threshold within your customer scope.",
    bullets: [
      "INC-1047 (Cordell Group) — 0.78, resolution SLA 78% consumed, 95 minute stall",
      "INC-1043 (Vantage Foods) — 0.66, P1 with an open transport dependency",
      "INC-1049 (Vantage Foods) — 0.61, no activity for 34 hours",
    ],
    action: "Recommended action: escalate INC-1047 to the duty manager now: the customer communication is Tier 2 and requires a human sender.",
    tags: ["INC-1047", "INC-1043", "INC-1049", "v_sla_compliance"],
    telemetry: "HYBRID RETRIEVAL · 12 CHUNKS · RERANK 0.81 · LLAMA-3.3-70B · R-RAG-V4",
    text: "There are currently 3 tickets near SLA breach threshold. INC-1047 (Cordell Group) is at 78% of resolution SLA, INC-1043 (P1) is at 66%, and INC-1049 is at 61%.",
    citation: "Cited from: Live SLA Monitor & Ticket Status Registry",
  },
  "Has FB60 error F5 507 happened before?": {
    header: 'Error F5 507 ("Document balance not zero in local currency") has occurred 3 times in past incident records.',
    bullets: [
      "INC-0892 (Vantage Foods) — resolved in 2.1 hours via exchange rate precision realignment",
      "INC-0744 (Meridian Steel) — tax difference in foreign currency vendor invoice posting",
      "INC-0610 (Cordell Group) — OB22 parallel currency configuration mismatch",
    ],
    action: "Recommended action: apply SAP note 2187740 and check OB22 currency decimal tolerances.",
    tags: ["INC-0892", "INC-0744", "INC-0610", "KB-5507", "SAP-FICO"],
    telemetry: "HYBRID RETRIEVAL · 18 CHUNKS · RERANK 0.89 · LLAMA-3.3-70B · R-RAG-V4",
    text: "Yes, error F5 507 ('Document balance not zero in local currency') was resolved 3 times in past tickets (INC-0892, INC-0744, INC-0610). Root cause was rounding difference in tax calculation for foreign currency vendor invoices.",
    citation: "Cited from: SAP FICO Knowledge Base · Article KB-5507",
  },
  "What is our SLA compliance this month?": {
    header: "Overall SLA compliance is currently at 94.2% (Target: 95.0%).",
    bullets: [
      "In-scope tickets: 61 closed, 2 breached (96.7% compliance on resolution)",
      "First reply SLA: 34 minutes average (Target: 60 minutes, 100% compliant)",
      "Near-breach tickets: 0 currently exceeding 75% threshold",
    ],
    action: "Recommended action: maintain current escalation cadences on high priority Vantage Foods tickets.",
    tags: ["SLA-Matrix", "Scorecard-Aug2026", "v_sla_compliance"],
    telemetry: "HYBRID RETRIEVAL · 8 CHUNKS · RERANK 0.94 · LLAMA-3.3-70B · R-RAG-V4",
    text: "Current SLA Compliance is at 94.2% (96.7% on closed incidents) across all in-scope tickets, with average first reply of 34 minutes.",
    citation: "Cited from: SLA Framework Scorecard · August 2026",
  },
  "Show me payroll data for all customers": {
    header: "Payroll processing summary across 4 active customer tenants for the current cycle.",
    bullets: [
      "Vantage Foods: 1,420 employees · PY run executed · 0 bank file errors",
      "Meridian Steel: 2,850 employees · Reconciliation approved · On-time delivery",
      "Cordell Group: 980 employees · Shift differential audit completed",
      "Northwind Retail: 3,120 employees · Off-cycle payroll processed",
    ],
    action: "Recommended action: next payroll cycle sign-off scheduled for 28th of this month.",
    tags: ["SAP-HCM", "Payroll-Ops", "Tenant-Audit"],
    telemetry: "HYBRID RETRIEVAL · 14 CHUNKS · RERANK 0.87 · LLAMA-3.3-70B · R-RAG-V4",
    text: "Payroll processing is active across 4 customer tenants (Vantage Foods, Meridian Steel, Cordell Group, Northwind Retail). Current cycle status: 100% completed on time with zero escalations.",
    citation: "Cited from: SAP HCM / Payroll Operations Registry",
  },
};

const NeoAIContext = createContext();

export const NeoAIProvider = ({ children }) => {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("neoai_shared_messages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isThinking, setIsThinking] = useState(false);
  const [activeTrace, setActiveTrace] = useState({
    intent: "knowledge / data lookup",
    scope: "user + role + 4 customers",
    retrieval: "vector + BM25 hybrid",
    reranker: "rerank - top 8",
    minEvidence: "0.62",
    route: "governed private model",
    writeActions: "routed to orchestrator · confirmation required",
    lastCall: "—",
  });

  // Keep localStorage updated with chat turns
  useEffect(() => {
    try {
      localStorage.setItem("neoai_shared_messages", JSON.stringify(messages));
    } catch (e) {
      console.error("Error persisting NeoAI messages", e);
    }
  }, [messages]);

  const askNeoAI = useCallback((questionText) => {
    const q = (questionText || "").trim();
    if (!q) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Add user message
    const userMsg = {
      id: Date.now(),
      sender: "user",
      query: q,
      text: q,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      const match = KNOWLEDGE_RESPONSES[q];
      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        header: match
          ? match.header
          : `Grounded synthesis for query "${q}": All enterprise telemetry and knowledge bases have been queried with role-based filtering applied.`,
        bullets: match
          ? match.bullets
          : [
              `Direct match against indexed database records found relevant telemetry.`,
              `SLA status is within normal operating thresholds with zero unhandled escalations.`,
              `Automated triage verified against current customer authorization scope.`,
            ],
        action: match
          ? match.action
          : `Recommended action: verify ticket status in the live delivery workflow or route to functional lead.`,
        tags: match ? match.tags : ["Auto-Triage", "Telemetry", "Grounded-RAG"],
        telemetry: match
          ? match.telemetry
          : "HYBRID RETRIEVAL · 10 CHUNKS · RERANK 0.84 · LLAMA-3.3-70B · R-RAG-V4",
        text: match
          ? match.text
          : `Analysis for "${q}": All relevant telemetry and knowledge records have been analyzed. System is operating normally within SLA guidelines.`,
        citation: match ? match.citation : "Cited from: NeoAI Multi-Agent Diagnostic Engine",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
      setActiveTrace((prev) => ({
        ...prev,
        lastCall: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      }));
    }, 600);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setIsThinking(false);
    try {
      localStorage.removeItem("neoai_shared_messages");
    } catch {}
  }, []);

  return (
    <NeoAIContext.Provider
      value={{
        messages,
        isThinking,
        activeTrace,
        askNeoAI,
        resetChat,
        defaultSuggestions: DEFAULT_SUGGESTIONS,
      }}
    >
      {children}
    </NeoAIContext.Provider>
  );
};

export const useNeoAI = () => {
  const context = useContext(NeoAIContext);
  if (!context) {
    return {
      messages: [],
      isThinking: false,
      activeTrace: {},
      askNeoAI: () => {},
      resetChat: () => {},
      defaultSuggestions: DEFAULT_SUGGESTIONS,
    };
  }
  return context;
};

export default NeoAIContext;
