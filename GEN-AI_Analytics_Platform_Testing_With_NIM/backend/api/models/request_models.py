from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    message: str = Field(..., description="User prompt or question")
    session_id: Optional[str] = Field("default", description="Conversation session ID")
    top_k: Optional[int] = Field(5, description="Number of vector context matches")

class AnalyticsRequest(BaseModel):
    query: str = Field(..., description="Natural language analytics question")
    chart_type: Optional[str] = Field("auto", description="Requested chart format (bar, line, pie, auto)")
