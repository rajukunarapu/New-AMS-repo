"""
services/classification_config.py - Authoritative Configuration for Neo AI Ticket Classification.

Contains:
1. Authoritative Ticket Types: "Incident", "Change Request", "Service request", "S PO".
2. Category definitions and semantic boundary rules.
3. Configurable confidence thresholds.
4. Reference historical few-shot examples for prompt construction.
5. Configurable S PO business rules and disambiguation handlers.
"""

from typing import Dict, Any, List, Optional, Tuple

# Authoritative Ticket Type Names (No IDs required)
TICKET_TYPE_INCIDENT = "Incident"
TICKET_TYPE_CHANGE_REQUEST = "Change Request"
TICKET_TYPE_SERVICE_REQUEST = "Service request"
TICKET_TYPE_S_PO = "S PO"

VALID_TICKET_TYPES: List[str] = [
    TICKET_TYPE_INCIDENT,
    TICKET_TYPE_CHANGE_REQUEST,
    TICKET_TYPE_SERVICE_REQUEST,
    TICKET_TYPE_S_PO,
]

# --- Authoritative Ticket Priority Matrix by Ticket Type ---
# Change Request: ONLY P4 - Low
# Incident: P1 - Very High, P2 - High, P3 - Medium (NO Low)
# Service Request: P2 - High, P3 - Medium, P4 - Low (NO Very High)
ALLOWED_PRIORITIES_BY_TYPE: Dict[str, List[str]] = {
    TICKET_TYPE_CHANGE_REQUEST: ["Low"],
    TICKET_TYPE_INCIDENT: ["Very High", "High", "Medium"],
    TICKET_TYPE_SERVICE_REQUEST: ["High", "Medium", "Low"],
    TICKET_TYPE_S_PO: ["High", "Medium", "Low"],
}

DEFAULT_PRIORITY_BY_TYPE: Dict[str, str] = {
    TICKET_TYPE_CHANGE_REQUEST: "Low",
    TICKET_TYPE_INCIDENT: "Medium",
    TICKET_TYPE_SERVICE_REQUEST: "Low",
    TICKET_TYPE_S_PO: "Low",
}


def adjust_priority_for_ticket_type(priority: Optional[str], ticket_type: Optional[str]) -> str:
    """
    Adjusts and validates the priority strictly according to the Ticket Priority Matrix:
    - Change Request: strictly 'Low' (P4)
    - Incident: 'Very High' (P1), 'High' (P2), 'Medium' (P3). If 'Low' provided, adjusts to 'Medium'.
    - Service request: 'High' (P2), 'Medium' (P3), 'Low' (P4). If 'Very High' provided, adjusts to 'High'.
    - S PO: 'High' (P2), 'Medium' (P3), 'Low' (P4).
    """
    clean_type = resolve_authoritative_ticket_type(ticket_type)
    allowed = ALLOWED_PRIORITIES_BY_TYPE.get(clean_type, ["Medium", "Low"])
    default_prio = DEFAULT_PRIORITY_BY_TYPE.get(clean_type, "Medium")

    if not priority or not str(priority).strip():
        return default_prio

    p_raw = str(priority).strip().lower()

    if "very high" in p_raw or "critical" in p_raw or "p1" in p_raw:
        cand = "Very High"
    elif "high" in p_raw or "p2" in p_raw:
        cand = "High"
    elif "med" in p_raw or "moderate" in p_raw or "p3" in p_raw:
        cand = "Medium"
    elif "low" in p_raw or "minor" in p_raw or "trivial" in p_raw or "p4" in p_raw:
        cand = "Low"
    else:
        cand = default_prio

    # Apply matrix rules
    if clean_type == TICKET_TYPE_CHANGE_REQUEST:
        return "Low"

    if clean_type == TICKET_TYPE_INCIDENT:
        if cand == "Low":
            return "Medium"
        return cand if cand in allowed else "Medium"

    if clean_type in [TICKET_TYPE_SERVICE_REQUEST, TICKET_TYPE_S_PO]:
        if cand == "Very High":
            return "High"
        return cand if cand in allowed else "Low"

    return cand if cand in allowed else default_prio

