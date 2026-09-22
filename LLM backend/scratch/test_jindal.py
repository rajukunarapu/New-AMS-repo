import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ticket_creator_service import (
    create_initial_draft,
    extract_fields_with_llm,
    heuristic_field_extractor,
    finalize_draft_fields,
    get_missing_core_fields,
    MASTER_CLIENTS
)

prompt = "can you try creating ticket for jindal client"
draft = create_initial_draft(user_email="veera.pasya@neovatic.com")

# Test 1: When Jindal is in known_clients fetched from AMS database
known_clients_with_jindal = list(MASTER_CLIENTS) + ["Jindal Steel & Power Ltd"]
res1 = extract_fields_with_llm(prompt, draft, known_clients_with_jindal)
finalized1 = finalize_draft_fields(res1, user_email="veera.pasya@neovatic.com", known_clients=known_clients_with_jindal)

print("--- Test 1 (Jindal in DB clients) ---")
print("clientName:", finalized1.get("clientName"))
print("descriptionofTicket:", finalized1.get("descriptionofTicket"))
print("priority:", finalized1.get("priority"))
print("Missing fields:", get_missing_core_fields(finalized1))

# Test 2: When Jindal is typed as new client name (not in DB list yet)
res2 = extract_fields_with_llm(prompt, draft, MASTER_CLIENTS)
finalized2 = finalize_draft_fields(res2, user_email="veera.pasya@neovatic.com", known_clients=MASTER_CLIENTS)

print("\n--- Test 2 (Jindal standalone candidate) ---")
print("clientName:", finalized2.get("clientName"))
print("descriptionofTicket:", finalized2.get("descriptionofTicket"))
print("priority:", finalized2.get("priority"))
print("Missing fields:", get_missing_core_fields(finalized2))
