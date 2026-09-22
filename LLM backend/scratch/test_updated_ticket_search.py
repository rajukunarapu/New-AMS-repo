"""
scratch/test_updated_ticket_search.py
Extensive Automated Test Suite for Dynamic LLM Intent-Based Ticket Search.
"""

import sys
import os
import json
from datetime import datetime, timedelta, timezone

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from query_engine import process_ticket_query, execute_query_plan, parse_query_plan_with_llm

def get_test_ticket_dataset():
    """
    Creates a diverse dataset of tickets covering various fields, dates, statuses, priorities,
    error codes, transaction codes, assignees, and descriptions.
    """
    now = datetime.now(timezone.utc)
    
    # Calculate key reference dates relative to now (reference date: 2026-09-17 Thursday)
    today_str = now.strftime("%Y-%m-%dT10:00:00")
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%dT11:00:00")
    
    # Last Thursday: if today is Thursday (Sep 17), last Thursday was Sep 10
    days_to_last_thursday = 7 if now.weekday() == 3 else ((now.weekday() - 3) % 7)
    last_thursday_str = (now - timedelta(days=days_to_last_thursday)).strftime("%Y-%m-%dT14:00:00")
    
    days_7_ago_str = (now - timedelta(days=7)).strftime("%Y-%m-%dT09:00:00")
    days_10_ago_str = (now - timedelta(days=10)).strftime("%Y-%m-%dT15:30:00")
    days_15_ago_str = (now - timedelta(days=15)).strftime("%Y-%m-%dT16:45:00")
    
    # Last month (August 2026)
    first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_date = first_this_month - timedelta(days=5) # e.g. Aug 27
    last_month_str = last_month_date.strftime("%Y-%m-%dT12:00:00")
    
    # Explicit dates
    sep_05_2026 = "2026-09-05T09:30:00"
    aug_15_2026 = "2026-08-15T10:00:00"

    tickets = [
        # Ticket 1: ATG FB60 error, High priority, Unresolved, Last Month
        {
            "ticketNo": "ATG2608001",
            "ticketId": "ATG2608001",
            "txnId": "TXN_FB60_01",
            "clientName": "ATG",
            "ticketStatus": "Open",
            "priority": "High (Business Impacted)",
            "typeofticket": "Incident",
            "assigntogroup": "SAP-FICO",
            "module": "SAP-FICO",
            "reportedby": "Jaswanth",
            "createdname": "Jaswanth",
            "createdEmails": "jaswanth@atg.com",
            "assignee": "John Doe",
            "createddate": last_month_str,
            "reportedon": last_month_str,
            "descriptionofTicket": "FB60 vendor invoice posting crash with error code ERR_FB60_POSTING",
            "remarks": "Issue pending resolution notes",
            "resolution": ""
        },
        # Ticket 2: ATG FB60 error, Closed/Resolved, Historical
        {
            "ticketNo": "ATG2608002",
            "ticketId": "ATG2608002",
            "txnId": "TXN_FB60_02",
            "clientName": "ATG",
            "ticketStatus": "Closed",
            "priority": "Medium",
            "typeofticket": "Incident",
            "assigntogroup": "SAP-FICO",
            "module": "SAP-FICO",
            "reportedby": "Veera",
            "createdname": "Veera",
            "createdEmails": "veera@atg.com",
            "assignee": "Sarah Connor",
            "createddate": aug_15_2026,
            "reportedon": aug_15_2026,
            "closeddate": aug_15_2026,
            "descriptionofTicket": "FB60 posting failure during vendor payment entry",
            "remarks": "Resolved by applying SAP OSS Note 982143 for FB60 tax configuration.",
            "resolution": "Applied SAP OSS Note 982143 for FB60 tax configuration."
        },
        # Ticket 3: Karamtara, High priority, In Progress, 15 days ago
        {
            "ticketNo": "KAR2609015",
            "ticketId": "KAR2609015",
            "txnId": "TXN_MM_01",
            "clientName": "Karamtara Engineering Pvt Ltd",
            "ticketStatus": "In Progress",
            "priority": "High (Business Impacted)",
            "typeofticket": "Incident",
            "assigntogroup": "SAP-MM",
            "module": "SAP-MM",
            "reportedby": "Maneesh",
            "createdname": "Maneesh",
            "createdEmails": "maneesh@karamtara.com",
            "assignee": "Alice Smith",
            "createddate": days_15_ago_str,
            "reportedon": days_15_ago_str,
            "descriptionofTicket": "Unable to release purchase order in MIRO transaction due to tolerance limit",
            "remarks": "Investigating tolerance limits in MM",
            "resolution": ""
        },
        # Ticket 4: ATG, Unresolved, Last Thursday
        {
            "ticketNo": "ATG2609004",
            "ticketId": "ATG2609004",
            "txnId": "TXN_SD_01",
            "clientName": "ATG",
            "ticketStatus": "Open",
            "priority": "Very High (Production Impacted)",
            "typeofticket": "Incident",
            "assigntogroup": "SAP-SD",
            "module": "SAP-SD",
            "reportedby": "Jaswanth",
            "createdname": "Jaswanth",
            "assignee": "John Doe",
            "createddate": last_thursday_str,
            "reportedon": last_thursday_str,
            "descriptionofTicket": "Billing document output generation failed in sales order delivery",
            "remarks": "Under triage",
            "resolution": ""
        },
        # Ticket 5: Chambal, Closed, 10 days back
        {
            "ticketNo": "CHM2609010",
            "ticketId": "CHM2609010",
            "txnId": "TXN_BASIS_01",
            "clientName": "Chambal Fertilisers and Chemicals Ltd.",
            "ticketStatus": "Closed",
            "priority": "Low",
            "typeofticket": "Service Request",
            "assigntogroup": "SAP-BASIS",
            "module": "SAP-BASIS",
            "reportedby": "Suresh",
            "createdname": "Suresh",
            "assignee": "Bob Vance",
            "createddate": days_10_ago_str,
            "reportedon": days_10_ago_str,
            "closeddate": days_10_ago_str,
            "descriptionofTicket": "User account unlock and password reset request",
            "remarks": "Password reset completed and temporary password sent via email.",
            "resolution": "Password reset completed and temporary password sent via email."
        },
        # Ticket 6: ATG, High priority, Unresolved, Yesterday
        {
            "ticketNo": "ATG2609006",
            "ticketId": "ATG2609006",
            "txnId": "TXN_RPA_01",
            "clientName": "ATG",
            "ticketStatus": "Open",
            "priority": "High (Business Impacted)",
            "typeofticket": "Change Request",
            "assigntogroup": "RPA",
            "module": "RPA",
            "reportedby": "Jaswanth",
            "createdname": "Jaswanth",
            "assignee": "Charlie Brown",
            "createddate": yesterday_str,
            "reportedon": yesterday_str,
            "descriptionofTicket": "Invoice extraction bot selector error in UiPath process",
            "remarks": "Developer assigned",
            "resolution": ""
        },
        # Ticket 7: Karamtara, Today, Closed
        {
            "ticketNo": "KAR2609007",
            "ticketId": "KAR2609007",
            "txnId": "TXN_ABAP_01",
            "clientName": "Karamtara Engineering Pvt Ltd",
            "ticketStatus": "Closed",
            "priority": "Medium",
            "typeofticket": "Incident",
            "assigntogroup": "SAP ABAP",
            "module": "SAP ABAP",
            "reportedby": "Jaswanth",
            "createdname": "Jaswanth",
            "assignee": "Alice Smith",
            "createddate": today_str,
            "reportedon": today_str,
            "closeddate": today_str,
            "descriptionofTicket": "Z_INVOICE_PRINT smartform dump in production",
            "remarks": "Fixed null pointer exception in ABAP code",
            "resolution": "Fixed null pointer exception in ABAP code."
        }
    ]
    return tickets