# Configurable Confidence Thresholds
CONFIDENCE_THRESHOLD_HIGH = 0.85      # 0.85 - 1.00: High confidence -> proceed directly
CONFIDENCE_THRESHOLD_MODERATE = 0.65  # 0.65 - 0.84: Moderate confidence -> evaluate ambiguity
CONFIDENCE_THRESHOLD_LOW = 0.65       # < 0.65: Low confidence -> ask natural clarification question

# Category Definitions & Guidelines
CATEGORY_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    TICKET_TYPE_CHANGE_REQUEST: {
        "name": TICKET_TYPE_CHANGE_REQUEST,
        "definition": (
            "A request to develop, modify, enhance, customize, or introduce functionality in an existing "
            "SAP application, report, process, integration, or business workflow."
        ),
        "typical_scenarios": [
            "New functionality development or custom programs",
            "Additional fields or columns in existing reports or screens",
            "New reports or dashboards",
            "Modifications or enhancements to existing business logic or calculation formulas",
            "Custom SAP development (ABAP, BAPI, BAdI, User Exits, Fiori apps)",
            "Plant-specific or company-code configuration changes requested as business enhancements",
            "New automated validation rules or workflow alterations",
        ],
        "distinction_note": (
            "User wants new, changed, or expanded capabilities. The system is NOT broken; rather, "
            "business requirements have evolved."
        ),
    },
    TICKET_TYPE_INCIDENT: {
        "name": TICKET_TYPE_INCIDENT,
        "definition": (
            "An unexpected interruption, error, failure, dump, bug, or malfunction in existing application functionality."
        ),
        "typical_scenarios": [
            "SAP transaction errors (e.g. ABAP runtime error, dump in ME21N, FB60, VA01)",
            "Existing reports or transactions failing, crashing, or timing out",
            "Incorrect data calculations or posting failures in previously working features",
            "System downtime, network disconnection, or integration/IDoc transmission failures",
            "Material description errors, cost center posting issues, or ledger mismatch bugs",
            "Performance degradation or unexpected system behavior",
        ],
        "distinction_note": (
            "Something that worked before is now broken or behaving unexpectedly. The user is reporting a failure, "
            "not asking for new design."
        ),
    },
    TICKET_TYPE_SERVICE_REQUEST: {
        "name": TICKET_TYPE_SERVICE_REQUEST,
        "definition": (
            "A request for standard user service, operational assistance, access provisioning, information, "
            "or master data support that does not represent a code bug or custom development."
        ),
        "typical_scenarios": [
            "User access requests, role assignments, or permission changes",
            "Password resets or login account unlocks",
            "Master data creation, upload, or routine maintenance support",
            "Standard operational assistance or how-to guidance",
            "Standard configuration assistance or document copy requests",
            "Routine provisioning or deployment assistance",
        ],
        "distinction_note": (
            "Request for standard operational help or permissions. No error has occurred, and no custom software "
            "enhancement is requested."
        ),
    },
    TICKET_TYPE_S_PO: {
        "name": TICKET_TYPE_S_PO,
        "definition": (
            "A distinct category in the AMS database for Standing Purchase Order (S PO) call-offs, "
            "service agreements, or contract-specific tasking."
        ),
        "typical_scenarios": [
            "Standing Purchase Order (S-PO) service call-offs or milestone deliveries",
            "Specialized purchase order contract service operations explicitly identified by client or contract terms",
            "S PO designated operational tasks",
        ],
        "distinction_note": (
            "Preserve as a distinct category. If a request mentions S PO, Standing PO, or Service PO specifically, "
            "classify as S PO."
        ),
    },
}

