import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ticket_creator_service import (
    create_initial_draft,
    heuristic_field_extractor,
    clean_ticket_description,
    validate_and_refine_description,
    resolve_client_name,
    finalize_draft_fields,
    get_missing_core_fields,
    extract_fields_with_llm
)

p1 = "create ticket for client AAB, prority is low and issue is purchase order not processing"

print("--- Test 1: Extraction on prompt 1 ---")
known_clients = [
    "Karamtara Engineering Pvt Ltd", "ATG", "BALAJI AMINES LIMITED",
    "AAB", "ACSEN HyVeg Pvt Ltd", "AJAX Engineering Pvt Ltd", "Ananth Technologies Pvt Ltd"
]

draft = create_initial_draft(user_email="veera.pasya@neovatic.com")
extracted = extract_fields_with_llm(p1, draft, known_clients)
finalized = finalize_draft_fields(extracted, user_email="veera.pasya@neovatic.com", known_clients=known_clients)

print("Extracted clientName:", finalized.get("clientName"))
print("Extracted priority:", finalized.get("priority"))
print("Extracted typeofticket:", finalized.get("typeofticket"))
print("Extracted descriptionofTicket:", finalized.get("descriptionofTicket"))
print("Extracted assigntogroup:", finalized.get("assigntogroup"))
print("Missing fields:", get_missing_core_fields(finalized))
