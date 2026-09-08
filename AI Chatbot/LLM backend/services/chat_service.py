"""
services/chat_service.py - Orchestrates LLM Query Processing, Ticket Creation Lifecycle, and AMS API Integration.
"""

from typing import Dict, Any, List, Optional
from ams_api import AMSApi
from query_engine import process_ticket_query
from models.schemas import ChatRequest, ChatResponse
from services.ticket_creator_service import (
    TicketSessionManager,
    is_ticket_creation_prompt,
    is_capability_or_info_question,
    create_initial_draft,
    extract_fields_with_llm,
    finalize_draft_fields,
    get_missing_core_fields,
    analyze_user_intent_on_draft,
    format_preview_markdown,
    submit_ticket_to_ams
)


class ChatService:
    @staticmethod
    def process_chat(request: ChatRequest) -> ChatResponse:
        """
        Processes conversational chat queries:
        1. Manages multi-turn Ticket Creation drafts with field preview & intent-driven confirmation.
        2. Routes ticket retrieval & analytics queries to the LLM query intelligence engine.
        """
        token = request.Bearer.replace("Bearer ", "").strip()
        session_key = TicketSessionManager.get_session_key(request.username, request.session_id)
        active_draft = request.ticket_draft or TicketSessionManager.get_draft(session_key)

        # 1. Initialize AMS client
        ams = AMSApi(email=request.username)
        ams.token = token

        # 2. Fetch existing tickets for context / client resolution (tolerant of empty/unauthorized)
        tickets_data = []
        try:
            tickets_data = ams.get_tickets(timeout=3) or []
        except Exception as err:
            # If fetching tickets fails (e.g. offline or empty), ticket creation should still function
            tickets_data = []

        known_clients = []
        if tickets_data:
            known_clients = sorted(list({str(t.get("clientName", "")).strip() for t in tickets_data if t.get("clientName")}))

        # 3. Handle Active Ticket Creation Draft in progress
        if active_draft:
            intent, mod_fields = analyze_user_intent_on_draft(
                user_message=request.message,
                current_draft=active_draft,
                history=request.history,
                known_clients=known_clients
            )

            # --- User cancels ticket creation ---
            if intent == "cancel":
                TicketSessionManager.clear_draft(session_key)
                return ChatResponse(
                    success=True,
                    response="**Ticket creation cancelled.** Your ticket draft has been cleared. How else can I assist you?",
                    ticket_draft=None,
                    action_type="ticket_cancelled",
                    count=0
                )

            # --- User modifies fields or provides field updates ---
            elif intent == "modify" or (mod_fields and len(mod_fields) > 0):
                # Merge modified fields
                if mod_fields:
                    for k, v in mod_fields.items():
                        if v is not None:
                            active_draft[k] = v
                else:
                    updated = extract_fields_with_llm(request.message, active_draft, known_clients)
                    for k, v in updated.items():
                        if v is not None:
                            active_draft[k] = v

                active_draft = finalize_draft_fields(active_draft, user_email=request.username, known_clients=known_clients)
                missing = get_missing_core_fields(active_draft)
                active_draft["_pending_field"] = missing[0] if missing else None
                active_draft["_awaiting_confirmation"] = (len(missing) == 0)
                TicketSessionManager.set_draft(session_key, active_draft)

                preview_md = format_preview_markdown(active_draft, missing)
                return ChatResponse(
                    success=True,
                    response=preview_md,
                    ticket_draft=active_draft,
                    action_type="ticket_preview",
                    count=0
                )

            # --- User affirms/confirms ticket creation ---
            elif intent == "confirm":
                missing = get_missing_core_fields(active_draft)
                if missing:
                    # Still missing essential fields
                    active_draft["_pending_field"] = missing[0]
                    active_draft["_awaiting_confirmation"] = False
                    TicketSessionManager.set_draft(session_key, active_draft)
                    preview_md = format_preview_markdown(active_draft, missing)
                    return ChatResponse(
                        success=True,
                        response=preview_md,
                        ticket_draft=active_draft,
                        action_type="ticket_preview",
                        count=0
                    )

                # If full draft preview was NOT shown yet or awaiting confirmation flag is missing, show preview first!
                if not active_draft.get("_awaiting_confirmation"):
                    active_draft["_pending_field"] = None
                    active_draft["_awaiting_confirmation"] = True
                    TicketSessionManager.set_draft(session_key, active_draft)
                    preview_md = format_preview_markdown(active_draft, missing)
                    return ChatResponse(
                        success=True,
                        response=preview_md,
                        ticket_draft=active_draft,
                        action_type="ticket_preview",
                        count=0
                    )

                # All fields ready AND preview was shown & explicitly confirmed! Submit to /api/Ticket/CreateTicket
                try:
                    finalized = finalize_draft_fields(active_draft, user_email=request.username, known_clients=known_clients)
                    result = submit_ticket_to_ams(finalized, ams)

                    # Clear session draft
                    TicketSessionManager.clear_draft(session_key)

                    ticket_ref = (
                        result.get("ticketNo")
                        or result.get("ticketId")
                        or result.get("id")
                        or result.get("data", {}).get("ticketNo")
                        or result.get("message")
                        or "Created"
                    )

                    success_response = (
                        f"### Ticket Created Successfully in AMS\n\n"
                        f"Your ticket has been recorded in the live AMS database.\n\n"
                        f"- **Ticket Reference / Number**: `{ticket_ref}`\n"
                        f"- **Client Name**: **{finalized.get('clientName')}**\n"
                        f"- **Assigned Group**: `{finalized.get('assigntogroup')}`\n"
                        f"- **Priority**: `{finalized.get('priority')}`\n"
                        f"- **Description**: {finalized.get('descriptionofTicket')}\n"
                        f"- **Reported By**: {finalized.get('reportedby')}\n"
                        f"- **Reported Date & Time**: `{finalized.get('reportedon')}` ({finalized.get('reportedontime')})\n\n"
                        f"*(Status: Saved to `/api/Ticket/CreateTicket`)*"
                    )

                    return ChatResponse(
                        success=True,
                        response=success_response,
                        data=[result] if isinstance(result, dict) else None,
                        count=1,
                        ticket_draft=None,
                        action_type="ticket_created",
                        error=None
                    )

                except Exception as err:
                    err_msg = str(err)
                    return ChatResponse(
                        success=False,
                        response=(
                            f"### Ticket Creation Failed\n\n"
                            f"Live AMS server returned an error: `{err_msg}`\n\n"
                            f"Your draft has been preserved. You can modify any field (e.g. *'Change priority to High'* or *'Client is Karamtara'*) and try again."
                        ),
                        ticket_draft=active_draft,
                        action_type="ticket_preview",
                        count=0,
                        error=err_msg
                    )

            # --- Unrelated query: proceed to query engine while keeping draft ---
            else:
                pass

        # 3.5 Check if message is a capability/informational question about ticket creation
        if is_capability_or_info_question(request.message):
            info_response = (
                "### Yes, I can create and submit tickets in AMS for you\n\n"
                "You can create a ticket by simply describing your issue or request in natural language.\n\n"
                "**Examples of how to ask:**\n"
                "- *\"Create a ticket for Karamtara: SAP login error in FICO module, priority High\"*\n"
                "- *\"Raise a ticket for ATG with description purchase order approval failed\"*\n"
                "- *\"I need to open a High priority ticket for Karamtara\"*\n\n"
                "Just tell me your issue description and client name, and I will generate a ticket draft preview for you to confirm!"
            )
            return ChatResponse(
                success=True,
                response=info_response,
                data=None,
                count=0,
                ticket_draft=None,
                action_type="query",
                error=None
            )

        # 4. Check if new message initiates a Ticket Creation request
        if is_ticket_creation_prompt(request.message):
            initial_draft = create_initial_draft(user_email=request.username)
            draft = extract_fields_with_llm(request.message, initial_draft, known_clients)
            draft = finalize_draft_fields(draft, user_email=request.username, known_clients=known_clients)
            missing = get_missing_core_fields(draft)
            draft["_pending_field"] = missing[0] if missing else None
            draft["_awaiting_confirmation"] = (len(missing) == 0)
            TicketSessionManager.set_draft(session_key, draft)

            preview_md = format_preview_markdown(draft, missing)

            return ChatResponse(
                success=True,
                response=preview_md,
                ticket_draft=draft,
                action_type="ticket_preview",
                count=0,
                error=None
            )

        # 5. Process general queries via LLM Ticket Intelligence Engine
        try:
            answer_text, records_out = process_ticket_query(
                tickets_data=tickets_data or [],
                user_question=request.message,
                history=request.history
            )
            count = len(records_out) if isinstance(records_out, list) else 0

            return ChatResponse(
                success=True,
                response=answer_text,
                data=records_out,
                count=count,
                ticket_draft=None,
                action_type="query",
                error=None
            )
        except Exception as err:
            return ChatResponse(
                success=False,
                response=f"An error occurred while processing your request: {str(err)}",
                data=None,
                count=0,
                ticket_draft=None,
                action_type="query",
                error=str(err)
            )
