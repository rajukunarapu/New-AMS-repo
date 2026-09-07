import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { sendAIChatQuery } from "../Services/AIChatService";

export const DEFAULT_SUGGESTIONS = [
  "Which tickets are high priority?",
  "Show me open incidents for Karamtara",
  "What is our SLA compliance this month?",
  "Has FB60 error happened before?",
];

export const KNOWLEDGE_RESPONSES = {};

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
    intent: "live Ticket LLM Intelligence",
    scope: "authenticated user + customer tenants",
    retrieval: "FastAPI + Gemini LLM engine",
    reranker: "ams_api query filter",
    minEvidence: "0.75",
    route: "Neovatic AMS API",
    writeActions: "routed via FastAPI backend",
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

  const askNeoAI = useCallback(async (questionText) => {
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

    try {
      const userEmailStored = localStorage.getItem("userEmail") || localStorage.getItem("email") || localStorage.getItem("neo_email");
      let username = userEmailStored || "user@neovatic.com";
      if (!userEmailStored) {
        const storedUser = localStorage.getItem("neo_user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            username = parsed.email || parsed.username || username;
          } catch { }
        }
      }
      const token = localStorage.getItem("token") || localStorage.getItem("jwt") || "";

      const res = await sendAIChatQuery({
        username,
        message: q,
        bearerToken: token,
      });

      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        header: res.success ? "AI Assistant Response" : "Processing Notice",
        text: res.response,
        data: res.data || null,
        count: res.count || 0,
        actionType: res.actionType,
        ticketDraft: res.ticketDraft,
        error: res.error,
        tags: res.data && res.data.length > 0 ? [`Records: ${res.count}`, `Action: ${res.actionType}`] : ["LLM-Response"],
        telemetry: `FASTAPI AI ENGINE · ${res.count} MATCHES · TYPE: ${res.actionType.toUpperCase()}`,
        citation: "Cited from: Neovatic AMS Intelligence System",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setActiveTrace((prev) => ({
        ...prev,
        intent: res.actionType || "query",
        lastCall: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      }));
    } catch (err) {
      console.error("Error asking NeoAI:", err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: "bot",
        header: "Connection Error",
        text: "Could not reach the AI Assistant backend. Please verify FastAPI service is running on http://localhost:8000.",
        citation: "System Exception",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [messages]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setIsThinking(false);
    try {
      localStorage.removeItem("neoai_shared_messages");
    } catch { }
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
      askNeoAI: () => { },
      resetChat: () => { },
      defaultSuggestions: DEFAULT_SUGGESTIONS,
    };
  }
  return context;
};

export default NeoAIContext;