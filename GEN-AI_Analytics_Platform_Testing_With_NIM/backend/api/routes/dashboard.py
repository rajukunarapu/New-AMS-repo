from fastapi import APIRouter
from api.models.response_models import DashboardSummaryResponse
from api.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardSummaryResponse)
def get_dashboard():
    return dashboard_service.get_dashboard_data()
