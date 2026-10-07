"""
run_scheduler.py - Standalone entry point for SLA Monitoring Background Service.
Configures RotatingFileHandler logging, initializes SLATracker SQLite store,
starts SLABackgroundScheduler, and runs until stopped with a clean shutdown.
"""

import os
import sys
import signal
import asyncio
import logging
from logging.handlers import RotatingFileHandler

from services.sla_reminder_store import SLATracker, resolve_db_path
from services.sla_scheduler import SLABackgroundScheduler
from services.sla_monitor_service import log_startup_timezone


def get_default_log_dir() -> str:
    """Returns default log directory outside application folder."""
    if sys.platform == "win32" or os.name == "nt":
        return r"C:\ProgramData\AMS\logs"
    return "/var/log/ams"


def setup_logging():
    """Configures root and SLA loggers with RotatingFileHandler and Console output."""
    log_dir = os.getenv("SLA_LOG_DIR") or get_default_log_dir()
    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, "sla_monitor.log")
    formatter = logging.Formatter(
        "[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # 10MB per log file, max 5 backup files
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    # Configure root logger and SLA loggers
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove existing handlers to prevent duplicate output
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    logging.info(f"Logging initialized. Log file: {log_file}")


async def main():
    setup_logging()
    logger = logging.getLogger("SLA_Main")

    logger.info("Starting SLA Monitoring Service...")
    log_startup_timezone()

    db_path = resolve_db_path()
    logger.info(f"Using SLA Database Path: {db_path}")

    # Initialize SQLite schema and tables
    SLATracker.init(db_path)

    # Instantiate and start scheduler
    scheduler = SLABackgroundScheduler()
    await scheduler.start()

    stop_event = asyncio.Event()

    def _shutdown_signal(sig, frame):
        logger.info(f"Received shutdown signal ({sig}). Initiating clean shutdown...")
        stop_event.set()

    # Register OS signal handlers if available (Unix / Windows main thread)
    if hasattr(signal, "SIGINT"):
        try:
            signal.signal(signal.SIGINT, _shutdown_signal)
        except (ValueError, AttributeError):
            pass
    if hasattr(signal, "SIGTERM"):
        try:
            signal.signal(signal.SIGTERM, _shutdown_signal)
        except (ValueError, AttributeError):
            pass

    logger.info("SLA Monitoring Service running. Press Ctrl+C or send SIGTERM to stop.")

    try:
        await stop_event.wait()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Interrupt received. Stopping scheduler...")
    finally:
        await scheduler.stop()
        logger.info("SLA Monitoring Service shut down cleanly.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
