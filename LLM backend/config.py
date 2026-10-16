"""
LLM backend/config.py - Centralized Configuration for SLA Monitoring Engine & AMS Service.
"""

import os
from typing import Dict, Set
# Load environment variables exclusively from web.config
try:
    from pyi_env_hook import load_from_web_config
    load_from_web_config()
except Exception:
    pass

# SLA Credentials
SLA_EMAIL: str = os.getenv("SLA_EMAIL") or os.getenv("AMS_EMAIL", "")
SLA_PASSWORD: str = os.getenv("SLA_PASSWORD") or os.getenv("AMS_PASSWORD", "")

# Base URL (loaded from web.config SLA_BASE_URL, AMS_BASE_URL, or HOST)
SLA_BASE_URL: str = (
    os.getenv("SLA_BASE_URL")
    or os.getenv("AMS_BASE_URL")
    or (f"http://{os.getenv('HOST', '127.0.0.1')}" if not os.getenv("HOST", "").startswith("http") else os.getenv("HOST"))
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

# Business Hours Window (9:00 AM to 7:00 PM)
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

CLOSED_TICKET_STATUSES: Set[str] = set(
    status.strip().lower()
    for status in os.getenv("CLOSED_TICKET_STATUSES", "closed,completed,resolved").split(",")
    if status.strip()
)

