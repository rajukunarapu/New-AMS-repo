import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.chat_service import (
    extract_ticket_id_for_status_query,
    format_ticket_status_and_steps_markdown,
    parse_steps_list
)

def test_ticket_id_extraction():
    test_queries = [
        ("What is the status of ticket 12345?", "12345"),
        ("ticket 50 status", "50"),
        ("Show steps for ticket INC-99", "INC-99"),
        ("What is the status of ticket #77?", "77"),
        ("Check status of ticket 102", "102"),
        ("Which tickets are high priority?", None),
        ("Show me open incidents for Karamtara", None)
    ]
    
    print("--- Testing Ticket ID Extraction ---")
    for query, expected in test_queries:
        extracted = extract_ticket_id_for_status_query(query)
        print(f"Query: '{query}' => Extracted: '{extracted}' (Expected: '{expected}')")
        assert extracted == expected, f"Failed for '{query}': got '{extracted}', expected '{expected}'"
    print("PASSED: Ticket ID extraction tests passed successfully!\n")

def test_markdown_formatting():
    print("--- Testing Markdown Formatting with User Payload ---")
    mock_payload = {
        "success": True,
        "ticketId": "AAB2609254",
        "steps": [
            {
                "documentType": None,
                "acknowledgmentSentOn": None,
                "customerAcknowledgement": None,
                "workingDays": None,
                "workingHours": None,
                "startDate": "9/23/2026 12:15:47 PM",
                "endDate": None,
                "responsibleBy": "",
                "ticketStatus": "Created",
                "stepStatus": None
            }
        ]
    }

    md_output, records = format_ticket_status_and_steps_markdown("AAB2609254", mock_payload)
    print(md_output.encode("ascii", "replace").decode("ascii"))
    assert "Ticket Status & Delivery Workflow: Ticket #AAB2609254" in md_output
    assert "Ticket ACK" in md_output
    assert "9/23/2026 12:15:47 PM" in md_output
    print("\nPASSED: User payload test passed successfully!")

if __name__ == "__main__":
    test_ticket_id_extraction()
    test_markdown_formatting()
