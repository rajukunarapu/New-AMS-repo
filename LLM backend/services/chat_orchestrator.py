"""
services/chat_orchestrator.py - Single-Pass Dynamic Semantic Orchestrator & Fast Dispatcher.
 
Directly analyzes user prompts in a single LLM call without hardcoded keyword rules:
1. "CONVERSATIONAL": Generates fresh, dynamic, varied natural replies (greetings, capabilities, chit-chat, advice).
   Zero AMS calls, zero second LLM calls!
2. "CREATE_TICKET": Extracts ticket fields (client, priority, description) and drafts in one pass.
   Zero AMS calls, zero second LLM calls!
3. "QUERY_TICKETS": Formulates structured query filters for lazy AMS retrieval and dynamic narrative synthesis.
"""
 
import re
import json
from typing import Dict, Any, List, Optional
from query_engine import _call_llm
 
 
ORCHESTRATOR_SYSTEM_INSTRUCTION = """You are the enterprise AI Assistant and Master Dispatcher for Neovatic AMS (Application Management Services).
Analyze the user's message semantically and output a single JSON decision with one of three actions:
 
ACTIONS:
1. "CONVERSATIONAL":
   - Use for greetings, small talk, pleasantries, questions about your identity or capabilities, general IT questions, or questions about how AMS works.
   - "conversational_response": Write a fresh, engaging, context-aware, helpful natural response specifically tailored to what the user said.
   - CRITICAL: Never repeat robotic canned templates. Vary your vocabulary and phrasing naturally each time. Keep within 1-3 sentences.
 
2. "CREATE_TICKET":
   - Use when the user describes a technical problem, transaction dump, system failure, bug, access request, or asks to raise/open/log a ticket, or attached an error screenshot.
   - "ticket_fields": {
       "clientName": "<client name mentioned or matched, or null>",
       "priority": "<High|Medium|Low based on urgency/impact, default Medium>",
       "descriptionofTicket": "<clear technical summary of the reported issue>"
     }
   - "dynamic_note": "<A 1-sentence friendly, varied dynamic confirmation that the issue has been captured in a draft>"
 
3. "QUERY_TICKETS":
   - Use when the user wants to search, inspect, filter, count, list, or check the status/metrics of existing tickets.
   - "query_plan": {
       "client": "<client name e.g. ATG, Karamtara, or null>",
       "status": "<Open|Closed|Pending|In Progress or null>",
       "priority": "<High|Medium|Low or null>",
       "group_or_module": "<ONLY if user specifically names a known functional group like SAP-FICO, SAP-MM, SAP-SD, SAP-BASIS, SAP-ABAP, RPA; for topics, technologies, or features like Joule, invoice, PO, leave this null and put in semantic_search>",
       "ticket_no": "<ticket ID e.g. ATG2608001, or null>",
       "aggregation": "<count|list|detail or null>",
       "semantic_search": "<search terms or feature keywords e.g. Joule, invoice, dump>"
     }
 
OUTPUT FORMAT (STRICT JSON ONLY):
{
  "action": "CONVERSATIONAL" | "CREATE_TICKET" | "QUERY_TICKETS",
  "conversational_response": "<only if CONVERSATIONAL>",
  "ticket_fields": { ... },
  "dynamic_note": "<only if CREATE_TICKET>",
  "query_plan": { ... }
}
"""
 
 
def _sanitize_history_context(history: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, str]]:
    """Sanitizes chat history to the last 2 turns (max 200 chars per message), stripping heavy Base64 data."""
    if not history:
        return []
    cleaned = []
    for item in history[-4:]:
        if isinstance(item, dict):
            text = str(item.get("text") or item.get("content") or item.get("query") or "")
            text = re.sub(r'<img[^>]*src="data:image[^>]*>', '[Image]', text, flags=re.IGNORECASE)
            text = re.sub(r'data:image\/[^;]+;base64,[A-Za-z0-9+/=]+', '[Attached Image]', text)
            if len(text) > 200:
                text = text[:200] + "..."
            role = item.get("sender") or item.get("role") or "user"
            cleaned.append({"role": role, "text": text})
    return cleaned
 
 
