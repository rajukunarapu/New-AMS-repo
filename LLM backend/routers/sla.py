"""
routers/sla.py - REST API Router for SLA Monitoring Service.
"""

from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from services.sla_monitor_service import run_sla_monitoring_cycle_async, run_sla_monitoring_cycle, SLAReminderStore
from services.sla_scheduler import sla_scheduler_instance
from ams_api import AMSApi

router = APIRouter(prefix="/api/sla", tags=["SLA Monitoring"])


@router.post(
    "/trigger",
    summary="Trigger SLA Monitoring Cycle Manually",
    description="Immediately runs a single SLA monitoring cycle checking top 100 tickets and sending reminders."
)
async def trigger_sla_monitoring(
    authorization: Optional[str] = Header(None, description="Optional Bearer <token>")
):
    try:
        ams = AMSApi()
        if authorization:
            token = authorization.replace("Bearer ", "").strip()
            ams.token = token

        result = await run_sla_monitoring_cycle_async(ams_client=ams)
        return {
            "success": True,
            "message": "SLA Monitoring cycle executed successfully.",
            "data": result
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SLA Monitoring cycle failed: {str(err)}"
        )


@router.get(
    "/status",
    summary="Get SLA Monitoring Status",
    description="Returns current status of the SLA background scheduler, configuration, and last cycle stats."
)
def get_sla_status():
    sent_reminders = SLAReminderStore._load()
    return {
        "success": True,
        "scheduler_running": sla_scheduler_instance.is_running(),
        "interval_seconds": sla_scheduler_instance.interval_seconds,
        "last_run_time": sla_scheduler_instance.last_run_time,
        "last_run_result": sla_scheduler_instance.last_run_result,
        "sent_reminders_count": len(sent_reminders),
        "sent_reminders": sent_reminders
    }


@router.delete(
    "/reminders",
    summary="Reset Sent SLA Reminders Store",
    description="Clears all recorded sent reminders from storage so reminders can be re-sent for testing."
)
def reset_sla_reminders():
    SLAReminderStore.clear()
    return {
        "success": True,
        "message": "Sent SLA reminders storage cleared."
    }
