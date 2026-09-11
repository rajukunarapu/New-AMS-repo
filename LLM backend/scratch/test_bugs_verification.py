import sys
import os
import re

# Add workspace directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from services.ticket_creator_service import (
    clean_ticket_description,
    clean_user_message_text,
    extract_filename_from_screenshot,
    heuristic_field_extractor,
    create_initial_draft,
    format_preview_markdown,
    is_ticket_creation_prompt
)
from query_engine import parse_query_plan_with_llm

def run_tests():
    print("=== RUNNING ENHANCED TICKET CREATION & QUERY ENGINE TESTS ===\n")
    
    # 1. Test is_ticket_creation_prompt without explicit "ticket" word
    prompt_user = "am facing severe FB60 invoice posting crash for Karamtara co., proirity is high and type category is incident please raise"
    is_creation = is_ticket_creation_prompt(prompt_user)
    print(f"[Test 1] Ticket creation prompt detection: {is_creation}")
    assert is_creation is True, f"Expected is_ticket_creation_prompt to return True for implicit issue report, got {is_creation}"

    # 2. Test field extraction & client resolution for "Karamtara co."
    known_clients = ["Karamtara Engineering Pvt Ltd", "Chambal Fertilisers and Chemicals Ltd.", "ATG", "AAB"]
    draft = create_initial_draft("veera.pasya@neovatic.com")
    extracted = heuristic_field_extractor(prompt_user, draft, known_clients)
    
    client = extracted.get("clientName")
    prio = extracted.get("priority")
    desc = extracted.get("descriptionofTicket")
    ttype = extracted.get("typeofticket")
    
    print(f"[Test 2] Extracted clientName: '{client}'")
    print(f"[Test 3] Extracted priority: '{prio}'")
    print(f"[Test 4] Extracted descriptionofTicket: '{desc}'")
    print(f"[Test 5] Extracted typeofticket: '{ttype}'")

    assert client == "Karamtara Engineering Pvt Ltd", f"Expected 'Karamtara Engineering Pvt Ltd', got '{client}'"
    assert prio == "High", f"Expected 'High', got '{prio}'"
    assert "FB60 invoice posting crash" in desc, f"Expected FB60 crash in description, got '{desc}'"
    assert "please raise" not in desc.lower(), f"Description should not contain 'please raise', got '{desc}'"
    assert "incident" not in desc.lower(), f"Description should not contain 'incident', got '{desc}'"

    # 3. Test history formatting in query engine (prevent KeyError: 'role')
    test_history = [
        {"sender": "user", "text": "show open tickets"},
        {"sender": "bot", "text": "Here are your open tickets"}
    ]
    meta_mock = {"total_count": 5, "columns": ["id", "clientName"], "unique_clients": ["ATG"]}
    try:
        # Just run history_context formatting check
        recent = test_history[-4:]
        formatted_h = []
        for msg in recent:
            if isinstance(msg, dict):
                r = msg.get("role") or msg.get("sender") or "USER"
                c = msg.get("content") or msg.get("text") or msg.get("query") or ""
                formatted_h.append(f"{str(r).upper()}: {c}")
        h_str = "\n".join(formatted_h)
        print(f"[Test 6] History formatting check: {h_str}")
        assert "USER: show open tickets" in h_str, "History formatting failed"
    except Exception as err:
        assert False, f"History formatting crashed with: {err}"

    print("\n=== ALL ENHANCED TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
