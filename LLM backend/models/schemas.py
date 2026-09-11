"""
models/schemas.py - Exact Pydantic models for API request and response.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator


# --- Strict Allowed Ticket Types ---
VALID_TICKET_TYPES = [
    "Change Request",
    "S PO",
    "Incident",
    "Service Request"
]


def normalize_ticket_type(candidate: Optional[str]) -> str:
    """
    Normalizes candidate ticket type to one of the strict allowed types:
    - "Change Request"
    - "S PO"
    - "Incident"
    - "Service Request"
    Defaults to "Incident" if missing, unrecognized, or blank.
    """
    if not candidate or not str(candidate).strip():
        return "Incident"

    c_clean = str(candidate).strip()
    c_lower = c_clean.lower()

    # Direct match (case-insensitive)
    for vt in VALID_TICKET_TYPES:
        if c_lower == vt.lower():
            return vt

    # Change Request variations (CR, Change, Request for Change)
    if "change request" in c_lower or c_lower == "cr" or "change" in c_lower or "rfc" in c_lower:
        return "Change Request"

    # S PO variations (S PO, SPO, S-PO, PO, Purchase Order)
    import re
    if re.search(r'\b(?:s\s*po|spo|s-po)\b', c_lower) or "purchase order" in c_lower:
        return "S PO"

    # Service Request variations (SR, Service, Request)
    if "service request" in c_lower or c_lower == "sr" or "service" in c_lower:
        return "Service Request"

    # Incident variations (Incident, Bug, Issue, Problem, Error, Fault)
    if any(k in c_lower for k in ["incident", "bug", "issue", "problem", "error", "fault"]):
        return "Incident"

    # Fallback default
    return "Incident"


# --- Chat Request & Response Schemas ---
class ChatRequest(BaseModel):
    username: str = Field(..., description="User AMS username/email", example="jaswanth.b@neovatic.com")
    message: str = Field(..., description="Query message to the chatbot", example="Show all High priority tickets")
    Bearer: str = Field(..., description="AMS JWT Bearer authentication token", example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    session_id: Optional[str] = Field(None, description="Optional unique session identifier")
    ticket_draft: Optional[Dict[str, Any]] = Field(None, description="Optional active ticket draft payload")
    history: Optional[List[Dict[str, Any]]] = Field(None, description="Optional chat conversation history")
    screenshort: Optional[Any] = Field(None, description="Optional screenshot path, URL, filename, or File data type")
    Screenshot: Optional[Any] = Field(None, description="Optional screenshot alias matching Swagger field name")


class ChatResponse(BaseModel):
    success: bool
    response: str
    data: Optional[List[Dict[str, Any]]] = None
    count: int = 0
    error: Optional[str] = None
    ticket_draft: Optional[Dict[str, Any]] = Field(None, description="Active ticket creation draft if in progress")
    action_type: Optional[str] = Field(None, description="Action category: 'query', 'ticket_preview', 'ticket_created', 'ticket_cancelled'")


# --- Ticket Management Schemas ---
class TicketCreateRequest(BaseModel):
    clientName: Optional[str] = Field(None, description="Registered client name", example="Karamtara Engineering Pvt Ltd")
    ClientName: Optional[str] = Field(None, description="Swagger PascalCase alias")
    ams: Optional[str] = Field(None, description="AMS system/instance name", example="AMS")
    AMS: Optional[str] = Field(None, description="Swagger PascalCase alias")
    typeofticket: Optional[str] = Field(
        default="Incident",
        description="Type of ticket. Allowed values: 'Change Request', 'S PO', 'Incident', 'Service Request'",
        example="Incident"
    )
    Typeofticket: Optional[str] = Field(None, description="Swagger PascalCase alias")
    priority: Optional[str] = Field(None, description="Priority: 'Low', 'Medium', 'High', or 'Very High'", example="High")
    Priority: Optional[str] = Field(None, description="Swagger PascalCase alias")
    reportedon: Optional[str] = Field(None, description="Reported date-time in ISO format", example="2026-09-03T10:30:00")
    Reportedon: Optional[str] = Field(None, description="Swagger PascalCase alias")
    reportedontime: Optional[str] = Field(None, description="Reported time", example="10:30:00")
    Reportedontime: Optional[str] = Field(None, description="Swagger PascalCase alias")
    reportedby: Optional[str] = Field(None, description="Name or email of reporter", example="jaswanth.b@neovatic.com")
    Reportedby: Optional[str] = Field(None, description="Swagger PascalCase alias")
    descriptionofTicket: Optional[str] = Field(None, description="Detailed ticket issue description", example="SAP login error when accessing FICO module")
    DescriptionofTicket: Optional[str] = Field(None, description="Swagger PascalCase alias")
    screenshort: Optional[Any] = Field(None, description="Screenshot path, URL, filename, or File data type", example="")
    Screenshot: Optional[Any] = Field(None, description="Swagger binary/string screenshot alias")
    remarks: Optional[str] = Field(None, description="Additional remarks or notes", example="Urgent request")
    Remarks: Optional[str] = Field(None, description="Swagger PascalCase alias")
    assigntogroup: Optional[str] = Field(None, description="Target group/module. Auto-classified if omitted.", example="SAP-FICO")
    Assigntogroup: Optional[str] = Field(None, description="Swagger PascalCase alias")

    @field_validator("typeofticket", "Typeofticket", mode="before")
    @classmethod
    def validate_type_of_ticket(cls, v):
        return normalize_ticket_type(v)


class RouteModuleRequest(BaseModel):
    description: str = Field(..., description="Ticket issue description to auto-classify", example="Unable to create Purchase Order in SAP MM")


class RouteModuleResponse(BaseModel):
    description: str
    assigned_group: str
