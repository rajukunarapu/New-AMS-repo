from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from api.services.python_graph_agent import python_graph_agent

router = APIRouter(prefix="/api/graph", tags=["Custom Graph Generation"])


class GraphRequest(BaseModel):
    prompt: str = Field(..., description="Natural language description of requested visualization")


class GraphResponse(BaseModel):
    status: str
    prompt: str
    image_base64: str
    chart_type: Optional[str] = None
    insights: Optional[str] = None
    message: str


@router.post("/generate", response_model=GraphResponse)
def generate_graph(req: GraphRequest):
    """
    Step 3 — Receive user's natural-language graph request.
    Delegates to PythonGraphAgent which executes Steps 4–10.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Graph prompt cannot be empty.")

    result = python_graph_agent.generate_custom_graph(req.prompt)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Graph generation failed"))

    return GraphResponse(**result)
