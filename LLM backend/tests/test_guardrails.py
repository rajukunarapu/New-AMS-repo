"""
tests/test_guardrails.py - Verification suite for AMS domain guardrails and conversational steering.
"""

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


if __name__ == "__main__":
    pytest.main(["-v", "tests/test_guardrails.py"])
