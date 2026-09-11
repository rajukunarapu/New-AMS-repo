"""
services/ticket_creator_service.py - Manages the Ticket Creation conversational flow.

Handles:
- Dynamic field extraction from natural-language prompts
- In-memory session tracking for ticket drafts
- Missing fields detection & markdown preview formatting
- Confirmation intent understanding without hardcoded keywords
- Submission to AMS /api/Ticket/CreateTicket
"""

import json
import re
import threading
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from ams_api import AMSApi
from Module_Router import assign_group, GROUPS
from query_engine import _call_llm
from models.schemas import VALID_TICKET_TYPES, normalize_ticket_type


SCHEMA_FIELDS = [
    "clientName",
    "ams",
    "typeofticket",
    "priority",
    "reportedon",
    "reportedontime",
    "reportedby",
    "descriptionofTicket",
    "screenshort",
    "remarks",
    "assigntogroup"
]

CORE_REQUIRED_FIELDS = [
    "clientName",
    "descriptionofTicket",
    "priority"
]


class TicketSessionManager:
    """Thread-safe in-memory session store for active ticket creation drafts."""
    _sessions: Dict[str, Dict[str, Any]] = {}
    _lock = threading.Lock()

    @classmethod
    def get_session_key(cls, username: Optional[str], session_id: Optional[str] = None) -> str:
        if session_id and session_id.strip():
            return f"session:{session_id.strip()}"
        user_clean = (username or "anonymous").strip().lower()
        return f"user:{user_clean}"

    @classmethod
    def get_draft(cls, key: str) -> Optional[Dict[str, Any]]:
        with cls._lock:
            return cls._sessions.get(key)

    @classmethod
    def set_draft(cls, key: str, draft: Dict[str, Any]):
        with cls._lock:
            cls._sessions[key] = draft

    @classmethod
    def clear_draft(cls, key: str):
        with cls._lock:
            if key in cls._sessions:
                del cls._sessions[key]


def is_capability_or_info_question(prompt: str) -> bool:
    """
    Returns True if the prompt is an informational question asking about ticket creation capabilities
    without providing specific ticket details (e.g. 'can you create ticket', 'how to create a ticket').
    """
    p_lower = prompt.lower().strip()
    p_clean = re.sub(r'[?!.]+$', '', p_lower).strip()

    capability_exact_patterns = [
        r'^(?:can|could|would|do|are|is\s+it\s+possible\s+to|how\s+to|how\s+can\s+i|how\s+do\s+i)\s+(?:you|we|i)?\s*(?:able\s+to\s+)?(?:create|raise|open|log|make|file|generate)\s+(?:an?\s+)?tickets?$',
        r'^can\s+you\s+create\s+tickets?$',
        r'^can\s+you\s+create\s+a?\s*ticket\s*(?:for\s+me)?$',
        r'^can\s+you\s+raise\s+a?\s*ticket\s*(?:for\s+me)?$',
        r'^how\s+(?:do|can)\s+i\s+(?:create|raise|open)\s+a?\s*ticket$',
        r'^how\s+to\s+(?:create|raise|open)\s+a?\s*ticket$',
        r'^is\s+it\s+possible\s+to\s+(?:create|raise|open)\s+a?\s*ticket$',
        r'^do\s+you\s+create\s+tickets?$',
        r'^are\s+you\s+able\s+to\s+create\s+tickets?$'
    ]

    for pat in capability_exact_patterns:
        if re.search(pat, p_clean):
            return True

    return False


def is_ticket_creation_prompt(prompt: str) -> bool:
    """
    Checks whether a user message expresses an intention to create or raise a ticket,
    or describes a system issue/problem/error even without explicitly mentioning the word 'ticket'.
    """
    if is_capability_or_info_question(prompt):
        return False

    p_lower = prompt.lower().strip()
    ticket_variations = r"(?:ticket|tickate|tikit|tickt|tikket|tikate)"
    verbs = r"(?:create|raise|open|log|make|generate|submit|post|file|register|new|want\s+to\s+create|need\s+a?)"
    
    # 1. Explicit ticket verbs & variations
    if re.search(rf"\b{verbs}\b.*\b{ticket_variations}\b", p_lower):
        return True
    if re.search(rf"\b{ticket_variations}\b.*\b{verbs}\b", p_lower):
        return True
    if re.search(rf"\b(?:create|raise|open|log|file)\s+(?:an?\s+)?(?:issue|request|incident)\b", p_lower):
        return True
    if re.search(r"\bplease\s+(?:raise|create|open|log|file|submit)\b", p_lower):
        return True

    # 2. Problem/issue reporting phrases combined with system context or ticket fields
    if is_explicit_query_prompt(prompt):
        return False

    problem_phrases = [
        r'\b(?:am\s+)?facing\b', r'\bexperiencing\b', r'\bencountering\b',
        r'\bhaving\s+(?:an?\s+)?(?:issue|problem|error|crash|dump|failure|bug)\b',
        r'\b(?:issue|problem|error|crash|failure|bug)\s+(?:is|in|with|on|for)\b',
        r'\bnot\s+working\b', r'\bsystem\s+down\b', r'\bserver\s+down\b', r'\bfailed\b'
    ]

    has_problem = any(re.search(pat, p_lower) for pat in problem_phrases)

    meta_indicators = [
        r'\b(?:priority|proirity|prio)\s*[:=]?\s*(?:is\s+)?(?:high|low|medium|very high|critical|p1|p2|p3|p4)\b',
        r'\b(?:type|category|type\s*category)\s*[:=]?\s*(?:is\s+)?(?:incident|change request|service request|s po)\b',
        r'\bfor\s+(?:client\s+)?[A-Za-z0-9_-]+\b',
        r'\bplease\s+raise\b'
    ]

    has_meta = any(re.search(pat, p_lower) for pat in meta_indicators)

    if has_problem or has_meta:
        return True

    return False


def is_explicit_query_prompt(prompt: str) -> bool:
    """
    Returns True ONLY if the user explicitly requests to search, filter, list, or query tickets.
    Used to prevent treating standalone payload values as filter queries when a draft is awaiting input.
    """
    p_clean = prompt.strip().lower()

    search_patterns = [
        r'\b(?:search|find|lookup)\b',
        r'\bshow\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?(?:tickets?|issues?|records?|list)\b',
        r'\b(?:list|get|fetch|display)\s+(?:all\s+)?(?:the\s+)?(?:tickets?|issues?|records?)\b',
        r'\b(?:how\s+many|count\s+of)\s+tickets?\b',
        r'\bfilter\s+(?:all\s+)?(?:the\s+)?tickets?\b',
        r'\bfilter\s+(?:through|by|with)?\s*(?:group\s*name|assigned\s*group|module|group)\b',
        r'\b(?:group\s*name|assigned\s*group|module)\s*(?:is|:|=|\b)\b',
        r'\btickets?\s+(?:where|with|for|assigned|reported|having|status|created|in|under|by)\b',
        r'\bwhat\s+(?:is|are)\s+the\s+tickets?\b',
        r'\bopen\s+tickets?\b',
        r'\bclosed\s+tickets?\b',
        r'\bpending\s+tickets?\b'
    ]

    for pat in search_patterns:
        if re.search(pat, p_clean):
            return True

    return False


