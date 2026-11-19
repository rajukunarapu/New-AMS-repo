"""
models/schemas.py - Exact Pydantic models for API request and response.
"""

from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_validator

# --- Strict Allowed Ticket Types ---
VALID_TICKET_TYPES = [
    "Incident",
    "Change Request",
    "Service request",
    "S PO"
]


def normalize_ticket_type(candidate: Optional[Any]) -> str:
    """
    Normalizes candidate ticket type to one of the strict authoritative types:
    - "Incident"
    - "Change Request"
    - "Service request"
    - "S PO"
    Defaults to "Incident" if missing, unrecognized, or blank.
    """
    if candidate is None:
        return "Incident"

    clean_str = str(candidate).strip()
    if not clean_str:
        return "Incident"

    lower = clean_str.lower()

    # Exact match
    for vt in VALID_TICKET_TYPES:
        if lower == vt.lower():
            return vt

    # S PO check
    if lower in ["s po", "spo", "s-po", "service po", "standing po", "3160"]:
        return "S PO"

    # Change Request check
    if any(k in lower for k in ["change request", "change", "enhancement", "modification", "cr", "new feature", "2092"]):
        return "Change Request"

    # Service Request check
    if any(k in lower for k in ["service request", "service", "access", "sr", "2093"]):
        return "Service request"

    # Incident check
    if any(k in lower for k in ["incident", "bug", "error", "fault", "issue", "crash", "problem", "dump", "2091"]):
        return "Incident"

    # Default
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
    typeofticket: Optional[Union[str, int]] = Field(
        default="Incident",
        description="Type of ticket (Incident, Change Request, Service request, S PO)",
        example="Incident"
    )
    Typeofticket: Optional[Union[str, int]] = Field(None, description="Swagger PascalCase alias")
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
        if v is None:
            return "Incident"
        return normalize_ticket_type(v)


class RouteModuleRequest(BaseModel):
    description: str = Field(..., description="Ticket issue description to auto-classify", example="Unable to create Purchase Order in SAP MM")


class RouteModuleResponse(BaseModel):
    description: str
    assigned_group: str
