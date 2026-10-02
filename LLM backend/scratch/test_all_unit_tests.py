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

test_cases = [
    {
        "prompt": "i can't able to create dashboards and kpis for client AAB in sap analytics cloud . so please consider this as low priority",
        "expected_client": "AAB",
        "expected_prio": "Low",
        "expected_desc_contains": "Unable to create dashboards and KPIs in SAP Analytics Cloud"
    },
    {
        "prompt": "create a ticket for client Alekya homes where i cannot able to process purchase order in MIRO. consider it as low priority.",
        "expected_client": "Alekya homes",
        "expected_prio": "Low",
        "expected_desc_contains": "Unable to process purchase order in MIRO"
    },
    {
        "prompt": "create an ticket on high priority for ATG for the issue PR not releasing",
        "expected_client": "ATG",
        "expected_prio": "High",
        "expected_desc_contains": "PR not releasing"
    },
    {
        "prompt": "create ticket for client AAB, prority is low and issue is purchase order not processing",
        "expected_client": "AAB",
        "expected_prio": "Low",
        "expected_desc_contains": "Purchase order not processing"
    },
    {
        "prompt": "create a ticket for Balaji issue is server down and priority is high",
        "expected_client": "BALAJI AMINES LIMITED",
        "expected_prio": "High",
        "expected_desc_contains": "Server down"
    }
]

print("=== Running Comprehensive Extraction Tests ===")
passed = 0
for i, tc in enumerate(test_cases, 1):
    draft = create_initial_draft()
    res = heuristic_field_extractor(tc["prompt"], draft, MASTER_CLIENTS)
    c_name = res.get("clientName")
    prio = res.get("priority")
    desc = res.get("descriptionofTicket") or ""

    c_pass = c_name == tc["expected_client"]
    p_pass = prio == tc["expected_prio"]
    d_pass = tc["expected_desc_contains"].lower() in desc.lower()

    if c_pass and p_pass and d_pass:
        print(f"[PASS] Test {i}: Client={c_name}, Priority={prio}, Desc='{desc}'")
        passed += 1
    else:
        print(f"[FAIL] Test {i}: Client={c_name} (expected {tc['expected_client']}), Priority={prio} (expected {tc['expected_prio']}), Desc='{desc}' (expected contain '{tc['expected_desc_contains']}')")

print(f"\nResult: {passed}/{len(test_cases)} tests passed.")
