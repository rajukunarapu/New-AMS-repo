"""
routers/tickets.py - Direct AMS Ticket management and Routing endpoints.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException, Query, status
from ams_api import AMSApi
from Module_Router import assign_group, GROUPS
from models.schemas import TicketCreateRequest, RouteModuleRequest, RouteModuleResponse, normalize_ticket_type

router = APIRouter(prefix="/api", tags=["Tickets & AMS Management"])


def _get_ams_client(authorization: Optional[str] = None, email: Optional[str] = None) -> AMSApi:
    ams = AMSApi(email=email)
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        ams.token = token
    return ams


@router.get(
    "/tickets",
    summary="List all AMS Tickets",
    description="Retrieves tickets from AMS using the Bearer token provided in the Authorization header."
)
def get_tickets(
    authorization: str = Header(..., description="Bearer <token>"),
    email: Optional[str] = Query(None, description="User email (optional)")
):
    try:
        ams = _get_ams_client(authorization=authorization, email=email)
        tickets = ams.get_tickets()
        return {
            "success": True,
            "count": len(tickets) if isinstance(tickets, list) else 0,
            "data": tickets
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tickets: {str(err)}"
        )


@router.get(
    "/tickets/status",
    summary="List AMS Ticket Statuses",
    description="Retrieves status list from AMS /api/Ticket/Status."
)
def get_ticket_status(
    authorization: str = Header(..., description="Bearer <token>"),
    email: Optional[str] = Query(None, description="User email (optional)")
):
    try:
        ams = _get_ams_client(authorization=authorization, email=email)
        statuses = ams.get_ticket_status()
        return {
            "success": True,
            "data": statuses
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ticket statuses: {str(err)}"
        )


@router.post(
    "/tickets/create",
    summary="Create a new Ticket in AMS",
    description="Creates a ticket directly in AMS /api/Ticket/CreateTicket. If assigntogroup is not supplied, it will be auto-classified using AI."
)
def create_ticket(
    ticket: TicketCreateRequest,
    authorization: str = Header(..., description="Bearer <token>")
):
    try:
        reporter_email = ticket.reportedby if (ticket.reportedby and "@" in ticket.reportedby) else None
        ams = _get_ams_client(authorization=authorization, email=reporter_email)
        payload = ticket.model_dump(exclude_none=True)
        
        # Auto-classify group if not provided
        if not payload.get("assigntogroup") and payload.get("descriptionofTicket"):
            payload["assigntogroup"] = assign_group(payload.get("descriptionofTicket", ""))
            
        from datetime import datetime
        if not payload.get("reportedon"):
            payload["reportedon"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        if not payload.get("reportedontime"):
            payload["reportedontime"] = datetime.now().strftime("%H:%M:%S")
        payload["typeofticket"] = normalize_ticket_type(payload.get("typeofticket"))

        result = ams.create_ticket(payload)
        return {
            "success": True,
            "message": "Ticket created successfully in AMS.",
            "data": result
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create ticket: {str(err)}"
        )


@router.get(
    "/groups",
    summary="List Valid Assignment Groups / Modules",
    description="Returns the full list of valid AMS assignment groups."
)
def get_groups():
    return {
        "success": True,
        "count": len(GROUPS),
        "groups": GROUPS
    }


@router.post(
    "/route-module",
    response_model=RouteModuleResponse,
    summary="Auto-classify Assignment Group",
    description="Uses NVIDIA / Gemini LLM routing agent to classify ticket description into the correct AMS Assignment Group."
)
def route_module(request: RouteModuleRequest):
    assigned = assign_group(request.description)
    return RouteModuleResponse(
        description=request.description,
        assigned_group=assigned
    )
