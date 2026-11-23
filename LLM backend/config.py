"""
LLM backend/config.py - Centralized Configuration for SLA Monitoring Engine & AMS Service.
"""

import os
from typing import Dict, Set, Optional
from dotenv import load_dotenv

# Centralized Configuration for SLA Monitoring Engine & AMS Service.
# Environment variables are loaded directly from web.config.
import os
from typing import Dict, Set, Optional

# Load environment variables directly from web.config as authoritative source
try:
    from pyi_env_hook import load_from_web_config
    load_from_web_config(override=True)
except Exception:
    pass

# SLA Credentials
SLA_EMAIL: str = os.getenv("SLA_EMAIL") or os.getenv("AMS_EMAIL", "")
SLA_PASSWORD: str = os.getenv("SLA_PASSWORD") or os.getenv("AMS_PASSWORD", "")

# Base URL (loaded from web.config SLA_BASE_URL, AMS_BASE_URL, or HOST + AMS_PORT)
AMS_PORT: str = os.getenv("AMS_PORT", "91")
SLA_BASE_URL: str = (
    os.getenv("SLA_BASE_URL")
    or os.getenv("AMS_BASE_URL")
    or f"http://{os.getenv('HOST', '172.16.33.217')}:{AMS_PORT}"
).rstrip("/")

GET_TICKET_DETAILS_ENDPOINT: str = os.getenv("GET_TICKET_DETAILS_ENDPOINT", "/api/Ticket/GetTicketDetails")
GET_TICKET_STEPS_ENDPOINT: str = os.getenv("GET_TICKET_STEPS_ENDPOINT", "/api/Ticket/GetTicketSteps")
SEND_TICKET_REMINDER_ENDPOINT: str = os.getenv("SEND_TICKET_REMINDER_ENDPOINT", "/api/Ticket/SendTicketStepReminder")

# SLA API Endpoints
TICKET_DETAILS_API_URL: str = (
    os.getenv("TICKET_DETAILS_API_URL")
    or f"{SLA_BASE_URL}/{GET_TICKET_DETAILS_ENDPOINT.lstrip('/')}"
)
TICKET_STEP_REMINDER_API_URL: str = (
    os.getenv("TICKET_STEP_REMINDER_API_URL")
    or f"{SLA_BASE_URL}/{SEND_TICKET_REMINDER_ENDPOINT.lstrip('/')}"
)
TICKET_STEPS_API_URL: str = (
    os.getenv("TICKET_STEPS_API_URL")
    or f"{SLA_BASE_URL}/{GET_TICKET_STEPS_ENDPOINT.lstrip('/')}"
)

# Document Type Constants
BRD_DOC_TYPE: str = os.getenv("BRD_DOC_TYPE", "BUD")
FS_DOC_TYPE: str = os.getenv("FS_DOC_TYPE", "FS")

# Business Hours Window (Default: 9:00 AM to 7:00 PM; configurable via web.config/env)
BUSINESS_START_HOUR: int = int(os.getenv("BUSINESS_START_HOUR", "9"))
BUSINESS_END_HOUR: int = int(os.getenv("BUSINESS_END_HOUR", "19"))
LOW_MED_REMINDER_HOUR: int = int(os.getenv("LOW_MED_REMINDER_HOUR", os.getenv("P3_P4_REMINDER_HOUR", "18")))
P3_P4_REMINDER_HOUR: int = LOW_MED_REMINDER_HOUR
SHORT_SLA_REMINDER_INTERVAL_MINUTES: int = int(os.getenv("SHORT_SLA_REMINDER_INTERVAL_MINUTES", "15"))

# Priority Reminder Intervals (Payload values: 1=Low, 2=Medium, 3=High, 4=Very High)
PRIORITY_REMINDER_INTERVALS_HOURS: Dict[int, float] = {
    4: 1.0,   # Priority 4 (Very High): Every 1 hour (9 AM - 7 PM window, Mon-Fri)
    3: 1.0,   # Priority 3 (High): Every 1 hour (9 AM - 7 PM window, Mon-Fri)
    2: 24.0,  # Priority 2 (Medium): Daily at 6 PM (18:00) (Mon-Fri only)
    1: 24.0,  # Priority 1 (Low): Daily at 6 PM (18:00) (Mon-Fri only)
}

# Priority Name Mapping
PRIORITY_NAMES: Dict[int, str] = {
    4: "Very High",
    3: "High",
    2: "Medium",
    1: "Low",
}

# Active and Closed Ticket Status values (case-insensitive matching)
ACTIVE_TICKET_STATUS: str = os.getenv("ACTIVE_TICKET_STATUS", "inprocess").strip().lower()

# Active in-process statuses where Neovatic consultants are actively working on the ticket
ACTIVE_IN_PROCESS_STATUSES: Set[str] = {
    "inprocess",
    "in process",
    "in proc: functional analysis",
    "in proc: technical development",
    "in proc: technical design",
    "in proc: functional testing",
}

CLOSED_TICKET_STATUSES: Set[str] = set(
    status.strip().lower()
    for status in os.getenv("CLOSED_TICKET_STATUSES", "closed,completed,resolved").split(",")
    if status.strip()
)


def is_active_in_process_status(ticket_status: Optional[str]) -> bool:
    """
    Returns True if ticket status is actively in-process on our side (monitored for SLA):
    - 'inprocess' or 'in process'
    - 'In Proc: Functional Analysis'
    - 'In Proc: Technical Development'
    - 'In Proc: Technical Design'
    - 'In Proc: Functional Testing'
    - Or any status starting with 'in proc:'
    Returns False for customer-waiting statuses (e.g. 'WCA: ...', 'Pending', etc.)
    where SLA monitoring should pause.
    """
    if not ticket_status:
        return False
    s = str(ticket_status).strip().lower()
    if s in ACTIVE_IN_PROCESS_STATUSES:
        return True
    if s.startswith("in proc:") or s.startswith("in proc"):
        return True
    return False

