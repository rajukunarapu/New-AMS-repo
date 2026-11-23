"""
services/classification_service.py - Intelligent Semantic Ticket Classification Engine.

Implements semantic classification for Neo AI:
1. Understands full context of user issue (malfunction vs enhancement vs service vs S PO).
2. Uses multi-turn conversation context to resolve follow-up classifications.
3. Evaluates confidence against configurable thresholds (High >=0.85, Moderate 0.65-0.84, Low <0.65).
4. Generates conversational clarification questions when ambiguous without breaking ticket flow.
5. Handles multi-intent prompts (detecting multiple independent requests).
6. Uses authoritative Ticket Type names ("Incident", "Change Request", "Service request", "S PO").
"""

import re
import json
from typing import Dict, Any, List, Optional
from query_engine import _call_llm
from services.classification_config import (
    TICKET_TYPE_CHANGE_REQUEST,
    TICKET_TYPE_INCIDENT,
    TICKET_TYPE_S_PO,
    TICKET_TYPE_SERVICE_REQUEST,
    VALID_TICKET_TYPES,
    CONFIDENCE_THRESHOLD_HIGH,
    CONFIDENCE_THRESHOLD_MODERATE,
    CONFIDENCE_THRESHOLD_LOW,
    HISTORICAL_FEW_SHOT_EXAMPLES,
    resolve_authoritative_ticket_type
)


CLASSIFIER_SYSTEM_PROMPT = """You are the Senior Enterprise Ticket Classification Engine for Neovatic AMS (Application Management Services).
Your primary mission is to analyze user prompts and conversation history to determine the exact, authoritative SAP Ticket Category.

AUTHORITATIVE TICKET CATEGORIES:
1. "Change Request":
   - Definition: A request to develop, modify, enhance, customize, or introduce new functionality into an existing SAP system, report, program, or workflow.
   - Core Indicator: The user is requesting a new capability, additional report column/field, custom report, logic tweak, or UI enhancement. The system is NOT broken; requirements have changed.
   - Examples: "We need an extra column in PO report", "Develop new landed cost calculation", "Add validation in delivery screen", "Enhance Fiori My Inbox app".

2. "Incident":
   - Definition: An unexpected interruption, error, bug, failure, dump, or malfunction in existing SAP functionality.
   - Core Indicator: Something that previously worked or was expected to work is failing, producing wrong results, crashing, or timing out.
   - Examples: "Unable to post invoice in FB60 due to dump", "Material master description showing wrong values", "Report times out".

3. "Service request":
   - Definition: A request for standard operational support, user access, permissions, password reset, master data maintenance, or how-to guidance.
   - Core Indicator: Routine operational assistance or access provisioning. No software error has occurred, and no custom development is requested.
   - Examples: "Please provide access to ME21N for new user", "Password reset for user in production", "Guidance on running depreciation".

4. "S PO":
   - Definition: Standing Purchase Order (S PO) or Service PO contract-designated tasks, service call-offs, or deliverables tracked under specific S-PO agreements.
   - Core Indicator: Explicitly refers to S PO, Standing PO, Service PO agreement, or contracted milestone hours.
   - Note: Do NOT classify standard purchase order transaction errors as S PO (those are Incidents or Change Requests). Only classify as S PO when referring to S PO / Service PO contract call-offs or agreements.

CLASSIFICATION & CONFIDENCE RULES:
- High Confidence (0.85 - 1.00): Intent is clear from context. "requiresClarification": false.
- Moderate Confidence (0.65 - 0.84): Intent is mostly clear. Proceed without clarification unless genuinely conflicting.
- Low Confidence (< 0.65) / Ambiguous: Description is genuinely vague (e.g. "I have something about the PO report"). "requiresClarification": true, provide a polite "clarificationQuestion".
- Multi-Intent Detection: If the user combined two distinct requests (e.g., "Report is failing and we also need a new field"), flag "multiIntent": true and describe both intents.

OUTPUT FORMAT (STRICT JSON ONLY, NO MARKDOWN, NO CODE FENCES):
{
  "intent": "CREATE_TICKET",
  "ticketType": "Change Request" | "Incident" | "Service request" | "S PO",
  "confidence": 0.95,
  "reason": "<Concise 1-sentence explanation of why this category was chosen>",
  "requiresClarification": false,
  "clarificationQuestion": null,
  "multiIntent": false,
  "multiIntentDetails": null
}
"""


