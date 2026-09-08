"""
routers/chat.py - Chat & Natural Language Query endpoint.
"""

from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from models.schemas import ChatRequest, ChatResponse
from services.chat_service import ChatService

router = APIRouter(prefix="/api", tags=["Chat & LLM Intelligence"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Process Chat Query with LLM",
    description="Accepts username, Bearer token, and message. Processes query via the LLM ticket intelligence engine."
)
def chat_endpoint(
    request: ChatRequest,
    authorization: Optional[str] = Header(None, description="Optional Bearer token header")
):
    # If Bearer token was provided in the Authorization header instead of the body, populate it
    if not request.Bearer and authorization:
        request.Bearer = authorization.replace("Bearer ", "").strip()

    if not request.Bearer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required."
        )

    return ChatService.process_chat(request=request)
