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
  const [activeTicketDraft, setActiveTicketDraft] = useState(null);
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
 
  // Helper to read file as Base64 Data URL preserving exact binary payload and filename
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        let result = reader.result;
        if (result && typeof result === "string" && !result.includes(";name=")) {
          const parts = result.split(";base64,");
          if (parts.length === 2) {
            result = `${parts[0]};name=${encodeURIComponent(file.name)};base64,${parts[1]}`;
          }
        }
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };
 
  // Keep localStorage updated with chat turns
  useEffect(() => {
    try {
      localStorage.setItem("neoai_shared_messages", JSON.stringify(messages));
    } catch (e) {
      console.error("Error persisting NeoAI messages", e);
    }
  }, [messages]);
 
  const askNeoAI = useCallback(async (questionText, attachedFile = null) => {
    const userTypedText = (questionText || "").trim();
    const cleanUserText = userTypedText.replace(/^(?:\[\s*Attached\s+file:[^\]]*\]|Attached\s+file:[^\n]*)\s*/i, "").trim();
 
    let screenshotDataUrl = null;
    let attachedFileName = null;
    if (attachedFile) {
      try {
        attachedFileName = attachedFile.name;
        screenshotDataUrl = await readFileAsDataUrl(attachedFile);
      } catch (fileErr) {
        console.error("Error reading file attachment:", fileErr);
      }
    }
 
    const promptText = cleanUserText || (attachedFileName ? "[Screenshot Attached]" : "");
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
 
    // 1. Add user message
    const userMsg = {
      id: Date.now(),
      sender: "user",
      query: cleanUserText || (attachedFileName ? `[Attached: ${attachedFileName}]` : ""),
      text: cleanUserText || (attachedFileName ? `[Attached: ${attachedFileName}]` : ""),
      attachedFileName: attachedFileName,
      screenshotUrl: screenshotDataUrl,
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
 
      // Format conversation history for LLM context
      const historyList = messages.map((m) => ({
        sender: m.sender,
        text: m.text || m.query || "",
      }));
 
      const res = await sendAIChatQuery({
        username,
        message: cleanUserText || (screenshotDataUrl ? "[Screenshot Attached]" : ""),
        bearerToken: token,
        ticketDraft: activeTicketDraft,
        history: historyList,
        screenshort: screenshotDataUrl,
      });
 
      if (res.ticketDraft !== undefined) {
        setActiveTicketDraft(res.ticketDraft);
      }
 
      const actionType = res.actionType || "query";
 
      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        header: res.success ? "AI Assistant Response" : "Processing Notice",
        text: res.response,
        data: res.data || null,
        count: res.count || 0,
        actionType: actionType,
        ticketDraft: res.ticketDraft,
        error: res.error,
        tags: res.data && res.data.length > 0 ? [`Records: ${res.count}`, `Action: ${actionType}`] : ["LLM-Response"],
        telemetry: `FASTAPI AI ENGINE · ${res.count} MATCHES · TYPE: ${actionType.toUpperCase()}`,
        citation: "Cited from: Neovatic AMS Intelligence System",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
 
      setMessages((prev) => [...prev, botMsg]);
      setActiveTrace((prev) => ({
        ...prev,
        intent: actionType,
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
  }, [messages, activeTicketDraft]);
 
  const resetChat = useCallback(() => {
    setMessages([]);
    setActiveTicketDraft(null);
    setIsThinking(false);
    try {
      localStorage.removeItem("neoai_shared_messages");
    } catch { }
  }, []);
 
  const loadConversation = useCallback((newMessages) => {
    const list = Array.isArray(newMessages) ? newMessages : [];
    setMessages(list);
    setIsThinking(false);
    try {
      localStorage.setItem("neoai_shared_messages", JSON.stringify(list));
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
        loadConversation,
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
      loadConversation: () => { },
      defaultSuggestions: DEFAULT_SUGGESTIONS,
    };
  }
  return context;
};
 
export default NeoAIContext;