class TicketClassifier:
    """
    Dedicated semantic classification engine for Neo AI AMS tickets.
    """

    @staticmethod
    def _sanitize_conversation_history(history: Optional[List[Dict[str, Any]]]) -> str:
        """Formats the last few conversation turns into clean, concise text for the LLM."""
        if not history:
            return ""
        formatted = []
        for turn in history[-4:]:
            role = turn.get("role") or turn.get("sender") or "User"
            text = turn.get("text") or turn.get("content") or turn.get("query") or ""
            text = re.sub(r'data:image\/[^;]+;base64,[A-Za-z0-9+/=]+', '[Attached Image]', str(text))
            if len(text) > 250:
                text = text[:250] + "..."
            formatted.append(f"{role.capitalize()}: {text}")
        return "\n".join(formatted)

    @classmethod
    async def classify_ticket_intent(
        cls,
        user_message: str,
        history: Optional[List[Dict[str, Any]]] = None,
        active_draft: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Performs semantic classification on user_message and conversational context.
        Returns validated structured JSON.
        """
        msg_clean = (user_message or "").strip()
        history_context = cls._sanitize_conversation_history(history)
        draft_desc = (active_draft.get("descriptionofTicket") if active_draft else None) or ""

        few_shot_text = json.dumps(HISTORICAL_FEW_SHOT_EXAMPLES[:8], indent=2)

        prompt = f"""Analyze and classify this AMS ticket request:

REFERENCE FEW-SHOT EXAMPLES:
{few_shot_text}

CONVERSATION CONTEXT:
{history_context if history_context else "(None - starting conversation)"}

ACTIVE DRAFT DESCRIPTION (IF ANY):
"{draft_desc}"

USER'S CURRENT MESSAGE:
"{msg_clean}"

Determine whether this is an Incident, Change Request, Service request, or S PO.
Respond with the exact JSON schema defined in system instructions.
"""

        raw_response = None
        try:
            raw_response = await _call_llm(
                prompt_text=prompt,
                system_instruction=CLASSIFIER_SYSTEM_PROMPT,
                json_response=True
            )
        except Exception as ex:
            print(f"[TicketClassifier] Primary LLM call failed: {ex}")

        result = cls._parse_and_validate_response(raw_response, msg_clean)
        return result

    @classmethod
    def _parse_and_validate_response(cls, raw_response: Optional[str], original_message: str) -> Dict[str, Any]:
        """
        Strictly parses and validates the LLM response.
        Enforces authoritative database category names and applies confidence gating.
        """
        if raw_response:
            try:
                cleaned = raw_response.strip()
                if cleaned.startswith("```"):
                    cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                    cleaned = re.sub(r"\n?```$", "", cleaned)
                data = json.loads(cleaned)

                candidate_type = data.get("ticketType")
                confidence = float(data.get("confidence", 0.85))
                requires_clarification = bool(data.get("requiresClarification", False))
                clarification_question = data.get("clarificationQuestion")
                reason = data.get("reason") or "Semantically classified by Neo AI intelligence engine."
                multi_intent = bool(data.get("multiIntent", False))
                multi_intent_details = data.get("multiIntentDetails")

                resolved_name = resolve_authoritative_ticket_type(candidate_type)

                if confidence < CONFIDENCE_THRESHOLD_LOW and not requires_clarification:
                    requires_clarification = True
                    if not clarification_question:
                        clarification_question = (
                            "To ensure proper assignment, could you confirm whether existing functionality is malfunctioning (Incident), "
                            "or if you are requesting a new enhancement/modification (Change Request)?"
                        )

                return {
                    "intent": "CREATE_TICKET",
                    "ticketType": resolved_name,
                    "confidence": confidence,
                    "reason": reason,
                    "requiresClarification": requires_clarification,
                    "clarificationQuestion": clarification_question if requires_clarification else None,
                    "multiIntent": multi_intent,
                    "multiIntentDetails": multi_intent_details,
                    "status": "success"
                }
            except Exception as parse_err:
                print(f"[TicketClassifier] Parsing LLM response failed: {parse_err}")

        # Robust heuristic fallback
        return cls._heuristic_semantic_classification(original_message)

    @classmethod
    def _heuristic_semantic_classification(cls, text: str) -> Dict[str, Any]:
        """
        High-precision fallback heuristic used only when the LLM service is unavailable.
        Maintains strict boundary rules without naive substring matching.
        """
        t_clean = (text or "").lower()

        # 1. Check Multi-Intent
        has_failure = any(w in t_clean for w in ["dump", "error", "failing", "not working", "crash", "bug"])
        has_enhancement = any(w in t_clean for w in ["additional field", "new column", "new feature", "develop new", "customize", "new report", "enhance"])
        if has_failure and has_enhancement:
            return {
                "intent": "CREATE_TICKET",
                "ticketType": TICKET_TYPE_INCIDENT,
                "confidence": 0.70,
                "reason": "User reported both a system error and a requested enhancement in the same message.",
                "requiresClarification": True,
                "clarificationQuestion": (
                    "It looks like your request contains two separate items: an existing system failure and a new feature request. "
                    "Would you like me to log an Incident for the error first, or create separate tickets?"
                ),
                "multiIntent": True,
                "multiIntentDetails": "Failure reported alongside enhancement request.",
                "status": "fallback"
            }

        # 2. S PO Check
        if re.search(r'\b(?:s\s*po|standing\s*p(?:urchase\s*)?o(?:rder)?|s-po|service\s*po)\b', t_clean):
            return {
                "intent": "CREATE_TICKET",
                "ticketType": TICKET_TYPE_S_PO,
                "confidence": 0.92,
                "reason": "Explicit reference to S PO or standing purchase order service tasking.",
                "requiresClarification": False,
                "clarificationQuestion": None,
                "multiIntent": False,
                "multiIntentDetails": None,
                "status": "fallback"
            }

        # 3. Change Request Check (New development, modifications, enhancements)
        if any(re.search(pat, t_clean) for pat in [
            r'\b(?:additional|new|custom)\s+(?:field|column|report|screen|tab|button|dashboard|functionality|feature|z-report)\b',
            r'\b(?:require|need)\s+(?:an?\s+)?(?:new|additional|custom)\b',
            r'\b(?:develop|build|introduce|enhance)\b',
            r'\b(?:enhancement|change\s*request|cr|customization|modify\s+logic|change\s+logic|new\s+validation|add\s+validation|validation\s+logic)\b',
            r'\bmodify\s+(?:the\s+)?(?:pricing|calculation|formula|workflow|program)\b'
        ]):
            return {
                "intent": "CREATE_TICKET",
                "ticketType": TICKET_TYPE_CHANGE_REQUEST,
                "confidence": 0.94,
                "reason": "Request to develop new functionality or enhance existing system features.",
                "requiresClarification": False,
                "clarificationQuestion": None,
                "multiIntent": False,
                "multiIntentDetails": None,
                "status": "fallback"
            }

        # 4. Service Request Check (Access, permissions, password, assistance)
        if any(re.search(pat, t_clean) for pat in [
            r'\b(?:provide|grant|request|need)\s+(?:access|permission|authorization|role)\b',
            r'\b(?:password\s*reset|unlock\s*user|user\s*creation|new\s*login)\b',
            r'\b(?:how\s*to|guidance|standard\s*assistance|operational\s*support)\b',
            r'\b(?:bulk\s*upload|ltmc|bapi\s*upload\s*assistance)\b'
        ]):
            return {
                "intent": "CREATE_TICKET",
                "ticketType": TICKET_TYPE_SERVICE_REQUEST,
                "confidence": 0.93,
                "reason": "Standard operational assistance, access provisioning, or guidance request.",
                "requiresClarification": False,
                "clarificationQuestion": None,
                "multiIntent": False,
                "multiIntentDetails": None,
                "status": "fallback"
            }

        # 5. Incident Check (Failures, dumps, crashes, broken functionality)
        if any(re.search(pat, t_clean) for pat in [
            r'\b(?:error|dump|short\s*dump|crash|broken|failing|failed|fails|incorrect|wrong|timed?\s*out)\b',
            r'\b(?:unable\s+to|cannot|can\'t)\s+(?:post|create|release|execute|process|login|log\s*in|open)\b',
            r'\b(?:system\s+down|server\s+(?:is\s+)?down|offline|integration\s+failure|idoc\s+error)\b'
        ]):
            return {
                "intent": "CREATE_TICKET",
                "ticketType": TICKET_TYPE_INCIDENT,
                "confidence": 0.95,
                "reason": "Report of an unexpected system malfunction or failure in existing functionality.",
                "requiresClarification": False,
                "clarificationQuestion": None,
                "multiIntent": False,
                "multiIntentDetails": None,
                "status": "fallback"
            }

        # 6. Ambiguous Default
        return {
            "intent": "CREATE_TICKET",
            "ticketType": TICKET_TYPE_INCIDENT,
            "confidence": 0.50,
            "reason": "Context did not provide enough details to definitively classify request.",
            "requiresClarification": True,
            "clarificationQuestion": (
                "Could you provide a few more details about what is happening? Specifically, is an existing transaction "
                "failing with an error, or are you requesting a new feature/enhancement?"
            ),
            "multiIntent": False,
            "multiIntentDetails": None,
            "status": "fallback_ambiguous"
        }