async def run_chat_orchestrator(
    user_message: str,
    history: Optional[List[Dict[str, Any]]] = None,
    incoming_screenshot: Optional[str] = None,
    known_clients: Optional[List[str]] = None,
    customer_client: Optional[str] = None,
    user_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes single-pass semantic understanding on the user's message using the primary LLM.
    Returns a structured dictionary with:
    - action: "CONVERSATIONAL" | "CREATE_TICKET" | "QUERY_TICKETS"
    - conversational_response: dynamic text if CONVERSATIONAL
    - ticket_fields: dict if CREATE_TICKET
    - dynamic_note: text if CREATE_TICKET
    - query_plan: dict if QUERY_TICKETS
    """
    clean_msg = str(user_message or "").strip()
    msg_lower = clean_msg.lower()
    has_screenshot = bool(incoming_screenshot and str(incoming_screenshot).strip().lower() not in ["none", "null", ""])
 
    user_payload_dict = {
        "user_message": clean_msg if clean_msg else "(User attached an image without text)" if has_screenshot else "Hello",
        "has_screenshot": has_screenshot,
        "recent_conversation": _sanitize_history_context(history)
    }
 
    if customer_client:
        user_payload_dict["customer_account_organization"] = customer_client
 
    if known_clients:
        user_payload_dict["reference_client_names"] = known_clients[:30]
 
    user_payload = json.dumps(user_payload_dict, ensure_ascii=False)
 
    system_instruction = ORCHESTRATOR_SYSTEM_INSTRUCTION
    if customer_client:
        system_instruction += f"""
 
STRICT CUSTOMER ISOLATION POLICY:
- The user is an external client user associated EXCLUSIVELY with organization: '{customer_client}' (logged in as '{user_email or "customer"}').
- CLIENT RESTRICTION: The client/company name is strictly locked to '{customer_client}'. The user CANNOT change or switch it to another company.
- TICKET ACCESS RESTRICTION: The user can ONLY create tickets for '{customer_client}', and can ONLY view/fetch tickets for '{customer_client}'.
- CRITICAL BEHAVIOR FOR CLIENT NAME QUESTIONS & ATTEMPTS TO SWITCH COMPANIES:
  If the user asks why the client name is not changing, asks to change the client name, enters an alternate company name (such as 'AAB', 'Dixon', 'ATG', etc.), asks why it defaulted to '{customer_client}', or asks about other companies' tickets:
  1. Action MUST be "CONVERSATIONAL".
  2. In "conversational_response", answer clearly, politely, and firmly:
     Explain that because their login account is registered under '{customer_client}', all ticket creation and ticket searches are restricted strictly to '{customer_client}' for security and enterprise data isolation. State clearly that the client name cannot be modified to another organization and they cannot access or create tickets for other companies.
  3. CRITICAL: NEVER apologize for using '{customer_client}'.
  4. CRITICAL: NEVER say you will change or update the client name.
  5. CRITICAL: NEVER ask the user what other client name they want.
"""
 
    try:
        raw_res = await _call_llm(
            prompt_text=user_payload,
            system_instruction=system_instruction,
            json_response=True,
            temperature=0.7,
            max_tokens=400
        )
 
        if raw_res:
            # 1. Try robust JSON extraction via regex
            parsed = None
            json_match = re.search(r'\{.*\}', raw_res, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                except Exception:
                    pass
 
            if not parsed:
                res_clean = re.sub(r'```json\s*', '', raw_res)
                res_clean = re.sub(r'```\s*$', '', res_clean).strip()
                try:
                    parsed = json.loads(res_clean)
                except Exception:
                    pass
 
            if isinstance(parsed, dict):
                # Infer action if omitted by model
                if "action" not in parsed:
                    if "query_plan" in parsed and parsed["query_plan"]:
                        parsed["action"] = "QUERY_TICKETS"
                    elif "ticket_fields" in parsed and parsed["ticket_fields"]:
                        parsed["action"] = "CREATE_TICKET"
                    elif "conversational_response" in parsed:
                        parsed["action"] = "CONVERSATIONAL"
 
                # Check if action is present
                if parsed.get("action") in ["QUERY_TICKETS", "CREATE_TICKET", "CONVERSATIONAL"]:
                    if has_screenshot and parsed.get("action") == "CONVERSATIONAL":
                        parsed["action"] = "CREATE_TICKET"
                        parsed["ticket_fields"] = parsed.get("ticket_fields") or {
                            "clientName": None,
                            "priority": "Medium",
                            "descriptionofTicket": clean_msg if clean_msg else "Issue observed in attached screenshot"
                        }
                        parsed["dynamic_note"] = "I've drafted a support ticket with your attached screenshot. Please verify the details below."
                    return parsed
 
    except Exception as err:
        print(f"[ChatOrchestrator] Orchestration parse error: {err}")
 
    # Fallback Handling: NEVER swallow a query as a greeting!
    if has_screenshot:
        return {
            "action": "CREATE_TICKET",
            "ticket_fields": {
                "clientName": None,
                "priority": "Medium",
                "descriptionofTicket": clean_msg if clean_msg else "Issue reported with screenshot attachment"
            },
            "dynamic_note": "I've started a new ticket draft with your attached screenshot. Please check the details below."
        }
 
    # Detect if user message is querying tickets
    is_query = bool(re.search(r'\b(?:tickets?|issues?|show|find|list|count|status|how many|records?|pending|breached)\b', msg_lower))
    if is_query:
        detected_c = None
        if known_clients:
            for c in known_clients:
                if c.lower() in msg_lower:
                    detected_c = c
                    break
        detected_prio = None
        if "high" in msg_lower: detected_prio = "High"
        elif "low" in msg_lower: detected_prio = "Low"
        elif "medium" in msg_lower: detected_prio = "Medium"
 
        return {
            "action": "QUERY_TICKETS",
            "query_plan": {
                "client": detected_c,
                "status": "Open" if "open" in msg_lower else ("Closed" if "closed" in msg_lower else None),
                "priority": detected_prio,
                "group_or_module": None,
                "ticket_no": None,
                "aggregation": "count" if any(w in msg_lower for w in ["how many", "count"]) else "list",
                "semantic_search": clean_msg
            }
        }
 
    # Detect if user message is reporting an issue / creating a ticket
    is_create = bool(re.search(r'\b(?:create|raise|open|log|dump|crash|error|failed|down|bug|not working)\b', msg_lower))
    if is_create:
        return {
            "action": "CREATE_TICKET",
            "ticket_fields": {
                "clientName": None,
                "priority": "High" if "high" in msg_lower else "Medium",
                "descriptionofTicket": clean_msg
            },
            "dynamic_note": "I've started a new ticket draft based on your message. Please check the details below."
        }
 
    import random
    varied_greetings = [
        "Hello! I am your AMS AI Assistant. How can I help you manage tickets or check system metrics today?",
        "Hi there! Welcome to AMS Intelligence. Let me know if you need help finding tickets, tracking SLAs, or logging an issue.",
        "Greetings! How can I assist you with your support operations today?",
        "Hello! Feel free to ask about ticket statuses, assignment metrics, or let me know if you'd like to draft a new ticket."
    ]
    return {
        "action": "CONVERSATIONAL",
        "conversational_response": random.choice(varied_greetings)
    }
 
 
DYNAMIC_SYNTHESIZER_PROMPT = """You are the Neovatic AMS Intelligence Assistant.
Write a clear, concise, natural, and business-friendly 1-2 sentence response summarizing the search/ticket results for the user.
 
CRITICAL RULES:
1. ALWAYS answer the user's question directly and concisely in natural language.
2. Never repeat identical boilerplate or robotic phrases. Vary your sentence structure and wording naturally.
3. Mention key details naturally (e.g. client, matching count, status, or top module).
4. Strictly max 2 sentences.
"""
 
 
async def generate_dynamic_query_narrative(
    user_question: str,
    query_plan: Dict[str, Any],
    count: int,
    summary_stats: Dict[str, Any],
    sample_records: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Generates a fresh, dynamic, and non-repetitive narrative summary for ticket query results
    using low token usage (max 180 completion tokens).
    """
    payload = {
        "user_question": user_question,
        "total_matching_count": count,
        "filter_applied": {
            "client": query_plan.get("client"),
            "status": query_plan.get("status"),
            "priority": query_plan.get("priority"),
            "group_or_module": query_plan.get("group_or_module"),
            "ticket_no": query_plan.get("ticket_no")
        },
        "top_groups": list((summary_stats.get("group_stats") or {}).items())[:3] if summary_stats else [],
        "sample_tickets": [
            {
                "id": r.get("ticketNo") or r.get("ticketId"),
                "client": r.get("clientName"),
                "status": r.get("ticketStatus") or r.get("status"),
                "priority": r.get("priority")
            }
            for r in (sample_records or [])[:3]
        ]
    }
 
    try:
        narrative = await _call_llm(
            prompt_text=json.dumps(payload, ensure_ascii=False),
            system_instruction=DYNAMIC_SYNTHESIZER_PROMPT,
            json_response=False,
            temperature=0.6,
            max_tokens=350
        )
        if narrative and len(narrative.strip()) >= 15:
            return narrative.strip()
    except Exception as err:
        print(f"[ChatOrchestrator] Dynamic narrative generation error: {err}")
 
    # Fallback description if LLM is unreachable or truncated
    client_str = f" for client **{query_plan.get('client')}**" if query_plan.get("client") else ""
    status_str = f" with status **{query_plan.get('status')}**" if query_plan.get("status") else ""
    return f"There are **{count}** ticket(s) matching your request{client_str}{status_str}."
 
 