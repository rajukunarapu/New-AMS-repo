import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ticket_creator_service import (
    create_initial_draft,
    heuristic_field_extractor,
    clean_ticket_description,
    resolve_client_name,
    finalize_draft_fields,
    get_missing_core_fields,
    analyze_user_intent_on_draft,
    extract_fields_with_llm,
    MASTER_CLIENTS
)

print("=== Running Multi-turn flow tests ===")

# Test 1: Extraction on single prompt with typo & punctuation
p1 = "create ticket for client AAB, prority is low and issue is purchase order not processing"
draft1 = create_initial_draft(user_email="veera.pasya@neovatic.com")
extracted1 = extract_fields_with_llm(p1, draft1, MASTER_CLIENTS)
finalized1 = finalize_draft_fields(extracted1, user_email="veera.pasya@neovatic.com", known_clients=MASTER_CLIENTS)

print("\n[Test 1] Single prompt extraction:")
print("clientName:", finalized1.get("clientName"))
print("priority:", finalized1.get("priority"))
print("typeofticket:", finalized1.get("typeofticket"))
print("descriptionofTicket:", finalized1.get("descriptionofTicket"))
print("assigntogroup:", finalized1.get("assigntogroup"))
print("Missing fields:", get_missing_core_fields(finalized1))

assert finalized1.get("clientName") == "AAB"
assert finalized1.get("priority") == "Low"
assert finalized1.get("typeofticket") == "S PO"
assert finalized1.get("descriptionofTicket") == "Purchase order not processing."
assert len(get_missing_core_fields(finalized1)) == 0

# Test 2: Multi-turn where clientName is provided in Turn 2
p2_turn1 = "create ticket, prority is low and issue is purchase order not processing"
draft2 = create_initial_draft(user_email="veera.pasya@neovatic.com")
extracted2 = extract_fields_with_llm(p2_turn1, draft2, MASTER_CLIENTS)
finalized2_t1 = finalize_draft_fields(extracted2, user_email="veera.pasya@neovatic.com", known_clients=MASTER_CLIENTS)

print("\n[Test 2 - Turn 1] Prompt without clientName:")
print("clientName:", finalized2_t1.get("clientName"))
print("descriptionofTicket:", finalized2_t1.get("descriptionofTicket"))
print("Missing fields:", get_missing_core_fields(finalized2_t1))

assert finalized2_t1.get("clientName") is None
assert finalized2_t1.get("descriptionofTicket") == "Purchase order not processing."
assert "clientName" in get_missing_core_fields(finalized2_t1)

# Turn 2: User provides clientName: "AAB"
intent2, mods2 = analyze_user_intent_on_draft("AAB", finalized2_t1, known_clients=MASTER_CLIENTS)
print("\n[Test 2 - Turn 2] User types 'AAB':")
print("Intent:", intent2)
print("Modified fields:", mods2)

for k, v in mods2.items():
    finalized2_t1[k] = v

finalized2_t2 = finalize_draft_fields(finalized2_t1, user_email="veera.pasya@neovatic.com", known_clients=MASTER_CLIENTS)

print("clientName after Turn 2:", finalized2_t2.get("clientName"))
print("descriptionofTicket after Turn 2:", finalized2_t2.get("descriptionofTicket"))
print("Missing fields after Turn 2:", get_missing_core_fields(finalized2_t2))

assert finalized2_t2.get("clientName") == "AAB"
assert finalized2_t2.get("descriptionofTicket") == "Purchase order not processing."
assert len(get_missing_core_fields(finalized2_t2)) == 0

# Test 3: Modifying priority on existing draft
intent3, mods3 = analyze_user_intent_on_draft("change priority to High", finalized2_t2, known_clients=MASTER_CLIENTS)
print("\n[Test 3] User modifies priority: 'change priority to High':")
print("Intent:", intent3)
print("Modified fields:", mods3)

for k, v in mods3.items():
    finalized2_t2[k] = v

finalized3 = finalize_draft_fields(finalized2_t2, user_email="veera.pasya@neovatic.com", known_clients=MASTER_CLIENTS)
print("priority after update:", finalized3.get("priority"))
print("descriptionofTicket after update:", finalized3.get("descriptionofTicket"))

assert finalized3.get("priority") == "High"
assert finalized3.get("descriptionofTicket") == "Purchase order not processing."

print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")
