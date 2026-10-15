import sys
import os
import asyncio
import base64

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.schemas import ChatRequest
from services.chat_service import ChatService

async def main():
    print("=== Testing ChatService.process_chat with Prompt 1 ===")
    req1 = ChatRequest(
        username="test.user@neovatic.com",
        message="i can't able to create dashboards and kpis for client AAB in sap analytics cloud . so please consider this as low priority",
        Bearer="Bearer mock_token_123"
    )
    resp1 = await ChatService.process_chat(req1)
    print("Action Type:", resp1.action_type)
    print("Ticket Draft clientName:", resp1.ticket_draft.get("clientName") if resp1.ticket_draft else None)
    print("Ticket Draft priority:", resp1.ticket_draft.get("priority") if resp1.ticket_draft else None)

    print("\n=== Testing ChatService.process_chat with Image Attachment ===")
    sample_b64 = "data:image/png;name=sample_screenshot.png;base64," + base64.b64encode(b"dummy image bytes").decode("utf-8")
    req3 = ChatRequest(
        username="test.user@neovatic.com",
        message="Create ticket for Karamtara issue is SAP login error priority High",
        Bearer="Bearer mock_token_123",
        screenshort=sample_b64
    )
    resp3 = await ChatService.process_chat(req3)
    print("Action Type:", resp3.action_type)
    print("Draft has screenshot:", bool(resp3.ticket_draft and resp3.ticket_draft.get("screenshort")))
    print("Screenshot preserved without base64 loss:", bool(resp3.ticket_draft and "data:image" in resp3.ticket_draft.get("screenshort", "")))

if __name__ == "__main__":
    asyncio.run(main())
