import Axios from "axios";

const getBaseUrl = () => {
  return import.meta.env.VITE_AI_CHATBOT_API_URL || "http://localhost:8000/api";
};

/**
 * Send natural language query to FastAPI LLM Chatbot
 * @param {Object} params
 * @param {string} params.username - User email/username
 * @param {string} params.message - Chat query message
 * @param {string} params.bearerToken - AMS JWT Bearer token
 * @param {string} [params.sessionId] - Session ID
 * @param {Object} [params.ticketDraft] - Active ticket draft if any
 * @param {Array} [params.history] - Chat history
 */
export async function sendAIChatQuery({ username, message, bearerToken, sessionId, ticketDraft, history }) {
  try {
    const baseUrl = getBaseUrl();
    const token = bearerToken || localStorage.getItem("token") || localStorage.getItem("jwt") || "";

    const payload = {
      username: username || localStorage.getItem("userEmail") || localStorage.getItem("email") || localStorage.getItem("neo_email") || "user@neovatic.com",
      message: message,
      Bearer: token,
      session_id: sessionId || null,
      ticket_draft: ticketDraft || null,
      history: history || null,
    };

    const response = await Axios.post(`${baseUrl}/chat`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 60000, // 60 second timeout for LLM generation
    });

    return {
      success: response.data?.success ?? true,
      response: response.data?.response || "No response text received.",
      data: response.data?.data || null,
      count: response.data?.count || 0,
      error: response.data?.error || null,
      ticketDraft: response.data?.ticket_draft || null,
      actionType: response.data?.action_type || "query",
    };
  } catch (error) {
    console.error("Error calling AI Chatbot service:", error);

    let errorMsg = "Unable to connect to AI Assistant backend service.";
    if (error.response?.data?.detail) {
      errorMsg = typeof error.response.data.detail === "string" 
        ? error.response.data.detail 
        : JSON.stringify(error.response.data.detail);
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.code === "ECONNABORTED") {
      errorMsg = "AI Assistant timed out while processing your request. Please try again.";
    } else if (error.message && error.message !== "Network Error") {
      errorMsg = error.message;
    }

    return {
      success: false,
      response: `Error: ${errorMsg}`,
      data: null,
      count: 0,
      error: errorMsg,
      ticketDraft: null,
      actionType: "error",
    };
  }
}

/**
 * Predict assignment group for a ticket issue description
 */
export async function routeModule(description) {
  try {
    const baseUrl = getBaseUrl();
    const response = await Axios.post(
      `${baseUrl}/route-module`,
      { description },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.error("Error routing module:", error);
    return { description, assigned_group: "SAP-GENERAL" };
  }
}

/**
 * Create ticket directly via AI chatbot endpoint
 */
export async function createAITicket(ticketPayload, bearerToken) {
  try {
    const baseUrl = getBaseUrl();
    const token = bearerToken || localStorage.getItem("token") || "";
    const response = await Axios.post(`${baseUrl}/tickets/create`, ticketPayload, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating AI ticket:", error);
    throw error;
  }
}