def run_all_tests():
    import query_engine
    query_engine._call_llm = lambda *args, **kwargs: None
    tickets = get_test_ticket_dataset()
    results = []
    
    print("\n================================================================================")
    print("      RUNNING EXTENSIVE AUTOMATED TICKET SEARCH TEST SUITE")
    print("================================================================================\n")

    def execute_test(category, name, prompt, history, check_fn):
        try:
            answer_text, records_out = process_ticket_query(tickets, prompt, history=history)
            recs = records_out or []
            passed, detail = check_fn(answer_text, recs)
            status = "PASS" if passed else "FAIL"
            results.append({
                "category": category,
                "name": name,
                "prompt": prompt,
                "status": status,
                "detail": detail,
                "count": len(recs),
                "answer_snippet": answer_text[:100].replace("\n", " ") if answer_text else ""
            })
            print(f"[{status}] {category} - {name}", flush=True)
            print(f"      Prompt: '{prompt}'", flush=True)
            print(f"      Result: {detail}\n", flush=True)
        except Exception as err:
            results.append({
                "category": category,
                "name": name,
                "prompt": prompt,
                "status": "FAIL",
                "detail": f"Exception: {str(err)}",
                "count": 0,
                "answer_snippet": ""
            })
            print(f"[FAIL] {category} - {name} (EXCEPTIONAL ERROR: {err})\n", flush=True)

    # --------------------------------------------------------------------------
    # 1. FIELD FILTERING TESTS
    # --------------------------------------------------------------------------
    execute_test(
        "Field filtering", "Client only",
        "Show tickets for client ATG", None,
        lambda ans, recs: (
            all(r.get("clientName") == "ATG" for r in recs) and len(recs) == 4,
            f"Returned {len(recs)} ATG tickets (expected 4)"
        )
    )

    execute_test(
        "Field filtering", "Ticket ID",
        "Show details for ticket ATG2608001", None,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "ATG2608001",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} (expected ATG2608001)"
        )
    )

    execute_test(
        "Field filtering", "Status filter",
        "Show all closed tickets", None,
        lambda ans, recs: (
            all(r.get("ticketStatus") == "Closed" for r in recs) and len(recs) == 3,
            f"Returned {len(recs)} closed tickets (expected 3)"
        )
    )

    execute_test(
        "Field filtering", "Priority filter",
        "Show high priority tickets", None,
        lambda ans, recs: (
            all("High" in str(r.get("priority")) for r in recs) and len(recs) >= 3,
            f"Returned {len(recs)} high priority tickets"
        )
    )

    execute_test(
        "Field filtering", "Ticket type filter",
        "Show all Change Request tickets", None,
        lambda ans, recs: (
            all(r.get("typeofticket") == "Change Request" for r in recs) and len(recs) == 1,
            f"Returned {len(recs)} Change Request tickets (expected 1: ATG2609006)"
        )
    )

    execute_test(
        "Field filtering", "Reported by filter",
        "Show tickets reported by Veera", None,
        lambda ans, recs: (
            all("Veera" in str(r.get("reportedby")) for r in recs) and len(recs) == 1,
            f"Returned {len(recs)} ticket reported by Veera (expected 1)"
        )
    )

    execute_test(
        "Field filtering", "Assigned group filter",
        "Show tickets assigned to SAP-FICO", None,
        lambda ans, recs: (
            all(r.get("assigntogroup") == "SAP-FICO" for r in recs) and len(recs) == 2,
            f"Returned {len(recs)} SAP-FICO tickets (expected 2)"
        )
    )

    execute_test(
        "Field filtering", "Assignee filter",
        "Show tickets assigned to John Doe", None,
        lambda ans, recs: (
            all("John Doe" in str(r.get("assignee")) for r in recs) and len(recs) == 2,
            f"Returned {len(recs)} tickets assigned to John Doe (expected 2)"
        )
    )

    # --------------------------------------------------------------------------
    # 2. SEMANTIC DESCRIPTION SEARCH TESTS
    # --------------------------------------------------------------------------
    execute_test(
        "Semantic description search", "Exact error code (FB60)",
        "Show tickets related to FB60 error", None,
        lambda ans, recs: (
            all("FB60" in (str(r.get("descriptionofTicket")) + str(r.get("remarks"))) for r in recs) and len(recs) == 2,
            f"Returned {len(recs)} FB60 tickets (expected 2)"
        )
    )

    execute_test(
        "Semantic description search", "Different wording for same error",
        "Find tickets involving vendor payment posting failures", None,
        lambda ans, recs: (
            len(recs) >= 1 and any("FB60" in str(r.get("descriptionofTicket")) or "vendor" in str(r.get("descriptionofTicket")).lower() for r in recs),
            f"Returned {len(recs)} matching tickets for vendor payment posting"
        )
    )

    execute_test(
        "Semantic description search", "Business problem description",
        "Show tickets for purchase order tolerance limit issues", None,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "KAR2609015",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} for PO tolerance limit"
        )
    )

    execute_test(
        "Semantic description search", "Transaction code search",
        "Show tickets with MIRO transaction problem", None,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "KAR2609015",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} for MIRO transaction"
        )
    )

    # --------------------------------------------------------------------------
    # 3. DATE FILTERING TESTS
    # --------------------------------------------------------------------------
    execute_test(
        "Date filtering", "Today",
        "Show tickets created today", None,
        lambda ans, recs: (
            all(r.get("ticketNo") == "KAR2609007" for r in recs) and len(recs) == 1,
            f"Returned {len(recs)} today's tickets (expected 1)"
        )
    )

    execute_test(
        "Date filtering", "Yesterday",
        "Show tickets created yesterday", None,
        lambda ans, recs: (
            all(r.get("ticketNo") == "ATG2609006" for r in recs) and len(recs) == 1,
            f"Returned {len(recs)} yesterday's tickets (expected 1)"
        )
    )

    execute_test(
        "Date filtering", "Last month",
        "Show ATG tickets from last month", None,
        lambda ans, recs: (
            all(r.get("clientName") == "ATG" for r in recs) and len(recs) >= 1,
            f"Returned {len(recs)} ATG tickets from last month"
        )
    )

    execute_test(
        "Date filtering", "15 days ago",
        "Show tickets created 15 days ago", None,
        lambda ans, recs: (
            any(r.get("ticketNo") == "KAR2609015" for r in recs),
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} for 15 days ago"
        )
    )

    execute_test(
        "Date filtering", "10 days back",
        "Show tickets created 10 days back", None,
        lambda ans, recs: (
            any(r.get("ticketNo") == "CHM2609010" for r in recs),
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} for 10 days back"
        )
    )

    execute_test(
        "Date filtering", "Last Thursday",
        "What tickets were created last Thursday?", None,
        lambda ans, recs: (
            any(r.get("ticketNo") == "ATG2609004" for r in recs),
            f"Returned {len(recs)} tickets for last Thursday"
        )
    )

    execute_test(
        "Date filtering", "Date range",
        "Show tickets created between 1 August 2026 and 20 August 2026", None,
        lambda ans, recs: (
            any(r.get("ticketNo") == "ATG2608002" for r in recs),
            f"Returned {len(recs)} tickets between Aug 1 and Aug 20"
        )
    )

    # --------------------------------------------------------------------------
    # 4. COMBINED FILTERING TESTS
    # --------------------------------------------------------------------------
    execute_test(
        "Combined filtering", "Client + Description",
        "Show ATG tickets related to FB60", None,
        lambda ans, recs: (
            all(r.get("clientName") == "ATG" and "FB60" in (str(r.get("descriptionofTicket")) + str(r.get("remarks"))) for r in recs) and len(recs) == 2,
            f"Returned {len(recs)} ATG FB60 tickets (expected 2)"
        )
    )

    execute_test(
        "Combined filtering", "Client + Priority + Description + Date",
        "Show high-priority unresolved tickets for ATG related to invoice posting errors from last month", None,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "ATG2608001",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} (expected ATG2608001)"
        )
    )

    execute_test(
        "Combined filtering", "Client + Status + Date",
        "Show Karamtara closed tickets created today", None,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "KAR2609007",
            f"Returned ticket {recs[0].get('ticketNo') if recs else None} (expected KAR2609007)"
        )
    )

    # --------------------------------------------------------------------------
    # 5. INTENT-BASED QUERIES TESTS
    # --------------------------------------------------------------------------
    execute_test(
        "Intent-based queries", "Previous occurrences & Resolutions",
        "Has FB60 error happened before for client ATG? List the previous tickets and resolutions.", None,
        lambda ans, recs: (
            len(recs) == 2 and ("Applied SAP OSS Note" in ans or "Resolution" in ans or "resolution" in ans.lower() or "FB60" in ans),
            f"Returned {len(recs)} tickets with resolution info"
        )
    )

    execute_test(
        "Intent-based queries", "Count tickets",
        "How many unresolved tickets were raised for ATG?", None,
        lambda ans, recs: (
            len(recs) == 3 and ("3" in ans or "total" in ans.lower() or "tickets" in ans.lower()),
            f"Returned count for {len(recs)} unresolved ATG tickets"
        )
    )

    execute_test(
        "Intent-based queries", "Find most recent ticket",
        "Which client had a Smartform error most recently?", None,
        lambda ans, recs: (
            len(recs) >= 1 and "Karamtara" in (ans + str(recs[0].get("clientName"))),
            f"Identified most recent client for Smartform error"
        )
    )

    # --------------------------------------------------------------------------
    # 6. CONVERSATIONAL FOLLOW-UP QUERIES TESTS
    # --------------------------------------------------------------------------
    turn1_history = [
        {"role": "user", "content": "Show ATG tickets related to FB60."},
        {"role": "assistant", "content": "Here are 2 tickets for ATG related to FB60."}
    ]
    execute_test(
        "Conversational queries", "Follow-up 1: Only unresolved ones",
        "Only the unresolved ones.", turn1_history,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "ATG2608001",
            f"Returned {len(recs)} unresolved FB60 ATG ticket (expected ATG2608001)"
        )
    )

    turn2_history = turn1_history + [
        {"role": "user", "content": "Only the unresolved ones."},
        {"role": "assistant", "content": "Here is 1 unresolved ticket: ATG2608001."}
    ]
    execute_test(
        "Conversational queries", "Follow-up 2: Show me the ones from last month",
        "Show me the ones from last month.", turn2_history,
        lambda ans, recs: (
            len(recs) == 1 and recs[0].get("ticketNo") == "ATG2608001",
            f"Preserved context and returned ATG2608001 from last month"
        )
    )

    # --------------------------------------------------------------------------
    # SUMMARY TABLE GENERATION
    # --------------------------------------------------------------------------
    print("\n================================================================================")
    print("                      TEST RESULTS SUMMARY TABLE")
    print("================================================================================\n")
    print(f"| {'Category':<28} | {'Test Case':<32} | {'Count':<5} | {'Status':<6} |")
    print(f"|{'-'*30}|{'-'*34}|{'-'*7}|{'-'*8}|")
    
    passed_count = sum(1 for r in results if r["status"] == "PASS")
    failed_count = sum(1 for r in results if r["status"] == "FAIL")

    for r in results:
        print(f"| {r['category']:<28} | {r['name']:<32} | {r['count']:<5} | {r['status']:<6} |")

    print("\n--------------------------------------------------------------------------------")
    print(f"TOTAL TEST CASES EXECUTED: {len(results)}")
    print(f"PASSED: {passed_count}")
    print(f"FAILED: {failed_count}")
    print("--------------------------------------------------------------------------------\n")

    return results

if __name__ == "__main__":
    run_all_tests()
