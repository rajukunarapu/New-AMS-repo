from fastapi import APIRouter
from api.models.response_models import HealthResponse
from api.database.connection import db_manager
from api.services.ai_core_service import ai_core_service

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
def get_health_status():
    hana_status = db_manager.is_connected()
    ai_status = bool(ai_core_service.client_id)
    
    return HealthResponse(
        status="healthy",
        app_name="GEN-AI Analytics Platform API",
        version="1.0.0",
        hana_connected=hana_status,
        ai_core_connected=ai_status
    )
