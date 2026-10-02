"""
scratch/test_single_queries.py
"""
import sys
import os
import json
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from query_engine import heuristic_query_plan, execute_query_plan, parse_date_range, get_dataset_metadata
from scratch.test_updated_ticket_search import get_test_ticket_dataset

tickets = get_test_ticket_dataset()
meta = get_dataset_metadata(tickets)

turn2_history = [
    {"role": "user", "content": "Show ATG tickets related to FB60"},
    {"role": "assistant", "content": "Here are 2 tickets for ATG related to FB60."},
    {"role": "user", "content": "Only the unresolved ones."},
    {"role": "assistant", "content": "Here is 1 unresolved ticket: ATG2608001."}
]

q = "Show me the ones from last month."
plan = heuristic_query_plan(q, meta, history=turn2_history)
res_df, stats = execute_query_plan(tickets, plan)
print(f"Q: {q}")
print(f"   Plan: {json.dumps(plan, indent=2)}")
print(f"   Filtered count: {len(res_df)}")
if not res_df.empty:
    print(f"   Matching Ticket IDs: {list(res_df['ticketNo'])}")
