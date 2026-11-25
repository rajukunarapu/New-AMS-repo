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
from query_engine import _call_llm, requested_ticket_status
from services.classification_config import extract_requested_priorities
from services.guardrails import check_fast_guardrail, verify_and_ground_ticket_narrative


ORCHESTRATOR_SYSTEM_INSTRUCTION = """You are the enterprise AI Assistant and Master Dispatcher for Neovatic AMS (Application Management Services).
Analyze the user's message semantically and output a single JSON decision with one of four actions:

ACTIONS:
1. "CONVERSATIONAL":
   - Use for greetings, pleasantries, questions about your identity, capabilities, or how Neovatic AMS works.
   - "conversational_response": Write a fresh, engaging, context-aware, helpful natural response specifically tailored to what the user said.
   - CRITICAL: Never repeat robotic canned templates. Vary your vocabulary and phrasing naturally each time. Keep within 1-3 sentences.

2. "OUT_OF_DOMAIN":
   - Use when the user asks about topics outside Neovatic AMS support operations:
     * General world knowledge (e.g., weather, sports, news, cooking, travel, celebrities).
     * General programming or code generation requests (e.g., "write python code for...", "build a script to...", coding interview algorithms) UNLESS they are reporting a real bug/crash in their system code to be logged as a ticket.
     * Non-work casual entertainment or personal advice.
   - "conversational_response": A warm, polite, and engaging deflection. Politely state that you are specialized as the Neovatic AMS assistant for support tickets and system operations. Proactively guide/ask them how you can help with their AMS tickets, SLA metrics, or logging an issue.
   - CRITICAL: Keep it polite and conversational—do not be harsh or robotic. NEVER generate generic code snippets, weather reports, or general essays.

3. "CREATE_TICKET":
   - Use when the user describes a technical problem, transaction dump, system failure, bug, access request, development or enhancement request, S PO request, or asks to raise/open/log a ticket, or attached an error screenshot.
   - "ticket_fields": {
       "clientName": "<client name mentioned or matched, or null>",
       "priority": "<Strictly follow Priority Matrix: Change Request is ONLY Low (P4); Incident is Very High (P1), High (P2), or Medium (P3) (no Low); Service request / S PO is High (P2), Medium (P3), or Low (P4) (no Very High)>",
       "typeofticket": "<Incident|Change Request|Service request|S PO based on user intent>",
       "descriptionofTicket": "<clear technical summary of the reported issue>"
     }
   - "dynamic_note": "<A 1-sentence friendly, varied dynamic confirmation that the issue has been captured in a draft>"

4. "QUERY_TICKETS":
   - Use when the user wants to search, inspect, filter, count, list, summarize, or check the status/metrics of existing tickets.
   - "query_plan": {
       "client": "<client name e.g. ATG, Karamtara, or null>",
       "status": "<Open|Closed|Pending|In Progress or null>",
       "priority": "<High|Medium|Low or null>",
       "group_or_module": "<ONLY if user specifically names a known functional group like SAP-FICO, SAP-MM, SAP-SD, SAP-BASIS, SAP-ABAP, RPA; for explicit description mentions or topics like Joule, invoice, or PO, leave this null and put the term in semantic_search>",
       "ticket_no": "<ticket ID e.g. ATG2608001, or null>",
       "aggregation": "<count|list|detail|summary or null>",
       "limit": <integer limit when user asks for a specific count e.g. 'last 5', 'top 10', 'first 3', or null>,
       "semantic_search": "<search terms or feature keywords e.g. Joule, invoice, dump; leave null if user simply wants to summarize/list recent tickets>"
     }

LIMIT & RECENT TICKETS INSTRUCTIONS:
- When user asks for recent, last, latest, top, or first N tickets (e.g. 'summarize the last 5 tickets', 'show latest 10 tickets'):
  * Set "limit": N (e.g. 5).
  * If the user asked to "summarize" or for a "summary", set "aggregation": "summary".
  * Do NOT put "summarize", "last 5", or "tickets" in "semantic_search" (leave semantic_search null unless they filter by a specific feature/topic like 'last 5 invoice tickets').

FOLLOW-UP QUERY RESOLUTION & CONTEXT CONTINUITY:
- If the user's message is a follow-up query referring to previous results (e.g. using 'these', 'those', 'them', 'which of them', 'filter by', 'only open', 'show open ones', 'how many are high priority', 'what about high priority'):
  1. Inspect the recent conversation to find established query context (e.g., client name, module, or status).
  2. Inherit the prior 'client' or other relevant scope into 'query_plan' unless the user explicitly introduces a new client or changes scope.
  3. Combine the new constraint (e.g., priority="High", status="Open") with the inherited scope.
- If the message is a new standalone question or explicitly specifies its own client, do NOT inherit old constraints.


TICKET ATTRIBUTE & FIELD INQUIRIES (CRITICAL):
- When the user asks for specific attributes, details, or fields of a ticket:
  * e.g., 'who reported that', 'who is the reporter', 'who is assigned to it', 'what is the description', 'when was it logged', 'which priority is it', 'what is the status of it'.
  * ACTION MUST BE: "QUERY_TICKETS"
  * In 'query_plan':
    - If referring to a ticket from previous turns with pronouns ('that', 'it', 'this ticket', 'the ticket') or context, resolve and set "ticket_no" to that referenced ticket ID (e.g. 'Vec2611112').
    - Set "aggregation": "detail"
  * NEVER classify inquiries about ticket fields or attributes as "CONVERSATIONAL".

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "action": "CONVERSATIONAL" | "OUT_OF_DOMAIN" | "CREATE_TICKET" | "QUERY_TICKETS",
  "conversational_response": "<only if CONVERSATIONAL or OUT_OF_DOMAIN>",
  "ticket_fields": { ... },
  "dynamic_note": "<only if CREATE_TICKET>",
  "query_plan": { ... }
}
"""
 
 
def sanitize_and_prune_history(
    history: Optional[List[Dict[str, Any]]],
    max_turns: int = 6,
    max_char_len: int = 400
) -> List[Dict[str, Any]]:
    """
    Sanitizes conversation history for semantic efficiency, speed, and hallucination prevention:
    1. Keeps only the last `max_turns` entries (e.g. 6 entries = last 3 user/assistant turns).
    2. Strips out Base64 images, inline data URIs, and raw HTML img tags.
    3. Truncates massive markdown tables, ticket record dumps, and raw JSON arrays from previous turns 
       so LLM prompts stay focused on conversational intent rather than past raw data dumps.
    """
    if not history:
        return []

    cleaned = []
    for item in history[-max_turns:]:
        if not isinstance(item, dict):
            continue

        raw_text = str(
            item.get("text")
            or item.get("content")
            or item.get("query")
            or item.get("message")
            or ""
        )

        # 1. Strip heavy Base64 image payloads & data URIs
        clean_text = re.sub(r'data:image/[^;]+;base64,[A-Za-z0-9+/=]+', '[Attached Image]', raw_text)
        clean_text = re.sub(r'<img[^>]*src="data:image[^>]*>', '[Attached Image]', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'!\[.*?\]\(data:image/.*?\)', '[Attached Image]', clean_text)

        # 2. Strip large markdown tables or raw JSON dumps in assistant replies
        if "|" in clean_text and clean_text.count("\n") > 4:
            lines = clean_text.splitlines()
            table_lines = [l for l in lines if l.strip().startswith("|")]
            if len(table_lines) > 3:
                non_table = [l for l in lines if not l.strip().startswith("|")]
                summary_lead = "\n".join(non_table[:2]) if non_table else lines[0]
                clean_text = f"{summary_lead}\n[Table with {len(table_lines)} ticket records omitted for brevity]"

        # 3. Truncate very long prose
        if len(clean_text) > max_char_len:
            clean_text = clean_text[:max_char_len] + "..."

        role = item.get("sender") or item.get("role") or "user"
        cleaned_entry = dict(item)
        cleaned_entry["text"] = clean_text
        if "content" in cleaned_entry:
            cleaned_entry["content"] = clean_text
        if "query" in cleaned_entry:
            cleaned_entry["query"] = clean_text
        cleaned_entry["role"] = role
        cleaned.append(cleaned_entry)

    return cleaned


