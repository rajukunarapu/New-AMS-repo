import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.schemas import ChatRequest
from services.chat_service import ChatService

print("=== Testing ChatService.process_chat with Prompt 1 ===")
req1 = ChatRequest(
    username="test.user@neovatic.com",
    message="i can't able to create dashboards and kpis for client AAB in sap analytics cloud . so please consider this as low priority",
    Bearer="Bearer mock_token_123"
)
resp1 = ChatService.process_chat(req1)
print("Action Type:", resp1.action_type)
print("Ticket Draft:", resp1.ticket_draft)
print("Response Markdown:\n", resp1.response)

print("\n=== Testing ChatService.process_chat with Prompt 2 ===")
req2 = ChatRequest(
    username="test.user2@neovatic.com",
    message="create a ticket for client Alekya homes where i cannot able to process purchase order in MIRO. consider it as low priority.",
    Bearer="Bearer mock_token_123"
)
resp2 = ChatService.process_chat(req2)
print("Action Type:", resp2.action_type)
print("Ticket Draft:", resp2.ticket_draft)
print("Response Markdown:\n", resp2.response)
