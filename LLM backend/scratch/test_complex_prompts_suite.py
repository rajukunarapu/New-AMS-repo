import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.schemas import ChatRequest
from services.chat_service import ChatService

complex_prompts = [
    "facing severe performance issue in FICO financial posting for client Karamtara, transaction FB50 taking more than 10 minutes to execute so please log a high priority ticket for this",
    "can you please raise a critical ticket for Dixon, our production server is completely down and users cannot log into SAP GUI since morning",
    "I am unable to release purchase requisition PR 1004592 in SAP MM for client ATG, getting error message ZMM_042 authorization failed. Kindly set priority to Medium",
    "need a change request for BALAJI AMINES LIMITED to add custom field GSTIN number in invoice print form output, please treat this as low priority",
    "we are experiencing dump TSV_TNEW_PAGE_ALLOC_FAILED during monthly payroll run in SAP HR for client Avon Cycles Limited, please register an incident with very high priority",
    "create ticket for Jindal Steel & Power Ltd regarding inability to generate GSTR-1 e-way bill JSON file from SAP SD module, keep priority as High"
]

print("=== RUNNING COMPLEX PROMPT SUITE (UNIQUE SESSIONS) ===")
for i, p in enumerate(complex_prompts, 1):
    print(f"\n--- Test Case {i} ---")
    print(f"Prompt: \"{p}\"")
    req = ChatRequest(
        username=f"tester{i}@neovatic.com",
        session_id=f"session_{i}",
        message=p,
        Bearer="Bearer mock_token_123"
    )
    resp = ChatService.process_chat(req)
    draft = resp.ticket_draft or {}
    print(f"Client: {draft.get('clientName')}")
    print(f"Priority: {draft.get('priority')}")
    print(f"Type: {draft.get('typeofticket')}")
    print(f"Group: {draft.get('assigntogroup')}")
    print(f"Description: {draft.get('descriptionofTicket')}")
