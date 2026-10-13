import os
import sys
import asyncio
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from services.chat_orchestrator import run_chat_orchestrator, generate_dynamic_query_narrative
from ams_api import AMSApi
from models.schemas import ChatRequest
from services.chat_service import ChatService

async def run_tests():
    print("=== TEST 1: Conversational Prompts (Single-Pass, Dynamic, Varied) ===")
    prompts = [
        "hi",
        "good morning, how can you help me today?",
        "who are you and what is your purpose?",
        "thanks a lot for the support!"
    ]
    
    responses = []
    for p in prompts:
        t0 = time.time()
        decision = await run_chat_orchestrator(p)
        elapsed = time.time() - t0
        action = decision.get("action")
        reply = decision.get("conversational_response")
        print(f"\n[Prompt]: '{p}'")
        print(f"  Action: {action}")
        print(f"  Latency: {elapsed:.2f}s")
        print(f"  Dynamic Reply: {reply}")
        assert action == "CONVERSATIONAL", f"Expected CONVERSATIONAL, got {action}"
        assert reply and len(reply) > 5, "Expected non-empty reply"
        responses.append(reply)

    # Ensure responses are varied and not identical
    assert len(set(responses)) == len(responses), "Responses should be dynamic and varied, not identical!"
    print("\n[PASS] All conversational responses were unique and generated in a single pass.")

    print("\n=== TEST 2: Ticket Creation Prompt (Single-Pass Extraction) ===")
    create_prompt = "facing severe FB50 transaction dump in FICO for Karamtara, please log a high priority ticket"
    t0 = time.time()
    decision_create = await run_chat_orchestrator(create_prompt)
    elapsed = time.time() - t0
    print(f"[Prompt]: '{create_prompt}'")
    print(f"  Action: {decision_create.get('action')}")
    print(f"  Latency: {elapsed:.2f}s")
    print(f"  Extracted Fields: {decision_create.get('ticket_fields')}")
    print(f"  Dynamic Note: {decision_create.get('dynamic_note')}")
    assert decision_create.get("action") == "CREATE_TICKET", "Expected CREATE_TICKET action"
    assert decision_create.get("ticket_fields", {}).get("clientName") in ["Karamtara", "KARAMTARA"], "Expected client Karamtara"
    print("[PASS] Ticket creation identified and fields extracted in single pass.")

    print("\n=== TEST 3: Ticket Query Prompt (Single-Pass Planning) ===")
    query_prompt = "how many open tickets are there for client ATG?"
    t0 = time.time()
    decision_query = await run_chat_orchestrator(query_prompt)
    elapsed = time.time() - t0
    print(f"[Prompt]: '{query_prompt}'")
    print(f"  Action: {decision_query.get('action')}")
    print(f"  Latency: {elapsed:.2f}s")
    print(f"  Query Plan: {decision_query.get('query_plan')}")
    assert decision_query.get("action") == "QUERY_TICKETS", "Expected QUERY_TICKETS action"
    assert decision_query.get("query_plan", {}).get("client") == "ATG" or "ATG" in str(decision_query.get("query_plan")), "Expected ATG client in plan"
    print("[PASS] Ticket query identified and plan formulated in single pass.")

    print("\n=== TEST 4: AMS Cache Test ===")
    ams = AMSApi()
    # Mocking cache test
    AMSApi._tickets_cache = [{"ticketNo": "TEST001", "clientName": "ATG", "priority": "High"}]
    AMSApi._tickets_cache_time = time.time()
    cached = await ams.get_tickets(timeout=5)
    assert len(cached) == 1 and cached[0]["ticketNo"] == "TEST001", "Cache should return immediately"
    print("[PASS] AMSApi in-memory cache successfully returned data without HTTP overhead.")

    print("\n=== TEST 5: Full ChatService.process_chat Flow for 'hi' ===")
    req = ChatRequest(
        message="hi",
        username="test@neovatic.com",
        Bearer="dummy_token",
        session_id="test_sess_001"
    )
    t0 = time.time()
    res = await ChatService.process_chat(req)
    elapsed = time.time() - t0
    print(f"Full ChatService Response: {res.response}")
    print(f"Action Type: {res.action_type}")
    print(f"Full Roundtrip Time: {elapsed:.2f}s")
    assert res.success is True
    assert res.action_type == "chat"
    assert res.data is None
    print("[PASS] ChatService processed 'hi' cleanly in single pass without ticket fetch.")

    print("\nALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
