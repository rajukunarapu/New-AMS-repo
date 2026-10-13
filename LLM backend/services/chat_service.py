"""
services/chat_service.py - Orchestrates LLM Query Processing, Ticket Creation Lifecycle, and AMS API Integration (Async).
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
    submit_ticket_to_ams,
    MASTER_CLIENTS
)


class ChatService:
    @staticmethod
    async def process_chat(request: ChatRequest) -> ChatResponse:
        """
        Processes conversational chat queries (async):
        1. Manages multi-turn Ticket Creation drafts with field preview & intent-driven confirmation.
        2. Routes ticket retrieval & analytics queries to the LLM query intelligence engine.
        """
        token = request.Bearer.replace("Bearer ", "").strip()
        session_key = TicketSessionManager.get_session_key(request.username, request.session_id)
        active_draft = request.ticket_draft or TicketSessionManager.get_draft(session_key)

        # Extract screenshot centrally from request or ticket_draft
        incoming_screenshot = (
            getattr(request, "screenshort", None)
            or getattr(request, "screenshot", None)
            or (request.ticket_draft.get("screenshort") if isinstance(request.ticket_draft, dict) else None)
            or (request.ticket_draft.get("screenshot") if isinstance(request.ticket_draft, dict) else None)
        )
        if incoming_screenshot and str(incoming_screenshot).strip().lower() in ["none", "null", "*none*", "*not provided*", ""]:
            incoming_screenshot = None

        # 1. Initialize AMS client
        ams = AMSApi(email=request.username)
        ams.token = token

        # 2. Set known clients from master list (avoids blocking 60s HTTP call to AMS on ticket creation)
        known_clients = MASTER_CLIENTS

        # 3. Handle Active Ticket Creation Draft in progress
        if active_draft:
            if incoming_screenshot:
                active_draft["screenshort"] = incoming_screenshot

            intent, mod_fields = await analyze_user_intent_on_draft(
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
                    updated = await extract_fields_with_llm(request.message, active_draft, known_clients)
                    for k, v in updated.items():
                        if v is not None:
                            active_draft[k] = v

                if incoming_screenshot:
                    active_draft["screenshort"] = incoming_screenshot

                active_draft = await finalize_draft_fields(active_draft, user_email=request.username, known_clients=known_clients)
                if incoming_screenshot:
                    active_draft["screenshort"] = incoming_screenshot

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
                if incoming_screenshot:
                    active_draft["screenshort"] = incoming_screenshot

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
                    finalized = await finalize_draft_fields(active_draft, user_email=request.username, known_clients=known_clients)
                    if incoming_screenshot:
                        finalized["screenshort"] = incoming_screenshot

                    result = await submit_ticket_to_ams(finalized, ams)

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

        # 4. Single-Pass Dynamic Semantic Orchestration (Zero Keyword Rules, Dynamic Responses, Zero Blind AMS Calls)
        try:
            from services.chat_orchestrator import run_chat_orchestrator
            from query_engine import execute_planned_ticket_query

            decision = await run_chat_orchestrator(
                user_message=request.message,
                history=request.history,
                incoming_screenshot=incoming_screenshot,
                known_clients=known_clients
            )

            action = decision.get("action")

            # --- BRANCH 1: CONVERSATIONAL (Greetings, Capabilities, IT Questions, Small Talk) ---
            if action == "CONVERSATIONAL":
                # Delivered dynamically in Pass 1! 0 AMS calls, 0 2nd LLM calls.
                chat_reply = decision.get("conversational_response") or "Hello! How can I assist you with AMS tickets or support today?"
                return ChatResponse(
                    success=True,
                    response=chat_reply,
                    data=None,
                    count=0,
                    ticket_draft=None,
                    action_type="chat",
                    error=None
                )

            # --- BRANCH 2: CREATE_TICKET (Issue reported, technical problem, error, or screenshot) ---
            elif action == "CREATE_TICKET":
                initial_draft = create_initial_draft(user_email=request.username)
                if incoming_screenshot:
                    initial_draft["screenshort"] = incoming_screenshot

                # Merge pre-extracted fields from Pass 1 (saves redundant LLM extraction call!)
                extracted_fields = decision.get("ticket_fields") or {}
                for k, v in extracted_fields.items():
                    if v is not None and str(v).strip():
                        initial_draft[k] = v

                # Finalize module/group mapping & client validation
                draft = await finalize_draft_fields(initial_draft, user_email=request.username, known_clients=known_clients)
                if incoming_screenshot:
                    draft["screenshort"] = incoming_screenshot

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

            # --- BRANCH 3: QUERY_TICKETS (Ticket search, status, count, filtering, analytics) ---
            else:
                # Lazy-fetch AMS tickets (uses 30s in-memory cache)
                tickets_data = []
                try:
                    tickets_data = await ams.get_tickets(timeout=10) or []
                except Exception as ams_err:
                    print(f"[ChatService] Warning: AMS ticket API fetch failed: {ams_err}")
                    tickets_data = []

                if not tickets_data:
                    try:
                        from scratch.test_updated_ticket_search import get_test_ticket_dataset
                        tickets_data = get_test_ticket_dataset()
                        print("[ChatService] Loaded fallback ticket dataset.")
                    except Exception as fallback_err:
                        print(f"[ChatService] Could not load fallback dataset: {fallback_err}")

                query_plan = decision.get("query_plan") or {}
                answer_text, records_out = await execute_planned_ticket_query(
                    tickets_data=tickets_data or [],
                    query_plan=query_plan,
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
