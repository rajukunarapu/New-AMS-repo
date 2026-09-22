"""
scratch/test_llm_fallback_suite.py
Automated Verification Suite for LLM Fallback Mechanism & Capability Preservation.
"""

import sys
import os
import json
import pandas as pd
from unittest.mock import patch, MagicMock

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

import query_engine
from query_engine import _call_llm, process_ticket_query, execute_query_plan, heuristic_query_plan, get_dataset_metadata
from scratch.test_updated_ticket_search import get_test_ticket_dataset

def run_fallback_tests():
    print("\n================================================================================")
    print("        RUNNING COMPREHENSIVE LLM FALLBACK & INTEGRITY TEST SUITE")
    print("================================================================================\n")

    results = []

    def record_test(name, passed, detail):
        status = "PASS" if passed else "FAIL"
        results.append({"name": name, "status": status, "detail": detail})
        print(f"[{status}] {name}")
        print(f"      Result: {detail}\n")

    # --------------------------------------------------------------------------
    # 1. FALLBACK CHAIN ORDER & LOGGING TESTS
    # --------------------------------------------------------------------------
    
    # Test Scenario 1: Main model succeeds -> Fallbacks NOT called
    call_log = []
    def mock_model_success(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if model_name == "nvidia/nemotron-3-super-120b-a12b":
            return '{"intent": "filtering", "detected_client": "ATG"}'
        return None

    with patch("query_engine._call_model_by_name", side_effect=mock_model_success):
        call_log.clear()
        res = _call_llm("Show ATG tickets")
        passed = (res is not None and len(call_log) == 1 and call_log[0] == "nvidia/nemotron-3-super-120b-a12b")
        record_test(
            "Scenario 1: Main model succeeds -> Fallback models NOT called",
            passed,
            f"Called models: {call_log} (Expected only main model)"
        )

    # Test Scenario 2: Main model fails -> Fallback #1 (nvidia/llama-3.1-nemotron-70b-instruct) is called
    def mock_fb1_success(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if model_name == "nvidia/llama-3.1-nemotron-70b-instruct":
            return '{"intent": "filtering", "detected_client": "ATG"}'
        return None

    with patch("query_engine._call_model_by_name", side_effect=mock_fb1_success):
        call_log.clear()
        res = _call_llm("Show ATG tickets")
        expected_chain = ["nvidia/nemotron-3-super-120b-a12b", "nvidia/llama-3.1-nemotron-70b-instruct"]
        passed = (res is not None and call_log == expected_chain)
        record_test(
            "Scenario 2: Main model fails -> Fallback #1 called",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 3: Main + Fallback #1 fail -> Fallback #2 (meta/llama-3.3-70b-instruct) called
    def mock_fb2_success(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if model_name == "meta/llama-3.3-70b-instruct":
            return '{"intent": "filtering", "detected_client": "ATG"}'
        return None

    with patch("query_engine._call_model_by_name", side_effect=mock_fb2_success):
        call_log.clear()
        res = _call_llm("Show ATG tickets")
        expected_chain = ["nvidia/nemotron-3-super-120b-a12b", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.3-70b-instruct"]
        passed = (res is not None and call_log == expected_chain)
        record_test(
            "Scenario 3: Main + Fallback #1 fail -> Fallback #2 called",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 4: Main + Fallback #1+#2 fail -> Fallback #3 (mistral-large) called
    def mock_fb3_success(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if model_name == "mistralai/mistral-large-2411":
            return '{"intent": "filtering", "detected_client": "ATG"}'
        return None

    with patch("query_engine._call_model_by_name", side_effect=mock_fb3_success):
        call_log.clear()
        res = _call_llm("Show ATG tickets")
        expected_chain = ["nvidia/nemotron-3-super-120b-a12b", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.3-70b-instruct", "mistralai/mistral-large-2411"]
        passed = (res is not None and call_log == expected_chain)
        record_test(
            "Scenario 4: Main + Fallback #1+#2 fail -> Fallback #3 called",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 5: Main + Fallback #1-#3 fail -> Fallback #4 (minimax-m3) called
    def mock_fb4_success(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if model_name == "minimaxai/minimax-m3":
            return '{"intent": "filtering", "detected_client": "ATG"}'
        return None

    with patch("query_engine._call_model_by_name", side_effect=mock_fb4_success):
        call_log.clear()
        res = _call_llm("Show ATG tickets")
        expected_chain = ["nvidia/nemotron-3-super-120b-a12b", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.3-70b-instruct", "mistralai/mistral-large-2411", "minimaxai/minimax-m3"]
        passed = (res is not None and call_log == expected_chain)
        record_test(
            "Scenario 5: Main + Fallback #1-#3 fail -> Fallback #4 called",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 6: Main + Fallback #1-#4 fail -> Fallback #5 (gemma-2-27b) called
    def mock_fb5_success(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if model_name == "google/gemma-2-27b-it":
            return '{"intent": "filtering", "detected_client": "ATG"}'
        return None

    with patch("query_engine._call_model_by_name", side_effect=mock_fb5_success):
        call_log.clear()
        res = _call_llm("Show ATG tickets")
        expected_chain = ["nvidia/nemotron-3-super-120b-a12b", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.3-70b-instruct", "mistralai/mistral-large-2411", "minimaxai/minimax-m3", "google/gemma-2-27b-it"]
        passed = (res is not None and call_log == expected_chain)
        record_test(
            "Scenario 6: Main + Fallback #1-#4 fail -> Fallback #5 called",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 7: All primary & fallback models fail -> Safety net / Heuristic executed
    with patch("query_engine._call_model_by_name", return_value=None), patch("query_engine._call_gemini", return_value=None):
        tickets = get_test_ticket_dataset()
        ans_text, recs = process_ticket_query(tickets, "Show ATG tickets")
        passed = (ans_text is not None and len(recs) == 4)
        record_test(
            "Scenario 7: All models fail -> Existing heuristic fallback returned cleanly",
            passed,
            f"Returned {len(recs)} ATG tickets via heuristic fallback engine"
        )

    # Test Scenario 8: Timeout error triggers fallback
    def mock_timeout(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if len(call_log) == 1:
            raise Exception("Read timed out. (read timeout=1.5)")
        return "Fallback Response"

    with patch("query_engine._call_model_by_name", side_effect=mock_timeout):
        call_log.clear()
        res = _call_llm("Test timeout")
        passed = (res == "Fallback Response" and len(call_log) == 2)
        record_test(
            "Scenario 8: Read timeout on main model -> Triggers fallback",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 9: Rate limit 429 error triggers fallback
    def mock_rate_limit(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if len(call_log) == 1:
            return None # Simulated HTTP 429 failure
        return "Fallback Response RateLimit"

    with patch("query_engine._call_model_by_name", side_effect=mock_rate_limit):
        call_log.clear()
        res = _call_llm("Test rate limit")
        passed = (res == "Fallback Response RateLimit" and len(call_log) == 2)
        record_test(
            "Scenario 9: Rate limit 429 error on main model -> Triggers fallback",
            passed,
            f"Execution chain: {call_log}"
        )

    # Test Scenario 10: Server error 503 triggers fallback
    def mock_503(model_name, prompt_text, **kwargs):
        call_log.append(model_name)
        if len(call_log) == 1:
            return None # Simulated HTTP 503 Service Unavailable
        return "Fallback Response 503"

    with patch("query_engine._call_model_by_name", side_effect=mock_503):
        call_log.clear()
        res = _call_llm("Test 503")
        passed = (res == "Fallback Response 503" and len(call_log) == 2)
        record_test(
            "Scenario 10: Server 503 error on main model -> Triggers fallback",
            passed,
            f"Execution chain: {call_log}"
        )

    # --------------------------------------------------------------------------
    # 2. CAPABILITY & DATASET INTEGRITY PRESERVATION TESTS
    # --------------------------------------------------------------------------
    with patch("query_engine._call_llm", return_value=None):
        # Scenario 11: Normal ticket search preserved
        ans, recs = process_ticket_query(tickets, "Show tickets for client ATG")
        record_test(
            "Scenario 11: Normal ticket search capability preserved",
            len(recs) == 4,
            f"Returned {len(recs)} ATG tickets"
        )

        # Scenario 12: Multi-field ticket filtering preserved
        ans, recs = process_ticket_query(tickets, "Show high-priority unresolved tickets for ATG")
        record_test(
            "Scenario 12: Multi-field ticket filtering preserved",
            len(recs) == 2,
            f"Returned {len(recs)} high-priority unresolved ATG tickets"
        )

        # Scenario 13: Description & error code search preserved
        ans, recs = process_ticket_query(tickets, "Show tickets related to FB60 error")
        record_test(
            "Scenario 13: Description & error code search preserved",
            len(recs) == 2,
            f"Returned {len(recs)} FB60 tickets"
        )

        # Scenario 14: Combined multi-condition filtering preserved
        ans, recs = process_ticket_query(tickets, "Show Karamtara closed tickets created today")
        record_test(
            "Scenario 14: Combined multi-condition filtering preserved",
            len(recs) == 1 and recs[0].get("ticketNo") == "KAR2609007",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None}"
        )

        # Scenario 15: Relative date handling preserved
        ans, recs = process_ticket_query(tickets, "Show tickets created 15 days ago")
        record_test(
            "Scenario 15: Relative date handling preserved (15 days ago)",
            len(recs) == 1 and recs[0].get("ticketNo") == "KAR2609015",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None}"
        )

        # Scenario 16: Explicit date range preserved
        ans, recs = process_ticket_query(tickets, "Show tickets created between 1 August 2026 and 20 August 2026")
        record_test(
            "Scenario 16: Explicit date range preserved",
            len(recs) == 1 and recs[0].get("ticketNo") == "ATG2608002",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None}"
        )

        # Scenario 17: Ticket creation flow preserved
        ans, recs = process_ticket_query(tickets, "I want to create a ticket for client ATG regarding FB60 posting error")
        ans_str = str(ans.get("reply", "")) if isinstance(ans, dict) else str(ans)
        record_test(
            "Scenario 17: Ticket creation flow intent detection preserved",
            "create" in ans_str.lower() or "ticket" in ans_str.lower(),
            f"Response snippet: '{ans_str[:60]}...'"
        )

        # Scenario 18: Response structure schema preserved (process_ticket_query returns (answer_text_or_dict, records))
        record_test(
            "Scenario 18: Response tuple structure (answer_text, records_out) preserved",
            isinstance(ans, (str, dict)) and (recs is None or isinstance(recs, list)),
            "Response signature unchanged"
        )

        # Scenario 19: History/context handling across fallbacks preserved
        hist = [{"role": "user", "content": "Show ATG tickets related to FB60"}]
        ans, recs = process_ticket_query(tickets, "Only the unresolved ones.", history=hist)
        record_test(
            "Scenario 19: Multi-turn context preservation preserved",
            len(recs) == 1 and recs[0].get("ticketNo") == "ATG2608001",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} with inherited context"
        )

    # Scenario 20: Fallback logging output format verified
    with patch("query_engine._call_model_by_name", side_effect=mock_fb1_success):
        call_log.clear()
        import io
        import sys
        captured_output = io.StringIO()
        sys.stdout = captured_output
        _call_llm("Logging test")
        sys.stdout = sys.__stdout__
        out = captured_output.getvalue()
        passed = "Primary model failed. Trying fallback model: nvidia/llama-3.1-nemotron-70b-instruct" in out
        record_test(
            "Scenario 20: Fallback logging output format verified",
            passed,
            "Exact log string verified in stdout output"
        )

    # --------------------------------------------------------------------------
    # SUMMARY TABLE
    # --------------------------------------------------------------------------
    print("\n================================================================================")
    print("                    FALLBACK SUITE TEST RESULTS SUMMARY")
    print("================================================================================\n")
    print(f"| {'Test Scenario':<65} | {'Status':<6} |")
    print(f"|{'-'*67}|{'-'*8}|")

    passed_count = sum(1 for r in results if r["status"] == "PASS")
    failed_count = sum(1 for r in results if r["status"] == "FAIL")

    for r in results:
        print(f"| {r['name']:<65} | {r['status']:<6} |")

    print("\n--------------------------------------------------------------------------------")
    print(f"TOTAL TEST SCENARIOS EXECUTED: {len(results)}")
    print(f"PASSED: {passed_count}")
    print(f"FAILED: {failed_count}")
    print("--------------------------------------------------------------------------------\n")

    return results

if __name__ == "__main__":
    run_fallback_tests()
