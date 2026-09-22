import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ticket_creator_service import (
    create_initial_draft,
    extract_fields_with_llm,
    finalize_draft_fields,
    get_missing_core_fields,
    format_preview_markdown,
    MASTER_CLIENTS
)

prompt = "create an ticket on high priority for ATG for the issue PR not releasing"
draft = create_initial_draft(user_email="veera.pasya@neovatic.com")

res = extract_fields_with_llm(prompt, draft, MASTER_CLIENTS)
finalized = finalize_draft_fields(res, user_email="veera.pasya@neovatic.com", known_clients=MASTER_CLIENTS)
missing = get_missing_core_fields(finalized)

print("=== Extraction Results ===")
print("clientName:", finalized.get("clientName"))
print("priority:", finalized.get("priority"))
print("typeofticket:", finalized.get("typeofticket"))
print("descriptionofTicket:", finalized.get("descriptionofTicket"))
print("assigntogroup:", finalized.get("assigntogroup"))
print("Missing fields:", missing)

preview_md = format_preview_markdown(finalized, missing)
print("\n=== Formatted Markdown Preview ===")
print(preview_md)