def infer_ticket_type_from_text(text: Optional[str]) -> Optional[str]:
    """
    Infers the ticket type ('Change Request', 'S PO', 'Service Request', 'Incident')
    from problem description or prompt text.
    """
    if not text or not str(text).strip():
        return None
    t_lower = str(text).lower()

    # 1. Change Request
    if any(re.search(pat, t_lower) for pat in [
        r'\bchange\s*request\b', r'\bcr\b', r'\brequest\s+for\s+change\b',
        r'\bnew\s+feature\b', r'\benhancement\b', r'\bmodify\b', r'\bcustomization\b',
        r'\bnew\s+report\b', r'\bconfiguration\s+change\b', r'\bnew\s+field\b'
    ]):
        return "Change Request"

    # 2. S PO (Purchase Order)
    if any(re.search(pat, t_lower) for pat in [
        r'\b(?:s\s*po|spo|s-po)\b', r'\bpurchase\s*order\b', r'\bpo\s+creation\b',
        r'\bprocurement\s+order\b', r'\bvendor\s+po\b'
    ]):
        return "S PO"

    # 3. Service Request
    if any(re.search(pat, t_lower) for pat in [
        r'\bservice\s*request\b', r'\bsr\b', r'\brequest\s+for\s+access\b',
        r'\baccess\s+request\b', r'\bpassword\s+reset\b', r'\buser\s+creation\b',
        r'\bpermission\s+request\b', r'\bhow\s+to\b', r'\bguidance\b', r'\bprovisioning\b',
        r'\binstall\b', r'\bsetup\b'
    ]):
        return "Service Request"

    # 4. Incident
    if any(re.search(pat, t_lower) for pat in [
        r'\bincident\b', r'\bbug\b', r'\berror\b', r'\bfailure\b', r'\bcrash\b',
        r'\bnot\s+working\b', r'\bdump\b', r'\bfault\b', r'\bdown\b', r'\bbroken\b',
        r'\bissue\b', r'\bproblem\b'
    ]):
        return "Incident"

    return None


def create_initial_draft(user_email: str = "") -> Dict[str, Any]:
    """Creates a blank draft populated with sensible defaults."""
    now = datetime.now()
    return {
        "clientName": None,
        "ams": "AMS",
        "typeofticket": None,
        "priority": None,
        "reportedon": now.strftime("%Y-%m-%dT%H:%M:%S"),
        "reportedontime": now.strftime("%H:%M:%S"),
        "reportedby": user_email or None,
        "descriptionofTicket": None,
        "screenshort": None,
        "remarks": None,
        "assigntogroup": None,
        "_pending_field": "clientName"
    }


