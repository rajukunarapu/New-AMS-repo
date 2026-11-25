"""
tests/test_guardrails.py - Verification suite for AMS domain guardrails and conversational steering.
"""

import sys
import os
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
import asyncio
from services.guardrails import check_fast_guardrail
from services.chat_orchestrator import run_chat_orchestrator
from models.schemas import ChatRequest
from services.chat_service import ChatService


def test_fast_guardrail_weather():
    queries = [
        "What is the weather in Hyderabad?",
        "hyderabad weather forecast",
        "is it raining today?",
        "what's the temperature outside?"
    ]
    for q in queries:
        is_ood, reply = check_fast_guardrail(q)
        assert is_ood is True, f"Failed for query: {q}"
        assert reply is not None
        assert "weather" in reply.lower() or "ams" in reply.lower()


def test_fast_guardrail_code_generation():
    queries = [
        "write python code to reverse a linked list",
        "create a python script to download files",
        "generate a javascript function for fibonacci",
        "give me python code for calculator",
        "how to write binary search in python"
    ]
    for q in queries:
        is_ood, reply = check_fast_guardrail(q)
        assert is_ood is True, f"Failed for query: {q}"
        assert reply is not None
        assert "programming" in reply.lower() or "ams" in reply.lower() or "incident" in reply.lower() or "support" in reply.lower()


def test_fast_guardrail_general_trivia():
    queries = [
        "tell me a joke",
        "who is the prime minister of India",
        "what is the recipe for chocolate cake"
    ]
    for q in queries:
        is_ood, reply = check_fast_guardrail(q)
        assert is_ood is True, f"Failed for query: {q}"
        assert reply is not None
        assert "ams" in reply.lower() or "ticket" in reply.lower() or "support" in reply.lower()


def test_fast_guardrail_preserves_real_incident():
    incident_queries = [
        "Our python batch script failed with error 500 in SAP-SD",
        "ABAP code dump in transaction FB60",
        "Python data pipeline is down and throwing exceptions"
    ]
    for q in incident_queries:
        is_ood, reply = check_fast_guardrail(q)
        assert is_ood is False, f"Real incident incorrectly deflected: {q}"
        assert reply is None


def test_fast_guardrail_preserves_in_domain():
    in_domain_queries = [
        "Hello",
        "Good morning",
        "What can you do?",
        "Show all open tickets for ATG",
        "How many tickets are pending in SAP-FICO?",
        "Raise a ticket for database connection error"
    ]
    for q in in_domain_queries:
        is_ood, reply = check_fast_guardrail(q)
        assert is_ood is False, f"In-domain query incorrectly flagged: {q}"


def test_chat_orchestrator_weather_dispatch():
    async def _run():
        return await run_chat_orchestrator(
            user_message="What is the weather in Hyderabad?",
            customer_client=None,
            user_email="engineer@neovatic.com"
        )
    decision = asyncio.run(_run())
    assert decision.get("action") == "OUT_OF_DOMAIN"
    assert "conversational_response" in decision
    assert len(decision["conversational_response"]) > 10


def test_chat_orchestrator_code_dispatch():
    async def _run():
        return await run_chat_orchestrator(
            user_message="write a python script to sort an array",
            customer_client=None,
            user_email="engineer@neovatic.com"
        )
    decision = asyncio.run(_run())
    assert decision.get("action") == "OUT_OF_DOMAIN"
    assert "conversational_response" in decision
    assert "```python" not in decision["conversational_response"]


def test_chat_service_e2e_weather():
    async def _run():
        request = ChatRequest(
            username="engineer@neovatic.com",
            Bearer="test_token",
            message="What is the weather in Hyderabad today?"
        )
        return await ChatService.process_chat(request)
    response = asyncio.run(_run())
    assert response.success is True
    assert response.action_type == "chat"
    assert "ams" in response.response.lower() or "weather" in response.response.lower()
    # Ensure no actual weather data or external API results
    assert "celsius" not in response.response.lower()
    assert "fahrenheit" not in response.response.lower()


def test_chat_service_e2e_code_request():
    async def _run():
        request = ChatRequest(
            username="engineer@neovatic.com",
            Bearer="test_token",
            message="Write python code to reverse a string"
        )
        return await ChatService.process_chat(request)
    response = asyncio.run(_run())
    assert response.success is True
    assert response.action_type == "chat"
    # Ensure no code blocks are generated
    assert "```python" not in response.response
    assert "def reverse" not in response.response
    assert "ams" in response.response.lower() or "support" in response.response.lower() or "incident" in response.response.lower()


