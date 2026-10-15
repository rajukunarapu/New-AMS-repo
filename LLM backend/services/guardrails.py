"""
services/guardrails.py - Domain Guardrail & Conversational Steering Service for AMS Assistant.

Maintains enterprise boundary while preserving natural warmth, engagement, and interactivity:
1. Fast heuristic detection of out-of-domain requests (weather, general world trivia, generic coding tutorials).
2. Dynamic, varied, and polite deflection responses that proactively steer the user back to AMS operations.
3. Safe preservation of real technical error reports (e.g., system dump, script failure, SAP errors).
"""

import re
import random
from typing import Tuple, Optional


# Pattern definitions for Out-of-Domain topics
WEATHER_PATTERN = re.compile(
    r'\b(?:weather|forecast|temperature|humidity|rain(?:ing|fall)?|monsoon|climate|sunny|cloudy)\b',
    re.IGNORECASE
)

GENERIC_CODE_REQUEST_PATTERN = re.compile(
    r'\b(?:write|create|generate|provide|give\s+me|code\s+me|build)\s+(?:a|an|some)?\s*(?:python|javascript|typescript|java|c\+\+|c#|golang|sql|bash|powershell|html|css)?\s*(?:code|script|program|function|snippet|algorithm|class)\b',
    re.IGNORECASE
)

CODING_TUTOR_PATTERN = re.compile(
    r'\b(?:how\s+to\s+(?:write|code|program|implement)|reverse\s+a\s+string|fibonacci|bubble\s+sort|binary\s+search|leetcode|hackerrank)\b',
    re.IGNORECASE
)

GENERAL_TRIVIA_PATTERN = re.compile(
    r'\b(?:tell\s+me\s+a\s+(?:joke|story|poem)|who\s+is\s+the\s+(?:president|prime\s+minister|ceo\s+of\s+google|actor)|capital\s+of|recipe\s+for|movie\s+recommendations?|horoscope|sports\s+scores?)\b',
    re.IGNORECASE
)

# Exception patterns: Real technical issues / error reports that happen to mention scripts/code
TECHNICAL_INCIDENT_PATTERN = re.compile(
    r'\b(?:error|exception|fail(?:ed|ure|ing)?|dump|crash|down|bug|issue|broken|timeout|not\s+working|stuck|traceback)\b',
    re.IGNORECASE
)

# Dynamic, warm, and interactive steering templates (varied to avoid robotic repetition)
WEATHER_DEFLECTIONS = [
    "I focus specifically on Neovatic AMS operations and ticket intelligence, so I don't track live weather forecasts. However, I'm ready to help you track ticket statuses, review SLAs, or log a system issue whenever you need!",
    "While I don't have access to meteorological updates or live weather info, I'm here to assist with everything related to your AMS support operations and tickets. How can I help you today?",
    "Weather forecasting is outside my domain—I'm your dedicated Neovatic AMS assistant! Let me know if you'd like to check open incidents, review module metrics, or report a technical problem.",
]

GENERIC_CODE_DEFLECTIONS = [
    "I am specialized specifically as your Neovatic AMS enterprise assistant rather than a general programming tutor. If you are experiencing a technical failure or an error with a script in your environment, I can gladly help you log it as an incident ticket!",
    "My focus is on managing AMS support operations, ticket tracking, and incident logging rather than general software programming. If this script is causing an error in your system, let me know the details and I'll help you raise a support ticket.",
    "While I don't write general standalone programming code, I can assist if this relates to an AMS technical issue or SAP module troubleshooting. Would you like me to open a ticket or search for related incident resolutions?",
]

GENERAL_TRIVIA_DEFLECTIONS = [
    "I'm specialized as your Neovatic AMS support assistant, so I keep my focus on your enterprise tickets, SLAs, and technical operations! Let me know how I can assist with your support tasks today.",
    "That falls outside my expertise! As your AMS AI assistant, I'm here to help manage tickets, look up resolutions, and track support metrics. What can I help you check today?",
    "I'm built specifically for Neovatic AMS ticket intelligence and IT support workflows. If you need help checking ticket statuses, tracking SLA compliance, or drafting a new incident, feel free to ask!",
]


def check_fast_guardrail(message: str) -> Tuple[bool, Optional[str]]:
    """
    Evaluates whether the incoming user message is out-of-domain.
    Returns (is_out_of_domain, dynamic_steering_response).

    Safety Guarantee: If the message mentions a failure, bug, or system crash,
    it is NEVER flagged as out-of-domain, ensuring real support issues are handled.
    """
    if not message or not isinstance(message, str):
        return False, None

    clean = message.strip()
    if not clean:
        return False, None

    # Check for actual technical incidents first: NEVER deflect real issues!
    if TECHNICAL_INCIDENT_PATTERN.search(clean) and any(w in clean.lower() for w in ["script", "code", "job", "run", "batch", "sap"]):
        return False, None

    # 1. Weather queries
    if WEATHER_PATTERN.search(clean):
        return True, random.choice(WEATHER_DEFLECTIONS)

    # 2. General code generation / coding tutor requests
    if GENERIC_CODE_REQUEST_PATTERN.search(clean) or CODING_TUTOR_PATTERN.search(clean):
        return True, random.choice(GENERIC_CODE_DEFLECTIONS)

    # 3. General world trivia / creative writing / chit-chat
    if GENERAL_TRIVIA_PATTERN.search(clean):
        return True, random.choice(GENERAL_TRIVIA_DEFLECTIONS)

    return False, None