def extract_filename_from_screenshot(screenshot_val: Optional[str]) -> Optional[str]:
    """Extracts file name from screenshot string/data URL or object if present."""
    if not screenshot_val or not isinstance(screenshot_val, str):
        return None
    s = screenshot_val.strip()
    if ";name=" in s:
        try:
            m = re.search(r';name=([^;]+);', s)
            if m:
                return urllib.parse.unquote(m.group(1)).strip()
        except Exception:
            pass
    if re.search(r'\b[\w\s-]+\.(?:png|jpg|jpeg|gif|webp|bmp)\b', s, re.IGNORECASE):
        m = re.search(r'\b([\w\s-]+\.(?:png|jpg|jpeg|gif|webp|bmp))\b', s, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def clean_user_message_text(text: Optional[str], screenshot_val: Optional[str] = None) -> str:
    """
    Strips file attachment tags, [Attached file: ...], Attached file: ...,
    and screenshot filenames from user message text.
    """
    if not text or not str(text).strip():
        return ""
    
    t = str(text).strip()
    
    # Extract filename if screenshot data URL is passed
    fname = extract_filename_from_screenshot(screenshot_val) if screenshot_val else None
    if fname:
        t = re.sub(re.escape(fname), '', t, flags=re.IGNORECASE).strip()
        
    # Strip common file attachment patterns
    t = re.sub(r'\[\s*Attached\s+file\s*:?\s*[^\]]*\]', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'Attached\s+file\s*:?\s*[^\n,;]*', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'\[\s*Screenshot\s+Attached\s*\]', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'Screenshot\s+Attached', '', t, flags=re.IGNORECASE).strip()
    
    # Strip generic screenshot filenames like "Screenshot 2026-07-24 160213.png" or "image.png"
    t = re.sub(r'\bScreenshot\s+\d{4}-\d{2}-\d{2}.*?\.(?:png|jpg|jpeg|gif|webp|bmp)\b', '', t, flags=re.IGNORECASE).strip()
    
    # Strip standalone file extension strings if the whole message is just a filename
    if re.match(r'^[\w\s-]+\.(?:png|jpg|jpeg|gif|webp|bmp)$', t, re.IGNORECASE):
        return ""
        
    return t.strip()


def clean_ticket_description(desc: Optional[str], client_name: Optional[str] = None, screenshot_val: Optional[str] = None) -> Optional[str]:
    """
    Cleans and rewrites description to contain ONLY the core problem reported,
    stripping meta-instructions, priority tags, client names, and conversational phrasing.
    Formats the output as a short, neutral factual statement.
    Example:
    Input: "create a ticket for client AAB, priority Low, am encountering issue with joule"
    Output: "Encountering issue with Joule."
    """
    if not desc or not str(desc).strip():
        return None

    # Step 0: Clean file attachment markers & filenames
    cleaned_msg = clean_user_message_text(desc, screenshot_val)
    if not cleaned_msg:
        return None
    d = cleaned_msg.strip().strip('"\'`')

    # Step 1: Remove leading/trailing ticket creation command verb phrases (e.g. "create a ticket", "raise ticket", "please raise")
    d = re.sub(
        r'^(?:please\s+)?(?:i\s+want\s+to\s+|i\s+need\s+to\s+|can\s+you\s+)?(?:create|raise|open|log|make|file|generate|submit)\s+(?:an?\s+)?(?:(?:very\s+high|critical|high|medium|low|med|p1|p2|p3|p4|new|priority|prio)\s+)*(?:ticket|issue|request)\b\s*(?:for\s+me\s+)?',
        '', d, flags=re.IGNORECASE
    ).strip()
    d = re.sub(r'[\s,;\.]+(?:please\s+)?(?:raise|create|open|log|make|file|submit|register|report|help|fix|resolve)\b.*$', '', d, flags=re.IGNORECASE).strip()

    # Step 2: Remove client specifications
    if client_name:
        d = re.sub(r'\bfor\s+client\s+' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        d = re.sub(r'\bfor\s+' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        d = re.sub(r'\bclient\s+' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        d = re.sub(r'\b' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        
        # Strip individual non-stop words of client_name (e.g. Karamtara, Balaji, ACSEN)
        corporate_stopwords = {"pvt", "ltd", "private", "limited", "inc", "corp", "co", "company", "plc", "llp", "industries", "india", "services", "technologies", "engineering", "group"}
        c_words = [w for w in re.findall(r'[A-Za-z0-9]+', str(client_name)) if len(w) >= 3 and w.lower() not in corporate_stopwords]
        for cw in c_words:
            d = re.sub(r'\bfor\s+' + re.escape(cw) + r'\b', '', d, flags=re.IGNORECASE).strip()
            d = re.sub(r'\b' + re.escape(cw) + r'\b', '', d, flags=re.IGNORECASE).strip()

    d = re.sub(r'\bfor\s+(?:client\s+)?(?:aab|karamtara|atg|balaji|kims|dixon|hfcl|wavin|casagrand|rockman|uml|phonepe|chambal|electrosteel|heritage|himedia|bajaj|avon|ajax|acsen|ananth)\b', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:client|company|customer)\s*[:=]?\s*(?:[A-Za-z0-9_\-\.]+\s*)?', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:co\.|co|ltd|pvt|corp|inc)\b', '', d, flags=re.IGNORECASE).strip()

    # Step 3: Remove priority specifications & keywords (including typos like proirity)
    d = re.sub(r'\b(?:priority|prio|proirity|prioriti|prioity)\s*[:=]?\s*(?:is\s+)?(?:very\s+high|critical|high|medium|low|med|moderate|p1|p2|p3|p4)\b', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\bkeep\s+it\s+(?:p1|p2|p3|p4|very\s+high|high|medium|low)\b', '', d, flags=re.IGNORECASE).strip()

    # Step 4: Remove ticket type & category specifications
    d = re.sub(r'\b(?:type\s*(?:category|of\s*ticket)?|category)\s*[:=]?\s*(?:is\s+)?(?:change\s+request|s\s*po|incident|service\s+request)\b', '', d, flags=re.IGNORECASE).strip()

    # Step 5: Remove leading/dangling standalone keywords like "for", "regarding", "about", "issue is", "because", "and"
    d = re.sub(r'^(?:for|regarding|about|because)\b\s*', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:the\s+)?(?:issue|problem)\s+(?:of|with|about|is)\s+', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:the\s+)?(?:issue|problem)\s+', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:and|or|with|for|co)\b(?=\s*[\.,;:]|$)', '', d, flags=re.IGNORECASE).strip()

    # Step 6: Clean dangling punctuation & spaces
    d = re.sub(r'[,:\-\s]+', ' ', d).strip()
    d = re.sub(r'^[,:\-\s]+', '', d).strip()
    d = re.sub(r'[,:\-\s\.]+$', '', d).strip()

    # Step 7: Normalize leading "am facing" / "am encountering" / "is "
    d = re.sub(r'^am facing severe\s+', 'Facing severe ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am facing\s+', 'Facing ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^facing severe\s+', 'Facing severe ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^facing\s+', 'Facing ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am encountering issue with\s+', 'Encountering issue with ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am encountering problem with\s+', 'Encountering problem with ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am encountering\s+', 'Encountering ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am experiencing\s+', 'Experiencing ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^is\s+', '', d, flags=re.IGNORECASE).strip()

    # Step 8: Proper casing for Joule & acronyms
    d = re.sub(r'\bjoule\b', 'Joule', d, flags=re.IGNORECASE)
    d = re.sub(r'\bsap\b', 'SAP', d, flags=re.IGNORECASE)

    # Step 9: Capitalize first letter and append period
    if d:
        d = d[0].upper() + d[1:]
        if not d.endswith('.'):
            d += '.'

    if re.match(r'^[\w\s-]+\.(?:png|jpg|jpeg|gif|webp|bmp)\.?$', d, re.IGNORECASE):
        return None

    return d if d else None


def validate_and_refine_description(extracted_draft: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Validation / self-check step: Checks if descriptionofTicket contains forbidden terms,
    conversational fillers, or leftover metadata/priority text.
    If forbidden patterns or extracted priority/client terms are found in descriptionofTicket,
    calls LLM to perform a 1-shot semantic distillation pass.
    """
    desc = extracted_draft.get("descriptionofTicket")
    scr_val = extracted_draft.get("screenshort")

    # If description is a screenshot filename or empty, clean it or fallback
    clean_d = clean_ticket_description(desc, extracted_draft.get("clientName"), scr_val)
    if not clean_d:
        if scr_val or (prompt and ("screenshot" in prompt.lower() or "attached" in prompt.lower())):
            extracted_draft["descriptionofTicket"] = "Screenshot attached"
        return extracted_draft

    extracted_draft["descriptionofTicket"] = clean_d
    desc = clean_d

    desc_lower = desc.lower()
    
    # Check forbidden terms
    forbidden_terms = [
        "priority", "proirity", "prioriti", "prioity", "client", "ticket",
        "issue is", "problem is", "the issue", "the problem", "keep it p", "p1", "p2", "p3", "p4"
    ]
    
    prio_val = str(extracted_draft.get("priority") or "").lower()
    client_val = str(extracted_draft.get("clientName") or "").lower()

    needs_refinement = False
    if any(ft in desc_lower for ft in forbidden_terms):
        needs_refinement = True
    elif prio_val and prio_val in desc_lower:
        needs_refinement = True
    elif client_val and len(client_val) > 2 and client_val in desc_lower:
        needs_refinement = True

    if needs_refinement:
        clean_p = clean_user_message_text(prompt, scr_val)
        refinement_system_prompt = (
            "You are an NLP editor for an AMS ticket system. Your only job is to rewrite raw problem text "
            "into a clean, short, neutral factual statement in proper English describing ONLY the issue reported. "
            "STRICT CONSTRAINTS:\n"
            "1. MUST NEVER include words like 'priority', 'proirity', 'client', 'ticket', 'issue is', 'problem is', 'because', or priority/client values.\n"
            "2. MUST NEVER include screenshot filenames or attachment markers.\n"
            "3. Output ONLY the rewritten factual issue string (e.g. 'Joule icon is missing.'). Do not include JSON or quotes."
        )
        refinement_prompt = f"""Rewrite the following problem text to remove all metadata, priority mentions, client names, and filler words:
Raw text: "{desc}"
Original message: "{clean_p or prompt}"

Clean factual statement:"""

        refined_res = _call_llm(refinement_prompt, system_instruction=refinement_system_prompt, json_response=False)
        if refined_res and len(refined_res.strip()) > 3:
            cleaned_refined = clean_ticket_description(refined_res.strip(), extracted_draft.get("clientName"), scr_val)
            if cleaned_refined:
                extracted_draft["descriptionofTicket"] = cleaned_refined

    return extracted_draft


def extract_fields_with_llm(prompt: str, current_draft: Dict[str, Any], known_clients: List[str]) -> Dict[str, Any]:
    """
    Extracts ticket fields using fast heuristic rules merged with LLM extraction.
    """
    # 1. Run fast heuristic extractor first
    heuristic_draft = heuristic_field_extractor(prompt, current_draft, known_clients)

    # 2. Build clean draft state for LLM (do not pollute descriptionofTicket with raw unparsed input)
    llm_draft_state = dict(heuristic_draft)
    if current_draft.get("descriptionofTicket") is None:
        llm_draft_state["descriptionofTicket"] = None

    system_prompt = (
        "You are an expert NLP data extractor for an AMS Ticket Management System. "
        "Your task is to understand natural language user prompts and extract structured ticket fields into JSON.\n\n"
        "EXTRACTION RULES:\n"
        "1. METADATA EXTRACTION:\n"
        "   - priority: Extract priority/severity phrases (e.g. 'very high', 'p1', 'critical', 'proirity is high', 'p2', 'low', 'keep it p3') and map to one of ['Low', 'Medium', 'High', 'Very High'].\n"
        "   - clientName: Extract client/company references (e.g. 'for AAB', 'at Karamtara', 'for ATG', 'client is Balaji'). Match against known clients.\n"
        "   - typeofticket: Must strictly be one of ['Change Request', 'S PO', 'Incident', 'Service Request']. Defaults to 'Incident'.\n"
        "   - assigntogroup: Infer module or team if mentioned (e.g. SAP-AI, SAP-FICO, RPA, Support).\n\n"
        "2. DESCRIPTION REWRITING:\n"
        "   - Identify the underlying core problem or failure being reported.\n"
        "   - Strip away conversational framing ('create a ticket about', 'raise ticket', 'issue is', 'problem is', 'please note', 'keep it p3', 'because').\n"
        "   - Strip away all extracted metadata (priority, client name, status, ticket instructions).\n"
        "   - Rewrite the remaining core problem as a short, clean, neutral factual statement in proper English (e.g. 'Joule icon is missing.').\n\n"
        "3. STRICT CONSTRAINTS FOR descriptionofTicket:\n"
        "   - MUST NEVER contain words like 'priority', 'proirity', 'client', 'ticket', 'issue is', 'problem is', or extracted priority/client values.\n"
        "   - Only output valid JSON matching the schema. Do not output markdown code fences or conversational text."
    )

    extraction_prompt = f"""Extract fields from the user message into the TicketCreateRequest schema:
Available fields in schema:
- clientName: Registered client or company name (string or null). Match against known clients if possible: {json.dumps(known_clients[:25])}
- ams: System/instance name (defaults to "AMS" if not specified)
- typeofticket: MUST strictly be one of: "Change Request", "S PO", "Incident", "Service Request". Defaults to "Incident". (string or null)
- priority: "Low", "Medium", "High", or "Critical" / "Very High" (string or null)
- reportedon: Date or timestamp in ISO format (YYYY-MM-DDTHH:MM:SS) if mentioned, else null
- reportedontime: Time string (HH:MM:SS) if mentioned, else null
- reportedby: Name or email of the person reporting the ticket (string or null)
- descriptionofTicket: The actual core issue being reported (string or null). MUST contain ONLY the issue itself rewritten as a short factual statement — exclude instructions ('create a ticket'), priority ('keep it p2'), client name ('for aab'), filler words ('issue is', 'because').
- screenshort: Screenshot path, filename, URL, or image reference (string or null)
- remarks: Any notes, remarks, or extra context (string or null)
- assigntogroup: Assigned module or team e.g. SAP-AI, SAP-FICO, SAP-MM, RPA, Support (string or null)

FEW-SHOT EXAMPLES FOR NATURAL LANGUAGE PARSING:
Input: "issue is joule icon missing and proirity is very high"
Output: {{"clientName": null, "priority": "Very High", "typeofticket": "Incident", "descriptionofTicket": "Joule icon is missing."}}

Input: "create a ticket for Balaji issue is server down and priority is high"
Output: {{"clientName": "Balaji", "priority": "High", "typeofticket": "Incident", "descriptionofTicket": "Server is down."}}

Input: "create a ticket for atg because joule is not giving information and keep it p3"
Output: {{"clientName": "ATG", "priority": "Medium", "typeofticket": "Incident", "descriptionofTicket": "Joule is not giving information."}}

Current active draft state:
{json.dumps(llm_draft_state)}

User's new message:
"{prompt}"

Respond ONLY with a JSON object containing the 11 fields. If a field was not mentioned and is not in current draft, use null.
"""

    raw_response = _call_llm(extraction_prompt, system_instruction=system_prompt, json_response=True)
    merged = dict(heuristic_draft)

    if raw_response:
        try:
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            extracted = json.loads(cleaned)
            if isinstance(extracted, dict):
                if extracted.get("typeofticket"):
                    extracted["typeofticket"] = normalize_ticket_type(extracted["typeofticket"])
                for k, v in extracted.items():
                    if v is not None:
                        merged[k] = v
        except Exception:
            pass

    # Post-extraction self-check and refinement
    merged = validate_and_refine_description(merged, prompt)
    return merged


def heuristic_field_extractor(prompt: str, current_draft: Dict[str, Any], known_clients: List[str]) -> Dict[str, Any]:
    """
    Regex and rule-based field extractor used as fallback or supplement.
    """
    p = prompt.strip()
    p_lower = p.lower()
    draft = dict(current_draft)

    # 1. Client Name Extraction & Entity Resolution
    explicit_client = re.search(
        r'\b(?:for\s+client|client|for)\s*[:=]?\s*([A-Za-z0-9_\-\s]+?)(?:\s+(?:priority|prio|proirity|regarding|about|with|having|for|group|module|status|type|ticket|issue)|$)',
        p,
        re.IGNORECASE
    )
    if explicit_client:
        c_cand = explicit_client.group(1).strip()
        c_clean_cand = re.sub(r'\b(?:co\.|co|corp|inc|ltd|pvt|company)\b', '', c_cand, flags=re.IGNORECASE).strip()
        if c_clean_cand and c_clean_cand.lower() not in ["a", "an", "the", "me", "new", "ticket", "issue", "request", "is", "name"]:
            resolved = resolve_client_name(c_clean_cand, known_clients)
            if resolved:
                draft["clientName"] = resolved
            else:
                draft["clientName"] = c_clean_cand

    if not draft.get("clientName"):
        corporate_stopwords = {"pvt", "ltd", "private", "limited", "inc", "corp", "co", "plc", "llp", "industries", "india", "services", "technologies", "engineering", "group"}
        for client in known_clients:
            c_clean = str(client).strip()
            if not c_clean or c_clean.lower() in ["none", "null", "n/a", "—", "-"]:
                continue
            if len(c_clean) <= 4:
                if re.search(r'\b' + re.escape(c_clean) + r'\b', p, re.IGNORECASE):
                    draft["clientName"] = client
                    break
            else:
                if c_clean.lower() in p_lower:
                    draft["clientName"] = client
                    break
                else:
                    words = [w.lower() for w in re.findall(r'[A-Za-z0-9]+', c_clean) if len(w) >= 3 and w.lower() not in corporate_stopwords]
                    for w in words:
                        if re.search(r'\b' + re.escape(w) + r'\b', p_lower):
                            draft["clientName"] = client
                            break
                    if draft.get("clientName"):
                        break

    # 2. Priority
    prio_patterns = [
        (r'\b(?:very high|critical|p1)\b', "Very High"),
        (r'\b(?:high|p2)\b', "High"),
        (r'\b(?:medium|med|moderate|p3)\b', "Medium"),
        (r'\b(?:low|minor|trivial|p4)\b', "Low")
    ]
    m_prio_label = re.search(r'\bpriority\s*[:=]\s*([A-Za-z0-9\s]+)', p, re.IGNORECASE)
    if m_prio_label:
        val = m_prio_label.group(1).strip().lower()
        if "crit" in val or "very high" in val or "p1" in val:
            draft["priority"] = "Very High"
        elif "high" in val or "p2" in val:
            draft["priority"] = "High"
        elif "med" in val or "p3" in val:
            draft["priority"] = "Medium"
        elif "low" in val or "p4" in val:
            draft["priority"] = "Low"
    else:
        for pat, norm in prio_patterns:
            if re.search(pat, p_lower):
                draft["priority"] = norm
                break

    # 3. Description
    m_desc = re.search(r'\b(?:issue|problem|description|error|summary)(?:\s+of\s+ticket)?\s*[:=]\s*([^;\n]+)', p, re.IGNORECASE)
    if m_desc:
        cand_desc = clean_ticket_description(m_desc.group(1).strip(), draft.get("clientName"), draft.get("screenshort"))
        if cand_desc:
            draft["descriptionofTicket"] = cand_desc
    
    if not draft.get("descriptionofTicket"):
        clean_prompt = clean_user_message_text(p, draft.get("screenshort"))
        if ":" in clean_prompt:
            parts = clean_prompt.split(":", 1)
            candidate = parts[1].strip()
            candidate = re.sub(r'\b(?:priority|prio|reported\s+by|type|category|remarks?)\s*[:=].*$', '', candidate, flags=re.IGNORECASE).strip()
            cleaned_cand = clean_ticket_description(candidate, draft.get("clientName"), draft.get("screenshort"))
            if cleaned_cand:
                draft["descriptionofTicket"] = cleaned_cand
        elif len(clean_prompt) >= 4:
            cleaned_p = re.sub(
                r'^(?:please\s+)?(?:i\s+want\s+to\s+|i\s+need\s+to\s+|can\s+you\s+)?(?:create|raise|open|log|make|file|generate|submit)\s+(?:an?\s+)?(?:new\s+)?(?:ticket|issue|request)\s+(?:for\s+me\s+)?(?:for|client|on|about|regarding)?\s*',
                '', clean_prompt, flags=re.IGNORECASE
            ).strip()

            if draft.get("clientName"):
                cleaned_p = re.sub(re.escape(str(draft["clientName"])), '', cleaned_p, flags=re.IGNORECASE).strip()
            for c in (known_clients or []):
                if len(c) > 3 and c.lower() in cleaned_p.lower():
                    cleaned_p = re.sub(re.escape(c), '', cleaned_p, flags=re.IGNORECASE).strip()

            cleaned_p = re.sub(r'\b(?:priority|prio)\s*[:=]?\s*(?:very\s+high|critical|high|medium|low|med|p1|p2|p3|p4)\b', '', cleaned_p, flags=re.IGNORECASE)
            cleaned_p = re.sub(r'\b(?:type|category)\s*[:=]?\s*(?:change\s+request|s\s*po|incident|service\s+request)\b', '', cleaned_p, flags=re.IGNORECASE)
            cleaned_p = re.sub(r'^[:\-\s,]+', '', cleaned_p).strip()
            cleaned_p = re.sub(r'[:\-\s,]+$', '', cleaned_p).strip()

            cleaned_final = clean_ticket_description(cleaned_p, draft.get("clientName"), draft.get("screenshort"))
            if cleaned_final:
                draft["descriptionofTicket"] = cleaned_final

    # Fallback if still no description
    if not draft.get("descriptionofTicket"):
        if current_draft.get("descriptionofTicket"):
            draft["descriptionofTicket"] = current_draft["descriptionofTicket"]
        elif draft.get("screenshort") or current_draft.get("screenshort"):
            draft["descriptionofTicket"] = "Screenshot attached"

    # 4. Reported By
    m_rep = re.search(r'\breported\s*(?:by|from)\s*[:=]?\s*([A-Za-z0-9\._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z\s]{2,25})\b', p, re.IGNORECASE)
    if m_rep:
        draft["reportedby"] = m_rep.group(1).strip()

    # 5. Remarks
    m_rem = re.search(r'\bremarks?\s*[:=]\s*([^;\n]+)', p, re.IGNORECASE)
    if m_rem:
        draft["remarks"] = m_rem.group(1).strip()

    # 6. Assignment Group
    m_grp = re.search(r'\b(?:assign(?:ed)?(?:\s+to)?(?:\s+group)?|module)\s*[:=]\s*([A-Za-z0-9\-\s/]+)', p, re.IGNORECASE)
    if m_grp:
        cand_grp = m_grp.group(1).strip()
        for g in GROUPS:
            if g.lower() == cand_grp.lower() or g.lower() in cand_grp.lower():
                draft["assigntogroup"] = g
                break

    # 7. Screenshot
    m_scr = re.search(r'\b(?:screenshot|screenshort|attachment|image)\s*[:=]\s*([^\s,;]+)', p, re.IGNORECASE)
    if m_scr:
        draft["screenshort"] = m_scr.group(1).strip()

    # 8. Type of Ticket - Strictly: Change Request, S PO, Incident, Service Request
    m_type = re.search(r'\b(?:type\s*(?:of\s*ticket)?|category)\s*[:=]\s*([A-Za-z0-9\s\-_]+)', p, re.IGNORECASE)
    if m_type:
        draft["typeofticket"] = normalize_ticket_type(m_type.group(1).strip())
        draft["_typeofticket_source"] = "user"
    else:
        inferred = infer_ticket_type_from_text(p) or infer_ticket_type_from_text(draft.get("descriptionofTicket"))
        if inferred:
            draft["typeofticket"] = inferred
            draft["_typeofticket_source"] = "auto"
        elif draft.get("typeofticket"):
            draft["typeofticket"] = normalize_ticket_type(draft.get("typeofticket"))

    return draft


def resolve_client_name(candidate_client: Optional[str], known_clients: Optional[List[str]] = None) -> Optional[str]:
    """
    Intelligently resolves informal or partial client references (e.g. 'Karamtara')
    to official registered client names in AMS database (e.g. 'Karamtara Engineering Pvt Ltd').
    """
    if not candidate_client:
        return None
    c_clean = str(candidate_client).strip()
    c_lower = c_clean.lower()
    
    clients = list(known_clients) if known_clients else []
    if not clients:
        clients = [
            "Karamtara Engineering Pvt Ltd", "ATG", "BALAJI AMINES LIMITED",
            "AAB", "ACSEN HyVeg Pvt Ltd", "AJAX Engineering Pvt Ltd", "Ananth Technologies Pvt Ltd",
            "Avon Cycles Limited", "Bajaj Sons", "Bharathi Cement", "CLOUD4C", "Casagrand Builder Private Limited",
            "Chambal Fertilisers and Chemicals Ltd.", "DIMO Lanka", "Dixon", "Electrosteel Castings Limited",
            "HFCL LTD", "Heritage", "Himedia Laboratories Pvt Ltd", "KIMS", "Phone Pe", "Pitti Engineering Limited",
            "Premier Energies Limited", "Rockman", "Shree Renuka Sugars Ltd", "UML", "Wavin"
        ]

    # 1. Exact match
    for k in clients:
        if k.strip().lower() == c_lower:
            return k.strip()

    # 2. Case-insensitive substring match
    for k in clients:
        k_lower = k.strip().lower()
        if c_lower in k_lower or k_lower in c_lower:
            return k.strip()

    # 3. Token overlap matching (ignoring generic legal entity suffixes)
    c_tokens = set(re.findall(r'\b[A-Za-z0-9]{3,}\b', c_lower)) - {"pvt", "ltd", "private", "limited", "company", "client"}
    best_match = None
    best_overlap = 0
    for k in clients:
        k_lower = k.strip().lower()
        k_tokens = set(re.findall(r'\b[A-Za-z0-9]{3,}\b', k_lower)) - {"pvt", "ltd", "private", "limited"}
        overlap = len(c_tokens & k_tokens)
        if overlap > best_overlap:
            best_overlap = overlap
            best_match = k.strip()

    if best_match and best_overlap > 0:
        return best_match

    return c_clean


def finalize_draft_fields(draft: Dict[str, Any], user_email: str = "", known_clients: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Ensures sensible defaults for non-provided fields (dates, auto-classification, reporter),
    and resolves clientName to registered AMS database name.
    """
    res = dict(draft)
    now = datetime.now()

    if res.get("clientName"):
        res["clientName"] = resolve_client_name(res["clientName"], known_clients)

    if not res.get("reportedon"):
        res["reportedon"] = now.strftime("%Y-%m-%dT%H:%M:%S")
    if not res.get("reportedontime"):
        res["reportedontime"] = now.strftime("%H:%M:%S")

    # If typeofticket is not explicitly set, infer from description of ticket or default to "Incident"
    if not res.get("typeofticket"):
        inferred = infer_ticket_type_from_text(res.get("descriptionofTicket"))
        if inferred:
            res["typeofticket"] = inferred
            res["_typeofticket_source"] = "auto"
        else:
            res["typeofticket"] = "Incident"
            res["_typeofticket_source"] = "default"
    else:
        res["typeofticket"] = normalize_ticket_type(res.get("typeofticket"))

    if not res.get("ams"):
        res["ams"] = "AMS"

    if user_email and user_email.strip():
        if not res.get("reportedby") or res.get("reportedby") == "user@neovatic.com":
            res["reportedby"] = user_email.strip()

    # Auto-classify group using Module_Router if description exists but group is not specified
    if not res.get("assigntogroup") and res.get("descriptionofTicket"):
        try:
            auto_group = assign_group(res["descriptionofTicket"])
            if auto_group:
                res["assigntogroup"] = auto_group
        except Exception:
            pass

    return res


def get_missing_core_fields(draft: Dict[str, Any]) -> List[str]:
    """Returns list of essential fields that are still missing."""
    missing = []
    
    client = draft.get("clientName")
    if not client or str(client).strip().lower() in ["", "none", "null", "none provided", "undefined", "unknown", "*not provided*"]:
        missing.append("clientName")
        
    desc = draft.get("descriptionofTicket")
    if not desc or str(desc).strip().lower() in ["", "none", "null", "none provided", "undefined", "unknown", "*not provided*"]:
        missing.append("descriptionofTicket")
        
    prio = draft.get("priority")
    if not prio or str(prio).strip().lower() in ["", "none", "null", "none provided", "undefined", "unknown", "*not provided*"]:
        missing.append("priority")
        
    return missing



def analyze_user_intent_on_draft(
    user_message: str,
    current_draft: Dict[str, Any],
    history: Optional[List[Dict[str, Any]]] = None,
    known_clients: Optional[List[str]] = None
) -> Tuple[str, Dict[str, Any]]:
    """
    Understands whether the user is:
    - 'confirm': Affirming/agreeing to create the ticket (e.g. 'yes', 'proceed', 'looks good', 'create it', 'do it')
    - 'modify': Requesting changes to fields or supplying missing required values
    - 'cancel': Aborting the creation (e.g. 'cancel', 'stop', 'don't create')
    - 'unrelated': Asking an explicit search/query or unrelated question

    Prioritizes populating missing required payload fields when user enters standalone values.
    """
    msg_clean = user_message.strip()
    msg_lower = msg_clean.lower()

    # Determine missing required fields & currently pending field
    missing_fields = get_missing_core_fields(current_draft)
    pending_field = current_draft.get("_pending_field") or (missing_fields[0] if missing_fields else None)

    # Fast check for simple affirmative answers
    pure_affirmations = {
        "yes", "y", "yeah", "yep", "sure", "ok", "okay", "go ahead", "proceed",
        "create", "create it", "create ticket", "create the ticket", "submit", "submit it",
        "looks good", "looks fine", "all good", "do it", "please create",
        "yes please", "yes go ahead", "yes proceed", "perfect", "done", "confirm",
        "fine", "proceed please", "make it", "go for it", "right", "correct", "approved"
    }
    if msg_lower in pure_affirmations or re.match(r'^(?:yes|sure|ok|okay|yep|yeah|proceed|go ahead|looks good|do it|submit)(?:,?\s*(?:please|create|it|proceed|go ahead|thanks))?[!\.]*$', msg_lower):
        return "confirm", {}

    # Fast check for cancellations
    cancellations = {"cancel", "no", "stop", "abort", "discard", "nevermind", "never mind", "don't create", "dont create", "exit"}
    if msg_lower in cancellations or re.match(r'^(?:cancel|abort|discard|stop|no\s+don\'?t)(?:\s+(?:ticket|it|create))?[!\.]*$', msg_lower):
        return "cancel", {}

    # Fast check for direct field input when a pending field is active
    if missing_fields and pending_field and not is_explicit_query_prompt(user_message):
        words = msg_clean.split()
        if len(words) <= 8:
            if pending_field == "clientName":
                resolved_c = resolve_client_name(msg_clean, known_clients)
                if resolved_c:
                    return "modify", {"clientName": resolved_c}
            elif pending_field == "priority":
                if any(w in msg_lower for w in ["low", "minor"]):
                    return "modify", {"priority": "Low"}
                elif any(w in msg_lower for w in ["high", "critical", "p1", "p2"]):
                    return "modify", {"priority": "High"}
                elif any(w in msg_lower for w in ["medium", "med", "p3"]):
                    return "modify", {"priority": "Medium"}
            elif pending_field == "descriptionofTicket":
                clean_msg = clean_user_message_text(msg_clean, current_draft.get("screenshort"))
                if len(clean_msg) > 3:
                    cleaned_desc = clean_ticket_description(clean_msg, current_draft.get("clientName"), current_draft.get("screenshort"))
                    if cleaned_desc:
                        return "modify", {"descriptionofTicket": cleaned_desc}
                if current_draft.get("descriptionofTicket"):
                    return "modify", {"descriptionofTicket": current_draft["descriptionofTicket"]}
                elif current_draft.get("screenshort"):
                    return "modify", {"descriptionofTicket": "Screenshot attached"}

    # If missing fields exist and user message is an explicit search/query prompt, route to query engine
    if missing_fields and is_explicit_query_prompt(user_message):
        return "unrelated", {}

    # LLM Intent Analysis with context of pending missing field
    system_instruction = (
        "You are an intent understanding engine for an AMS ticket creation assistant. "
        "The user has a pending ticket draft. Determine if their message is an affirmation/approval to proceed, "
        "a modification/provision of ticket fields, a cancellation, or an explicit search query. "
        "CRITICAL: If the user provides a standalone value (e.g. 'AAB', 'High', 'SAP error') answering a prompt for a missing field, "
        "classify it as 'modify' and assign that value to the pending missing field. Do NOT classify it as 'unrelated' unless they explicitly ask to search/query tickets. "
        "NEVER use screenshot file names (e.g. 'Screenshot 2026-07-24 160213.png') as descriptionofTicket."
    )

    intent_prompt = f"""Current pending ticket draft:
{json.dumps(current_draft, indent=2)}

Missing required fields in draft: {json.dumps(missing_fields)}
Currently pending field awaiting user input: {json.dumps(pending_field)}

User's latest response:
"{msg_clean}"

Determine the user's intent:
1. "confirm": User agrees, approves, confirms, or wants to proceed with creating/submitting this ticket.
   Examples: "yes", "go ahead", "looks good", "proceed", "create it", "submit", "do it", "sure", "all good", "yep", "please create it", "looks fine to me", "okay, proceed", "confirm".
2. "modify": User wants to update, correct, or provide fields for the ticket (including standalone values for pending field: '{pending_field}').
   Examples: "change priority to Low", "client is ATG", "description should be...", "actually reported by Alex", "AAB".
3. "cancel": User wants to cancel or discard this ticket creation.
   Examples: "cancel", "no", "don't create", "never mind", "abort", "discard".
4. "unrelated": User explicitly asked to filter/search existing tickets or asked an unrelated query.

Respond with a JSON object:
{{
  "intent": "confirm" | "modify" | "cancel" | "unrelated",
  "explanation": "short reason",
  "modified_fields": {{
    "clientName": null or updated_value,
    "priority": null or updated_value,
    "descriptionofTicket": null or updated_value,
    "assigntogroup": null or updated_value,
    "reportedby": null or updated_value,
    "remarks": null or updated_value,
    "typeofticket": null or updated_value (Allowed values ONLY: "Change Request", "S PO", "Incident", "Service Request")
  }}
}}
"""

    raw_response = _call_llm(intent_prompt, system_instruction=system_instruction, json_response=True)
    if raw_response:
        try:
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            parsed = json.loads(cleaned)
            intent = parsed.get("intent", "").lower()
            mod_fields = {k: v for k, v in parsed.get("modified_fields", {}).items() if v is not None}
            if "typeofticket" in mod_fields and mod_fields["typeofticket"]:
                mod_fields["typeofticket"] = normalize_ticket_type(mod_fields["typeofticket"])
            if "descriptionofTicket" in mod_fields and mod_fields["descriptionofTicket"]:
                cleaned_desc = clean_ticket_description(mod_fields["descriptionofTicket"], mod_fields.get("clientName") or current_draft.get("clientName"), current_draft.get("screenshort"))
                mod_fields["descriptionofTicket"] = cleaned_desc or current_draft.get("descriptionofTicket") or "Screenshot attached"

            if intent == "modify" or (mod_fields and len(mod_fields) > 0):
                if pending_field and not any(k in mod_fields for k in ["clientName", "descriptionofTicket", "priority", "assigntogroup", "typeofticket"]):
                    if pending_field == "descriptionofTicket":
                        clean_m = clean_user_message_text(msg_clean, current_draft.get("screenshort"))
                        mod_fields[pending_field] = clean_ticket_description(clean_m, current_draft.get("clientName"), current_draft.get("screenshort")) or current_draft.get("descriptionofTicket") or "Screenshot attached"
                    else:
                        mod_fields[pending_field] = msg_clean
                return "modify", mod_fields
            elif intent in ["confirm", "cancel"]:
                return intent, mod_fields
            elif intent == "unrelated" and missing_fields and not is_explicit_query_prompt(user_message):
                # User provided a standalone answer to missing field prompt, override 'unrelated'
                if pending_field == "descriptionofTicket":
                    clean_m = clean_user_message_text(msg_clean, current_draft.get("screenshort"))
                    mod_fields[pending_field] = clean_ticket_description(clean_m, current_draft.get("clientName"), current_draft.get("screenshort")) or current_draft.get("descriptionofTicket") or "Screenshot attached"
                else:
                    mod_fields[pending_field] = msg_clean
                return "modify", mod_fields
            elif intent == "unrelated":
                return "unrelated", {}
        except Exception:
            pass

    # Heuristic fallback for intent detection
    if any(phrase in msg_lower for phrase in ["go ahead", "proceed", "create it", "looks good", "submit", "do it", "all good", "sure", "yes"]):
        return "confirm", {}

    if any(word in msg_lower for word in ["cancel", "nevermind", "abort", "discard", "stop"]):
        return "cancel", {}

    # Check heuristic extractor first
    mod_extracted = heuristic_field_extractor(msg_clean, {}, known_clients or [])
    cleaned_mods = {k: v for k, v in mod_extracted.items() if v is not None}
    if "typeofticket" in cleaned_mods:
        cleaned_mods["typeofticket"] = normalize_ticket_type(cleaned_mods["typeofticket"])

    if cleaned_mods:
        return "modify", cleaned_mods

    # If missing required fields exist and user message is not an explicit search query, map to pending_field
    if missing_fields and pending_field and not is_explicit_query_prompt(user_message):
        return "modify", {pending_field: msg_clean}

    return "modify", {}


def format_preview_markdown(draft: Dict[str, Any], missing_fields: List[str]) -> str:
    """
    Renders a clean, comprehensive markdown table showing all 11 fields neatly arranged.
    """
    field_labels = [
        ("Client Name", "clientName", "Registered customer / client name"),
        ("AMS Instance", "ams", "AMS system name"),
        ("Type of Ticket", "typeofticket", "Allowed: Change Request | S PO | Incident | Service Request"),
        ("Priority", "priority", "Severity / Priority level"),
        ("Reported On", "reportedon", "Reported ISO date-time"),
        ("Reported Time", "reportedontime", "Reported time"),
        ("Reported By", "reportedby", "Name or email of requester"),
        ("Description", "descriptionofTicket", "Issue details"),
        ("Screenshot", "screenshort", "Attachment or image"),
        ("Remarks", "remarks", "Additional notes"),
        ("Assigned Group", "assigntogroup", "Assigned team/module")
    ]

    lines = [
        "### AMS Ticket Creation Preview\n",
        "Please review the extracted ticket fields below:\n",
        "| Field | Value | Status |",
        "| :--- | :--- | :--- |"
    ]

    for label, key, desc in field_labels:
        val = draft.get(key)
        is_missing = key in missing_fields

        if is_missing or not val:
            if key in CORE_REQUIRED_FIELDS:
                status_str = "**Missing (Required)**"
                val_display = "*Not Provided*"
            else:
                status_str = "*Optional / None*"
                val_display = "*None*"
        else:
            if key in ["reportedon", "reportedontime"]:
                status_str = "*Auto-filled*"
                val_display = f"`{val}`"
            elif key == "ams":
                status_str = "*Default*"
                val_display = f"`{val}`"
            elif key == "typeofticket":
                src = draft.get("_typeofticket_source")
                if src == "auto":
                    status_str = "*Auto-classified*"
                elif src == "user":
                    status_str = "*Provided*"
                else:
                    status_str = "*Default*"
                val_display = f"`{val}`"
            elif key == "assigntogroup":
                status_str = "*Auto-routed*"
                val_display = f"**`{val}`**"
            elif key == "priority":
                status_str = "*Ready*"
                val_display = f"**`{val}`**"
            elif key == "screenshort":
                val_str = str(val).strip()
                if val_str.startswith("data:image/"):
                    status_str = "*Attached*"
                    val_display = f'<img src="{val_str}" alt="Screenshot Preview" style="max-width:160px; max-height:120px; border-radius:6px; cursor:pointer;" />'
                elif val_str.lower() in ["none", "null", "*none*", "*not provided*"]:
                    status_str = "*Optional / None*"
                    val_display = "*None*"
                else:
                    status_str = "*Attached*"
                    val_display = f"`{val_str}`"
            else:
                status_str = "*Provided*"
                val_display = f"`{val}`"

        lines.append(f"| **{label}** (`{key}`) | {val_display} | {status_str} |")

    lines.append("")

    if missing_fields:
        missing_names = [f"**{f}**" for f in missing_fields]
        lines.append(f"> **Missing Information Required:** Please provide {', '.join(missing_names)} to complete your ticket.")
        lines.append("")
        next_field_prompt = missing_fields[0]
        lines.append(f"**Next Step**: Please enter the value for **{next_field_prompt}** (or provide multiple missing fields in your reply).")
    else:
        lines.append("---")
        lines.append("**All required details are complete.**")
        lines.append("")
        lines.append("Would you like to proceed with creating this ticket, or would you like to make any modifications?")
        lines.append("*(You can say **\"Yes, go ahead\"**, **\"Proceed\"**, **\"Looks good\"**, **\"Create it\"**, or tell me what to change)*")

    return "\n".join(lines)


def submit_ticket_to_ams(draft: Dict[str, Any], ams: AMSApi) -> Dict[str, Any]:
    """
    Calls AMS live API /api/Ticket/CreateTicket with the finalized payload.
    """
    payload = {
        "ClientName": draft.get("ClientName") or draft.get("clientName"),
        "AMS": draft.get("AMS") or draft.get("ams") or "AMS",
        "Typeofticket": normalize_ticket_type(draft.get("Typeofticket") or draft.get("typeofticket")),
        "Priority": draft.get("Priority") or draft.get("priority"),
        "Reportedon": draft.get("Reportedon") or draft.get("reportedon"),
        "Reportedontime": draft.get("Reportedontime") or draft.get("reportedontime"),
        "Reportedby": draft.get("Reportedby") or draft.get("reportedby"),
        "DescriptionofTicket": draft.get("DescriptionofTicket") or draft.get("descriptionofTicket"),
        "Screenshot": draft.get("Screenshot") or draft.get("screenshort") or draft.get("screenshot"),
        "Remarks": draft.get("Remarks") or draft.get("remarks"),
        "Assigntogroup": draft.get("Assigntogroup") or draft.get("assigntogroup"),
        "clientName": draft.get("clientName") or draft.get("ClientName"),
        "ams": draft.get("ams") or draft.get("AMS") or "AMS",
        "typeofticket": normalize_ticket_type(draft.get("typeofticket") or draft.get("Typeofticket")),
        "priority": draft.get("priority") or draft.get("Priority"),
        "reportedon": draft.get("reportedon") or draft.get("Reportedon"),
        "reportedontime": draft.get("reportedontime") or draft.get("Reportedontime"),
        "reportedby": draft.get("reportedby") or draft.get("Reportedby"),
        "descriptionofTicket": draft.get("descriptionofTicket") or draft.get("DescriptionofTicket"),
        "screenshort": draft.get("screenshort") or draft.get("Screenshot") or draft.get("screenshot"),
        "remarks": draft.get("remarks") or draft.get("Remarks"),
        "assigntogroup": draft.get("assigntogroup") or draft.get("Assigntogroup")
    }

    # Clean None values if necessary or send as null
    result = ams.create_ticket(payload)
    return result
