"""
services/sla_scheduler.py - Asynchronous Background Scheduler for SLA Monitoring.
"""

import os
import asyncio
import logging
from typing import Optional
from services.sla_monitor_service import run_sla_monitoring_cycle_async, run_sla_monitoring_cycle

logger = logging.getLogger("SLA_Scheduler")


class SLABackgroundScheduler:
    """Non-blocking asyncio background scheduler for periodic SLA checks."""
    
    def __init__(self, interval_minutes: Optional[float] = None):
        if interval_minutes is None:
            try:
                interval_minutes = float(os.getenv("SLA_MONITOR_INTERVAL_MINUTES", "1"))
            except ValueError:
                interval_minutes = 1.0
        self.interval_seconds = max(10.0, interval_minutes * 60.0)
        self._task: Optional[asyncio.Task] = None
        self._is_running = False
        self.last_run_time: Optional[str] = None
        self.last_run_result: Optional[dict] = None

    async def _run_loop(self):
        logger.info(f"SLA Background Async Scheduler started. Running every {self.interval_seconds / 60.0:.2f} minutes.")
        while self._is_running:
            try:
                res = await run_sla_monitoring_cycle_async()
                self.last_run_result = res
                self.last_run_time = res.get("timestamp")
            except Exception as e:
                logger.error(f"Unhandled error in SLA monitoring cycle: {e}")
            
            # Non-blocking async sleep
            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break
            
        logger.info("SLA Background Async Scheduler stopped.")

    async def start(self):
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._run_loop(), name="SLA_Scheduler_Task")
        logger.info("SLA Background Async Scheduler service initialized.")

    async def stop(self):
        if not self._is_running:
            return
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        logger.info("SLA Background Async Scheduler service shutdown.")

    def is_running(self) -> bool:
        return self._is_running and self._task is not None and not self._task.done()


# Global scheduler instance
sla_scheduler_instance = SLABackgroundScheduler()