def _sanitize_history_context(history: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, str]]:
    """Sanitizes chat history to the last 4 turns (max 250 chars per message), stripping heavy Base64 data."""
    if not history:
        return []
    cleaned_items = sanitize_and_prune_history(history, max_turns=4, max_char_len=250)
    result = []
    for item in cleaned_items:
        role = item.get("sender") or item.get("role") or "user"
        text = str(item.get("text") or item.get("content") or "")
        result.append({"role": role, "text": text})
    return result



_CREATE_REQUEST = re.compile(
    r"^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?|"
    r"i\s+(?:(?:want|need|would like)\s+to\s+))?"
    r"(?:create|raise|open|log|file|submit|make)\s+"
    r"(?:(?:an?|the|new|support|very|high|medium|low|critical|priority|p[1-4])\s+)*"
    r"(?:ticket|incident|issue|request)\b"
)


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

    # Fast Guardrail Pre-Check (Zero Latency & Zero Token Cost)
    if not has_screenshot:
        is_ood, ood_reply = check_fast_guardrail(clean_msg)
        if is_ood and ood_reply:
            return {
                "action": "OUT_OF_DOMAIN",
                "conversational_response": ood_reply
            }

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
                if parsed.get("action") in ["QUERY_TICKETS", "CREATE_TICKET", "CONVERSATIONAL", "OUT_OF_DOMAIN"]:
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
 
    # Resolve explicit requests before broad ticket-search cues.
    priorities = extract_requested_priorities(clean_msg, query_filter=True)
    if len(priorities) > 1:
        return {
            "action": "CONVERSATIONAL",
            "conversational_response": "Which priority should I use?",
        }
    detected_prio = next(iter(priorities), None)
    if has_screenshot:
        return {
            "action": "CREATE_TICKET",
            "ticket_fields": {
                "clientName": None,
                "priority": detected_prio or "Medium",
                "descriptionofTicket": clean_msg or "Issue reported with screenshot attachment",
            },
            "dynamic_note": "I've started a new ticket draft with your attached screenshot. Please check the details below.",
        }

    explicit_create = bool(_CREATE_REQUEST.match(msg_lower))
    mixed_request = re.search(
        r"(?:[.;,]\s*|\b(?:and|then|but)\s+)(?:please\s+)?(?:show|list|find|search|count|how many)\b",
        msg_lower,
    )
    if (explicit_create and mixed_request) or re.fullmatch(r"(?:open\s+)?ticket[?.!]*", msg_lower):
        return {
            "action": "CONVERSATIONAL",
            "conversational_response": "Do you want to create a new ticket or look up existing tickets?",
        }

    # Detect ticket ID in current message or in recent conversation history
    ticket_id_pattern = re.compile(r'\b[A-Za-z]{2,6}\d{4,8}\b')
    detected_ticket_no = None
    m_tid = ticket_id_pattern.search(clean_msg)
    if m_tid:
        detected_ticket_no = m_tid.group(0)
    elif history:
        for h in reversed(history[-6:]):
            h_text = str(h.get("text") or h.get("content") or "")
            m_hist = ticket_id_pattern.search(h_text)
            if m_hist:
                detected_ticket_no = m_hist.group(0)
                break

    # Detect if user message is querying tickets, follow-up filter, or ticket attributes
    is_query = bool(re.search(r'\b(?:tickets?|issues?|show|find|list|count|status|how many|records?|pending|breached)\b', msg_lower))
    is_follow_up_filter = bool(re.search(r'\b(?:these|those|them|only\s+open|only\s+closed|only\s+high|which\s+(?:ones|are)|what\s+about)\b', msg_lower))
    is_ticket_attr_query = bool(re.search(
        r'\b(?:who\s+(?:is\s+)?(?:reported|assigned|created|raised)|reported\s+by|reporter|assignee|assigned\s+to|assigned\s+group|which\s+priority|what\s+priority|priority\s+of|what\s+is\s+(?:the\s+)?(?:status|description|error|date|time|priority|group|module)|description\s+of|when\s+(?:was\s+it|is\s+it)\s+(?:reported|created|logged)|details?\s+(?:of|for|about)?)\b',
        msg_lower
    ))
    is_ticket_ref_followup = bool(detected_ticket_no and (
        is_ticket_attr_query or
        re.search(r'\b(?:who|what|when|which|how|status|priority|reporter|reported|assigned|assignee|description|details|module|group|it|that|this)\b', msg_lower)
    ))

    if not explicit_create and (
        is_query or is_follow_up_filter or is_ticket_attr_query or is_ticket_ref_followup
    ):
        detected_c = None
        if known_clients:
            for c in known_clients:
                if c.lower() in msg_lower:
                    detected_c = c
                    break
        # If client not mentioned and this is a follow-up, inherit client from recent history
        if not detected_c and history:
            for h in reversed(history[-4:]):
                h_text = str(h.get("text") or h.get("content") or "").lower()
                for c in (known_clients or []):
                    if c.lower() in h_text:
                        detected_c = c
                        break
                if detected_c:
                    break
        # Limit detection
        lim_m = re.search(r'\b(?:top|first|last|latest|recent|most\s+recent|limit)\s*(\d{1,3})\b', msg_lower)
        if not lim_m:
            lim_m = re.search(r'\b(\d{1,3})\s*(?:latest|recent|last|top|first)?\s*tickets?\b', msg_lower)
        detected_limit = int(lim_m.group(1)) if lim_m else None

        is_summary = bool(re.search(r'\b(?:summariz|summary|overview)\b', msg_lower))

        # Clear structural words from semantic search if it's purely a limit or summary request
        clean_sem_search = clean_msg
        if is_summary or detected_limit:
            stop_words = {"can", "you", "please", "summarize", "summary", "summaries", "the", "last", "latest", "recent", "top", "first", "tickets", "ticket", "give", "me", "show", "of"}
            rem_words = [w for w in re.findall(r'\w+', clean_sem_search.lower()) if len(w) >= 2 and w not in stop_words and not w.isdigit()]
            if not rem_words:
                clean_sem_search = None

        agg = "detail" if (detected_ticket_no or is_ticket_attr_query) else ("summary" if is_summary else ("count" if any(w in msg_lower for w in ["how many", "count"]) else "list"))

        return {
            "action": "QUERY_TICKETS",
            "query_plan": {
                "client": detected_c,
                "status": requested_ticket_status(clean_msg),
                "priority": detected_prio,
                "group_or_module": None,
                "ticket_no": detected_ticket_no,
                "aggregation": agg,
                "limit": detected_limit,
                "sort": {"field": "createddate", "direction": "desc"} if any(w in msg_lower for w in ["last", "latest", "recent"]) else None,
                "semantic_search": clean_sem_search
            }
        }


 
    # Detect if user message is reporting an issue / requesting change / creating a ticket
    is_create = bool(re.search(r'\b(?:create|raise|open|log|dump|crash|error|failed|down|bug|not working|additional\s+field|new\s+report|develop\s+new|enhancement|change\s*request|access\s+request|password\s+reset|s\s*po)\b', msg_lower))
    if explicit_create or is_create:
        from services.classification_service import TicketClassifier
        fallback_cls = TicketClassifier._heuristic_semantic_classification(clean_msg)
        return {
            "action": "CREATE_TICKET",
            "ticket_fields": {
                "clientName": None,
                "priority": detected_prio or "Medium",
                "typeofticket": fallback_cls.get("ticketType", "Incident"),
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
Write a clear, concise, natural, and business-friendly response summarizing the search/ticket results for the user.

CRITICAL RULES:
1. ALWAYS answer the user's question directly and concisely in natural language.
2. If the user asked to SUMMARIZE tickets (e.g. "summarize the last 5 tickets", "summary of tickets", or aggregation="summary"):
   - Provide a 1-line introductory sentence (e.g., "Here is a summary of the requested tickets:").
   - Follow with a concise, factual bullet point for each ticket in sample_tickets:
     * **{id}** (*{client}*) — `{status}` | `{priority}`: Brief summary of issue/description.
   - Strictly summarize ONLY the tickets present in sample_tickets.
3. If the user is asking a standard count, status, or search question (not a bulleted summary):
   - Mention key details naturally (e.g. client, matching count, status, or top module).
   - Strictly max 2 sentences.
4. STRICT GROUNDING & ZERO HALLUCINATION:
   - Only cite ticket IDs, counts, clients, and statuses that are explicitly provided in the payload.
   - NEVER invent or hallucinate ticket numbers that do not appear in sample_tickets.
   - If total_matching_count is 0, state clearly that no matching tickets were found. NEVER claim tickets exist when count is 0.
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
        "top_groups": (summary_stats.get("group_stats") or [])[:3] if summary_stats else [],
        "sample_tickets": [
            {
                "id": r.get("ticketNo") or r.get("ticketId"),
                "client": r.get("clientName"),
                "status": r.get("ticketStatus") or r.get("status"),
                "priority": r.get("priority"),
                "type": r.get("typeofticket") or r.get("type"),
                "reported_by": r.get("reportedby") or r.get("reported_by"),
                "reported_on": f"{r.get('reportedon', '')} {r.get('reportedontime', '')}".strip(),
                "assigned_group": r.get("assigntogroup") or r.get("assigned_to"),
                "description": r.get("descriptionofTicket") or r.get("description")
            }
            for r in (sample_records or [])[:10]
        ]
    }
 
    try:
        narrative = await _call_llm(
            prompt_text=json.dumps(payload, ensure_ascii=False),
            system_instruction=DYNAMIC_SYNTHESIZER_PROMPT,
            json_response=False,
            temperature=0.6,
            max_tokens=450
        )
        if narrative and len(narrative.strip()) >= 15:
            return verify_and_ground_ticket_narrative(narrative.strip(), count, sample_records, query_plan)
    except Exception as err:
        print(f"[ChatOrchestrator] Dynamic narrative generation error: {err}")

    # Fallback description if LLM is unreachable or truncated
    q_lower = user_question.lower()
    is_summary_req = any(w in q_lower for w in ["summarize", "summary", "overview"]) or query_plan.get("aggregation") == "summary"

    if is_summary_req and sample_records:
        lines = [f"Here is a summary of the {len(sample_records)} ticket(s):"]
        for rec in sample_records:
            t_id = rec.get("ticketNo") or rec.get("ticketId") or "Ticket"
            t_client = rec.get("clientName") or ""
            t_status = rec.get("ticketStatus") or rec.get("status") or "Open"
            t_prio = rec.get("priority") or "Medium"
            t_desc = rec.get("descriptionofTicket") or rec.get("description") or "No description provided"
            if len(t_desc) > 130:
                t_desc = t_desc[:127] + "..."
            client_prefix = f"(*{t_client}*) " if t_client else ""
            lines.append(f"- **{t_id}** {client_prefix}— `{t_status}` | `{t_prio}`: {t_desc}")
        fallback_text = "\n".join(lines)
    elif sample_records and len(sample_records) == 1:
        rec = sample_records[0]
        t_id = rec.get("ticketNo") or rec.get("ticketId") or "the ticket"
        t_client = rec.get("clientName") or query_plan.get("client") or ""
        t_status = rec.get("ticketStatus") or rec.get("status") or "Open"
        t_prio = rec.get("priority") or "Normal"
        t_reporter = rec.get("reportedby") or rec.get("reported_by")
        t_group = rec.get("assigntogroup") or rec.get("assigned_to") or rec.get("module")
        t_desc = rec.get("descriptionofTicket") or rec.get("description")
        t_date = f"{rec.get('reportedon', '')} {rec.get('reportedontime', '')}".strip()

        q_lower = user_question.lower()
        if any(w in q_lower for w in ["assign", "assigned", "assignee", "group", "module", "team"]):
            fallback_text = f"Ticket **{t_id}** is assigned to **{t_group or 'unassigned'}** with status **{t_status}**."
        elif any(w in q_lower for w in ["reporter", "reported", "created by", "raised by", "who reported", "who created", "who raised", "who is reported"]):
            if t_reporter:
                fallback_text = f"Ticket **{t_id}** was reported by **{t_reporter}**" + (f" on `{t_date}`." if t_date else ".")
            else:
                fallback_text = f"Reporter information for ticket **{t_id}** is not recorded."
        elif "who" in q_lower:
            fallback_text = f"Ticket **{t_id}** was reported by **{t_reporter or 'unknown'}** and is assigned to **{t_group or 'unassigned'}**."
        elif any(w in q_lower for w in ["priority", "prio"]):
            fallback_text = f"The ticket **{t_id}**" + (f" for **{t_client}**" if t_client else "") + f" has a priority of **{t_prio}**."
        elif any(w in q_lower for w in ["desc", "description", "issue", "problem"]):
            fallback_text = f"The description for ticket **{t_id}** is: {t_desc}"
        elif any(w in q_lower for w in ["when", "date", "time"]):
            fallback_text = f"Ticket **{t_id}** was reported on `{t_date or 'an unrecorded date'}`."
        else:
            fallback_text = f"Ticket **{t_id}**" + (f" for **{t_client}**" if t_client else "") + f" is currently **{t_status}** with priority **{t_prio}**."
    else:
        client_str = f" for client **{query_plan.get('client')}**" if query_plan.get("client") else ""
        status_str = f" with status **{query_plan.get('status')}**" if query_plan.get("status") else ""
        fallback_text = f"There are **{count}** ticket(s) matching your request{client_str}{status_str}."

    return verify_and_ground_ticket_narrative(fallback_text, count, sample_records, query_plan)
