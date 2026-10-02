import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ticket_creator_service import (
    create_initial_draft,
    extract_fields_with_llm,
    finalize_draft_fields,
    heuristic_field_extractor,
    clean_ticket_description,
    MASTER_CLIENTS
)

p1 = "i can't able to create dashboards and kpis for client AAB in sap analytics cloud . so please consider this as low priority"
p2 = "create a ticket for client Alekya homes where i cannot able to process purchase order in MIRO. consider it as low priority."

print("=== P1 Extraction ===")
d1 = create_initial_draft()
res1 = extract_fields_with_llm(p1, d1, MASTER_CLIENTS)
print("Client:", res1.get("clientName"))
print("Priority:", res1.get("priority"))
print("Type:", res1.get("typeofticket"))
print("Description:", res1.get("descriptionofTicket"))

print("\n=== P2 Extraction ===")
d2 = create_initial_draft()
res2 = extract_fields_with_llm(p2, d2, MASTER_CLIENTS)
print("Client:", res2.get("clientName"))
print("Priority:", res2.get("priority"))
print("Type:", res2.get("typeofticket"))
print("Description:", res2.get("descriptionofTicket"))