def test_chat_service_e2e_greeting():
    async def _run():
        request = ChatRequest(
            username="engineer@neovatic.com",
            Bearer="test_token",
            message="Hello! How are you?"
        )
        return await ChatService.process_chat(request)
    response = asyncio.run(_run())
    assert response.success is True
    assert response.action_type == "chat"
    assert len(response.response) > 5


def test_sanitize_and_prune_history():
    from services.chat_orchestrator import sanitize_and_prune_history

    # History with 10 turns, base64 images, and markdown tables
    dummy_history = [
        {"role": "user", "text": f"Question {i}"} for i in range(5)
    ] + [
        {"role": "user", "text": 'Look at this error: <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."> problem'},
        {"role": "assistant", "text": "Here are your tickets:\n| Ticket No | Status |\n| --- | --- |\n| ATG001 | Open |\n| ATG002 | Closed |\n| ATG003 | Pending |\n| ATG004 | In Progress |\n| ATG005 | Open |\nTotal 5 tickets found."},
        {"role": "user", "text": "Can you check ATG001?"},
        {"role": "assistant", "text": "ATG001 is currently Open and assigned to SAP-SD."},
        {"role": "user", "text": "Which of these are high priority?"}
    ]

    pruned = sanitize_and_prune_history(dummy_history, max_turns=6, max_char_len=300)
    assert len(pruned) <= 6
    # Ensure Base64 string was replaced
    img_entry = next((e for e in pruned if "error" in e.get("text", "")), None)
    if img_entry:
        assert "data:image/png;base64" not in img_entry["text"]
        assert "[Attached Image]" in img_entry["text"]
    # Ensure massive table was condensed
    table_entry = next((e for e in pruned if "Here are your tickets" in e.get("text", "")), None)
    if table_entry:
        assert "ticket records omitted for brevity" in table_entry["text"]


def test_verify_and_ground_ticket_narrative_zero_count():
    from services.guardrails import verify_and_ground_ticket_narrative

    # Model hallucinated that it found 3 tickets when count was 0
    hallucinated_narrative = "I found 3 open tickets for Karamtara: KMT1001, KMT1002, and KMT1003."
    grounded = verify_and_ground_ticket_narrative(
        narrative=hallucinated_narrative,
        count=0,
        sample_records=[],
        query_plan={"client": "Karamtara", "status": "Open"}
    )
    assert "No matching tickets were found" in grounded
    assert "KMT1001" not in grounded
    assert "3 open tickets" not in grounded


def test_verify_and_ground_ticket_narrative_hallucinated_id():
    from services.guardrails import verify_and_ground_ticket_narrative

    sample_records = [
        {"ticketNo": "ATG2608001", "clientName": "ATG", "ticketStatus": "Open"}
    ]
    # Model hallucinated ticket ID ATG9999999
    narrative_with_hallucination = "Found 1 ticket for ATG: ATG9999999 which is currently open."
    grounded = verify_and_ground_ticket_narrative(
        narrative=narrative_with_hallucination,
        count=1,
        sample_records=sample_records,
        query_plan={"client": "ATG"}
    )
    assert "ATG9999999" not in grounded


def test_verify_and_ground_ticket_narrative_valid_preserved():
    from services.guardrails import verify_and_ground_ticket_narrative

    sample_records = [
        {"ticketNo": "ATG2608001", "clientName": "ATG", "ticketStatus": "Open"}
    ]
    valid_narrative = "There is 1 ticket matching your query: ATG2608001."
    grounded = verify_and_ground_ticket_narrative(
        narrative=valid_narrative,
        count=1,
        sample_records=sample_records,
        query_plan={"client": "ATG"}
    )
    assert "ATG2608001" in grounded


def test_follow_up_client_inheritance_fallback():
    async def _run():
        history = [
            {"role": "user", "text": "Show tickets for Karamtara"},
            {"role": "assistant", "text": "Found 4 tickets for Karamtara."}
        ]
        # Follow-up without repeating Karamtara
        decision = await run_chat_orchestrator(
            user_message="which of these are high priority?",
            history=history,
            known_clients=["ATG", "Karamtara", "Dixon"]
        )
        return decision

    decision = asyncio.run(_run())
    assert decision.get("action") == "QUERY_TICKETS"
    plan = decision.get("query_plan", {})
    assert plan.get("client") == "Karamtara"
    assert plan.get("priority") == "High"


if __name__ == "__main__":
    pytest.main(["-v", "tests/test_guardrails.py"])
