import sys
import os
import asyncio
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from query_engine import process_ticket_query
from scratch.test_updated_ticket_search import get_test_ticket_dataset

async def test_performance():
    dataset = get_test_ticket_dataset()
    print(f"Loaded dataset with {len(dataset)} tickets.\n")

    queries = [
        ("Greeting", "Hello, who are you?"),
        ("Counting FastPath", "How many tickets are there for ATG?"),
        ("Group Not Found FastPath", "show tickets in group QuantumComputing"),
        ("Single Ticket Details FastPath", "Show details for ticket ATG2608001"),
    ]

    for label, q in queries:
        t0 = time.time()
        ans, records = await process_ticket_query(dataset, q)
        elapsed = time.time() - t0
        print(f"[{label}] Query: '{q}'")
        print(f"  Time taken: {elapsed:.2f}s")
        print(f"  Result preview: {ans[:100]}...")
        print(f"  Records returned: {len(records) if records else 0}\n")

if __name__ == "__main__":
    asyncio.run(test_performance())
