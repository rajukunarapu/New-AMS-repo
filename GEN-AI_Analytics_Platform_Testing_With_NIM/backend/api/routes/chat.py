from fastapi import APIRouter
from api.models.request_models import ChatRequest
from api.models.response_models import ChatResponse
from api.rag.pipeline import rag_pipeline

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

@router.post("", response_model=ChatResponse)
def chat_with_rag(req: ChatRequest):
    result = rag_pipeline.run(req.message, req.top_k)
    return ChatResponse(
        reply=result["reply"],
        sources=result.get("sources", []),
        session_id=req.session_id or "default",
        graph_image=result.get("graph_image"),
        chart_type=result.get("chart_type"),
        insights=result.get("insights"),
        intent=result.get("intent")
    )