# Historical Reference Examples (Few-Shot)
HISTORICAL_FEW_SHOT_EXAMPLES: List[Dict[str, Any]] = [
    # Change Request
    {
        "description": "Develop a new custom Z-report for plant-wise open purchase orders with aging analysis.",
        "ticketType": "Change Request",
        "reason": "Requesting development of a new custom report with specific analytics.",
    },
    {
        "description": "Add an additional column for GST Tax Code and Vendor PAN number in the standard sales register.",
        "ticketType": "Change Request",
        "reason": "Requesting enhancement of an existing report by adding new data fields.",
    },
    {
        "description": "Implement automated email notification workflow when a purchase order exceeds $50,000.",
        "ticketType": "Change Request",
        "reason": "Requesting a new automated business process workflow.",
    },
    {
        "description": "Modify the pricing calculation formula in SD condition records to include seasonal surcharge.",
        "ticketType": "Change Request",
        "reason": "Requesting modification of existing pricing logic and business calculation.",
    },
    {
        "description": "Enhance Fiori My Inbox app with custom approval buttons for department heads.",
        "ticketType": "Change Request",
        "reason": "Requesting custom UI enhancement to standard Fiori functionality.",
    },

    # Incident
    {
        "description": "Users getting short dump MESSAGE_TYPE_X when executing transaction FB60 during vendor posting.",
        "ticketType": "Incident",
        "reason": "Unexpected runtime error and system dump in existing transaction FB60.",
    },
    {
        "description": "Material master description showing incorrect values after latest background sync job failed.",
        "ticketType": "Incident",
        "reason": "Existing background sync job failed, causing data corruption/inconsistency.",
    },
    {
        "description": "Unable to release billing document to accounting in VF02; system displays error VF051.",
        "ticketType": "Incident",
        "reason": "Standard billing release functionality blocked by system error.",
    },
    {
        "description": "IDoc ORDERS05 failing with status 51 'Partner profile not found' for inbound purchase orders.",
        "ticketType": "Incident",
        "reason": "Integration IDoc transmission failure blocking inbound order processing.",
    },
    {
        "description": "Cost center report KSB1 is timing out and failing to display actual cost postings.",
        "ticketType": "Incident",
        "reason": "Performance breakdown and timeout failure in existing cost center report.",
    },

    # Service request
    {
        "description": "Please provide display access to transaction ME23N and MM03 for newly joined auditor.",
        "ticketType": "Service request",
        "reason": "Standard access provisioning and role authorization request.",
    },
    {
        "description": "User account unlocked and password reset request for SAP production client 400.",
        "ticketType": "Service request",
        "reason": "Standard user account management and password reset support.",
    },
    {
        "description": "Assistance required for bulk uploading customer master records via LTMC tool.",
        "ticketType": "Service request",
        "reason": "Standard master data upload operational assistance.",
    },
    {
        "description": "Requesting copy of company code 1000 configuration settings for training sandbox client.",
        "ticketType": "Service request",
        "reason": "Operational request for environment copying and configuration reference.",
    },
    {
        "description": "Need guidance on how to run depreciation posting run in AFAB for previous fiscal period.",
        "ticketType": "Service request",
        "reason": "Standard informational guidance and operational how-to assistance.",
    },

    # S PO
    {
        "description": "Create S PO call-off ticket for quarterly database maintenance under Standing PO agreement #4500012.",
        "ticketType": "S PO",
        "reason": "Explicit call-off under a standing purchase order (S PO) contract.",
    },
    {
        "description": "Allocate 20 consulting hours against customer S-PO contract for SAP security audit support.",
        "ticketType": "S PO",
        "reason": "Billable hours allocation against an established S-PO agreement.",
    },
    {
        "description": "S PO milestone deliverable: Q3 SAP Basis transport cleanup and archive validation.",
        "ticketType": "S PO",
        "reason": "Milestone delivery tracked under S PO engagement.",
    },
    {
        "description": "Execution of scheduled preventive maintenance package as per Service PO terms.",
        "ticketType": "S PO",
        "reason": "Preventive maintenance tasks executed under Service PO terms.",
    },
    {
        "description": "Log S PO support activity for annual disaster recovery drill as defined in SLA contract.",
        "ticketType": "S PO",
        "reason": "Specific activity scheduled under S PO contract agreement.",
    },
]


def resolve_authoritative_ticket_type(candidate: Any) -> str:
    """
    Normalizes candidate ticket type strictly to one of the 4 authoritative names:
    - "Incident"
    - "Change Request"
    - "Service request"
    - "S PO"
    Defaults to "Incident" if missing, unrecognized, or blank.
    """
    if candidate is None:
        return TICKET_TYPE_INCIDENT

    clean_str = str(candidate).strip()
    if not clean_str:
        return TICKET_TYPE_INCIDENT

    lower = clean_str.lower()

    # Exact match
    for vt in VALID_TICKET_TYPES:
        if lower == vt.lower():
            return vt

    # S PO check
    if lower in ["s po", "spo", "s-po", "service po", "standing po", "3160"]:
        return TICKET_TYPE_S_PO

    # Change Request check
    if any(k in lower for k in ["change request", "change", "enhancement", "modification", "cr", "new feature", "2092"]):
        return TICKET_TYPE_CHANGE_REQUEST

    # Service Request check
    if any(k in lower for k in ["service request", "service", "access", "sr", "2093"]):
        return TICKET_TYPE_SERVICE_REQUEST

    # Incident check
    if any(k in lower for k in ["incident", "bug", "error", "fault", "issue", "crash", "problem", "dump", "2091"]):
        return TICKET_TYPE_INCIDENT

    # Default
    return TICKET_TYPE_INCIDENT


