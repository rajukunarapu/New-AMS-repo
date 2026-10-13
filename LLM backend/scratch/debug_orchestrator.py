import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.chat_orchestrator import run_chat_orchestrator, ORCHESTRATOR_SYSTEM_INSTRUCTION
from query_engine import _call_llm

async def debug():
    prompt = "show me joule related tickets of ATG with high priority"
    print(f"Testing prompt: '{prompt}'")
    
    # 1. Test raw call
    payload_dict = {
        "user_message": prompt,
        "has_screenshot": False,
        "recent_conversation": []
    }
    user_payload = json.dumps(payload_dict)
    
    print("\n[Calling _call_llm directly]...")
    raw_res = await _call_llm(
        prompt_text=user_payload,
        system_instruction=ORCHESTRATOR_SYSTEM_INSTRUCTION,
        json_response=True,
        temperature=0.7,
        max_tokens=350
    )
    print(f"RAW RES: {repr(raw_res)}")
    
    # 2. Test full run_chat_orchestrator
    print("\n[Calling run_chat_orchestrator]...")
    res = await run_chat_orchestrator(prompt)
    print(f"ORCHESTRATOR RESULT: {res}")

if __name__ == "__main__":
    asyncio.run(debug())