# ==============================================================================
# AUTHORITATIVE TICKET PRIORITY MATRIX (Strict Table Rules)
# ==============================================================================
# Matrix as defined by Ticket Priority specification:
# - Change Request Steps: P4 - Low (ONLY)
# - Incident Steps:       P1 - Very High, P2 - High, P3 - Medium (NO Low)
# - Service Request:      P2 - High, P3 - Medium, P4 - Low (NO Very High)
# - S PO:                 P2 - High, P3 - Medium, P4 - Low

PRIORITY_VERY_HIGH = "Very High"  # P1
PRIORITY_HIGH = "High"            # P2
PRIORITY_MEDIUM = "Medium"        # P3
PRIORITY_LOW = "Low"              # P4

ALLOWED_PRIORITIES_BY_TYPE: Dict[str, List[str]] = {
    TICKET_TYPE_CHANGE_REQUEST: [PRIORITY_LOW],
    TICKET_TYPE_INCIDENT: [PRIORITY_VERY_HIGH, PRIORITY_HIGH, PRIORITY_MEDIUM],
    TICKET_TYPE_SERVICE_REQUEST: [PRIORITY_HIGH, PRIORITY_MEDIUM, PRIORITY_LOW],
    TICKET_TYPE_S_PO: [PRIORITY_HIGH, PRIORITY_MEDIUM, PRIORITY_LOW],
}

DEFAULT_PRIORITY_BY_TYPE: Dict[str, str] = {
    TICKET_TYPE_CHANGE_REQUEST: PRIORITY_LOW,
    TICKET_TYPE_INCIDENT: PRIORITY_MEDIUM,
    TICKET_TYPE_SERVICE_REQUEST: PRIORITY_LOW,
    TICKET_TYPE_S_PO: PRIORITY_LOW,
}

PRIORITY_DISPLAY_MAPPING: Dict[str, str] = {
    PRIORITY_VERY_HIGH: "P1 - Very High",
    PRIORITY_HIGH: "P2 - High",
    PRIORITY_MEDIUM: "P3 - Medium",
    PRIORITY_LOW: "P4 - Low",
}


def normalize_priority_string(candidate: Optional[Any]) -> Optional[str]:
    """
    Normalizes arbitrary priority strings (e.g. 'p1', 'critical', 'p4', 'med', 'high')
    to standard canonical names: 'Very High', 'High', 'Medium', or 'Low'.
    """
    if candidate is None:
        return None

    clean = str(candidate).strip().lower()
    if not clean:
        return None

    if any(k in clean for k in ["very high", "critical", "p1", "production impacted"]):
        return PRIORITY_VERY_HIGH
    if any(k in clean for k in ["high", "p2", "business impacted"]):
        return PRIORITY_HIGH
    if any(k in clean for k in ["medium", "med", "moderate", "p3"]):
        return PRIORITY_MEDIUM
    if any(k in clean for k in ["low", "minor", "trivial", "p4"]):
        return PRIORITY_LOW

    # Check for direct single digit numbers
    if clean in ["1"]:
        return PRIORITY_VERY_HIGH
    if clean in ["2"]:
        return PRIORITY_HIGH
    if clean in ["3"]:
        return PRIORITY_MEDIUM
    if clean in ["4"]:
        return PRIORITY_LOW

    return None


def get_allowed_priorities_for_type(ticket_type: Optional[str]) -> List[str]:
    """Returns allowed priorities for given ticket type."""
    norm_type = resolve_authoritative_ticket_type(ticket_type)
    return ALLOWED_PRIORITIES_BY_TYPE.get(norm_type, [PRIORITY_MEDIUM])


def adjust_priority_for_ticket_type(candidate_priority: Optional[Any], ticket_type: Optional[str]) -> str:
    """
    Strictly enforces the Ticket Priority Matrix according to Ticket Type:
    - Change Request: ONLY 'Low' (P4 - Low).
    - Incident: 'Very High' (P1), 'High' (P2), or 'Medium' (P3).
                If candidate is 'Low', it is adjusted/promoted to 'Medium'.
                Defaults to 'Medium' if not specified.
    - Service request: 'High' (P2), 'Medium' (P3), or 'Low' (P4).
                       If candidate is 'Very High', it is adjusted/capped to 'High'.
                       Defaults to 'Low' if not specified.
    - S PO: 'High' (P2), 'Medium' (P3), or 'Low' (P4).
            If candidate is 'Very High', it is adjusted/capped to 'High'.
            Defaults to 'Low' if not specified.
    """
    norm_type = resolve_authoritative_ticket_type(ticket_type)
    norm_prio = normalize_priority_string(candidate_priority)
    allowed = ALLOWED_PRIORITIES_BY_TYPE.get(norm_type, [PRIORITY_MEDIUM])
    default_prio = DEFAULT_PRIORITY_BY_TYPE.get(norm_type, PRIORITY_MEDIUM)

    # 1. Change Request: Strictly P4 - Low
    if norm_type == TICKET_TYPE_CHANGE_REQUEST:
        return PRIORITY_LOW

    # 2. Incident: P1 - Very High, P2 - High, P3 - Medium (NO Low allowed)
    if norm_type == TICKET_TYPE_INCIDENT:
        if norm_prio in allowed:
            return norm_prio
        if norm_prio == PRIORITY_LOW:
            # Low is not permitted for Incidents -> adjusted to Medium
            return PRIORITY_MEDIUM
        return default_prio

    # 3. Service request & S PO: P2 - High, P3 - Medium, P4 - Low (NO Very High allowed)
    if norm_type in [TICKET_TYPE_SERVICE_REQUEST, TICKET_TYPE_S_PO]:
        if norm_prio in allowed:
            return norm_prio
        if norm_prio == PRIORITY_VERY_HIGH:
            # Very High is not permitted for Service Request / S PO -> capped at High
            return PRIORITY_HIGH
        return default_prio

    return norm_prio if norm_prio in allowed else default_prio


def check_priority_adjustment(
    candidate_priority: Optional[Any],
    ticket_type: Optional[str],
    is_explicit_request: bool = False
) -> Tuple[str, Optional[str]]:
    """
    Checks if a candidate priority needs adjustment according to the Ticket Priority Matrix.
    Returns: (adjusted_priority, explanation_reason)

    ONLY generates an explanation reason if is_explicit_request=True AND the user-requested
    priority is not among the allowed priorities for that ticket type.
    """
    norm_type = resolve_authoritative_ticket_type(ticket_type)
    norm_prio = normalize_priority_string(candidate_priority)
    adjusted = adjust_priority_for_ticket_type(candidate_priority, norm_type)

    if not is_explicit_request or not norm_prio:
        return adjusted, None

    allowed = ALLOWED_PRIORITIES_BY_TYPE.get(norm_type, [PRIORITY_MEDIUM])
    if norm_prio in allowed:
        return adjusted, None

    # Explicit user request was disallowed:
    if norm_type == TICKET_TYPE_CHANGE_REQUEST:
        reason = (
            f"**Change Request** tickets only allow **P4 - Low** priority. "
            f"Since you requested **{norm_prio}**, it was not permitted and has been set to **Low** per ticket policy."
        )
    elif norm_type == TICKET_TYPE_INCIDENT:
        reason = (
            f"**Incident** tickets do not support **Low** priority (allowed: **P1 - Very High**, **P2 - High**, **P3 - Medium**). "
            f"Since you requested **Low**, it was not permitted and has been adjusted to **Medium**."
        )
    elif norm_type in [TICKET_TYPE_SERVICE_REQUEST, TICKET_TYPE_S_PO]:
        reason = (
            f"**{norm_type}** tickets do not support **P1 - Very High** priority (allowed: **P2 - High**, **P3 - Medium**, **P4 - Low**). "
            f"Since you requested **Very High**, it was not permitted and has been capped at **High**."
        )
    else:
        reason = (
            f"Priority **{norm_prio}** is not allowed for **{norm_type}** tickets. "
            f"Adjusted to **{adjusted}**."
        )

    return adjusted, reason


