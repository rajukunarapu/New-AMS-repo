"""
services/sla_monitor_service.py - Modular SLA Monitoring Engine for AMS Application.
"""

import os
import json
import logging
import threading
import asyncio
import httpx
from datetime import datetime, date, time, timedelta
from typing import Dict, Any, List, Optional, Tuple

from ams_api import AMSApi

# Configure logger for SLA Monitoring
logger = logging.getLogger("SLA_Monitor")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [SLA Monitor] [%(levelname)s] %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)

STORAGE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sla_sent_reminders.json")


class SLAReminderStore:
    """Thread-safe persistent storage for tracking sent SLA reminders with in-memory caching."""
    _lock = threading.Lock()
    _cache: Optional[Dict[str, Any]] = None

    @classmethod
    def _load(cls) -> Dict[str, Any]:
        if cls._cache is not None:
            return cls._cache
        if not os.path.exists(STORAGE_FILE):
            cls._cache = {}
            return cls._cache
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                cls._cache = json.load(f)
                return cls._cache
        except Exception as e:
            logger.warning(f"Error reading reminder storage file: {e}")
            cls._cache = {}
            return cls._cache

    @classmethod
    def _save(cls, data: Dict[str, Any]):
        cls._cache = data
        try:
            temp_file = f"{STORAGE_FILE}.tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(temp_file, STORAGE_FILE)
        except Exception as e:
            logger.error(f"Error saving reminder storage file: {e}")

    @classmethod
    def make_key(cls, ticket_id: str, step_name: str, sla_deadline: Optional[datetime]) -> str:
        deadline_str = sla_deadline.isoformat() if sla_deadline else "no_deadline"
        t_id = str(ticket_id or "unknown").strip()
        s_name = str(step_name or "pending").strip().lower()
        return f"{t_id}__{s_name}__{deadline_str}"

    @classmethod
    def is_sent(cls, key: str) -> bool:
        with cls._lock:
            data = cls._load()
            return key in data

    @classmethod
    def mark_sent(cls, key: str, metadata: Optional[Dict[str, Any]] = None):
        with cls._lock:
            data = cls._load()
            data[key] = {
                "sent_at": datetime.now().isoformat(),
                **(metadata or {})
            }
            cls._save(data)

    @classmethod
    def clear(cls):
        with cls._lock:
            cls._cache = {}
            if os.path.exists(STORAGE_FILE):
                try:
                    os.remove(STORAGE_FILE)
                except Exception as e:
                    logger.error(f"Error clearing reminder storage: {e}")


def parse_reported_datetime(
    reported_on: Optional[Any],
    reported_on_time: Optional[Any],
    ref_date: Optional[date] = None
) -> datetime:
    """
    Parses reportedon / reportedDate and reportedontime (e.g. '09:55:25:410' or '09:55:25').
    Handles milliseconds accurately without string operations for calculation.
    """
    base_date = ref_date or datetime.now().date()

    # 1. Try parsing reported_on if present
    if reported_on and str(reported_on).strip():
        r_str = str(reported_on).strip()
        if "T" in r_str:
            try:
                dt_val = datetime.fromisoformat(r_str)
                base_date = dt_val.date()
                if not reported_on_time:
                    return dt_val
            except Exception:
                pass
        else:
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y"):
                try:
                    base_date = datetime.strptime(r_str, fmt).date()
                    break
                except Exception:
                    pass

    # 2. Parse reported_on_time (e.g. '09:55:25:410' or '09:55:25.410' or '09:55:25')
    parsed_time = time(0, 0, 0)
    if reported_on_time and str(reported_on_time).strip():
        t_str = str(reported_on_time).strip()
        # Standardize separators
        t_str = t_str.replace(".", ":")
        parts = t_str.split(":")
        try:
            h = int(parts[0]) if len(parts) > 0 else 0
            m = int(parts[1]) if len(parts) > 1 else 0
            s = int(parts[2]) if len(parts) > 2 else 0
            ms = 0
            if len(parts) > 3:
                ms_str = parts[3]
                if len(ms_str) == 3:
                    ms = int(ms_str) * 1000
                elif len(ms_str) > 0:
                    ms = int(ms_str.ljust(6, '0')[:6])
            parsed_time = time(h, m, s, ms)
        except Exception as e:
            logger.warning(f"Could not parse reportedontime '{reported_on_time}': {e}. Using 00:00:00.")

    return datetime.combine(base_date, parsed_time)


def calculate_working_day_deadline(reported_datetime: datetime, working_days: float) -> datetime:
    """
    Calculates SLA deadline based on working-day business calendar.
    Skips weekends (Saturday = weekday 5, Sunday = weekday 6).
    Matches application working days logic.
    """
    if working_days <= 0:
        return reported_datetime

    full_days = int(working_days)
    fraction = working_days - full_days

    current = reported_datetime
    remaining_days = full_days

    while remaining_days > 0:
        current += timedelta(days=1)
        if current.weekday() < 5:  # Monday through Friday
            remaining_days -= 1

    if fraction > 0:
        added_seconds = fraction * 24 * 3600
        current += timedelta(seconds=added_seconds)
        # Adjust if landing on weekend
        while current.weekday() >= 5:
            current += timedelta(days=1)

    return current


def calculate_sla_details(ticket: Dict[str, Any], current_time: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Calculates SLA Duration and Deadline according to business priorities:
    Priority 1: approvedHours (decimal hours converted to minutes via approvedHours * 60)
    Priority 2: workingDays (working-day deadline calculation)
    Priority 3: None (SLA information unavailable)
    """
    raw_status = ticket.get("ticketStepstatus")
    if raw_status is None or not str(raw_status).strip():
        raw_status = ticket.get("ticketStaus")
    step_status = str(raw_status or "").strip()
    is_pending = (step_status.lower() == "pending")

    if not is_pending:
        return {
            "is_pending": False,
            "sla_available": False,
            "reason": f"Step status '{step_status}' is not Pending"
        }

    rep_on = ticket.get("reportedon") or ticket.get("reportedDate") or ticket.get("reportedDateTime")
    rep_time = ticket.get("reportedontime") or ticket.get("reportedTime")
    reported_dt = parse_reported_datetime(rep_on, rep_time)

    approved_hours_val = ticket.get("approvedHours")
    working_days_val = ticket.get("workingDays")

    # Priority 1: approvedHours
    if approved_hours_val is not None and str(approved_hours_val).strip() != "":
        try:
            approved_hours = float(approved_hours_val)
            sla_duration_minutes = approved_hours * 60.0
            sla_deadline = reported_dt + timedelta(minutes=sla_duration_minutes)
            return {
                "is_pending": True,
                "sla_available": True,
                "priority_source": "approvedHours",
                "approved_hours": approved_hours,
                "sla_duration_minutes": sla_duration_minutes,
                "reported_datetime": reported_dt,
                "sla_deadline": sla_deadline
            }
        except (ValueError, TypeError):
            logger.warning(f"Invalid approvedHours value '{approved_hours_val}' on ticket {ticket.get('ticketId')}")

    # Priority 2: workingDays
    if working_days_val is not None and str(working_days_val).strip() != "":
        try:
            working_days = float(working_days_val)
            sla_deadline = calculate_working_day_deadline(reported_dt, working_days)
            total_duration_minutes = (sla_deadline - reported_dt).total_seconds() / 60.0
            return {
                "is_pending": True,
                "sla_available": True,
                "priority_source": "workingDays",
                "working_days": working_days,
                "sla_duration_minutes": total_duration_minutes,
                "reported_datetime": reported_dt,
                "sla_deadline": sla_deadline
            }
        except (ValueError, TypeError):
            logger.warning(f"Invalid workingDays value '{working_days_val}' on ticket {ticket.get('ticketId')}")

    # Priority 3: Neither exists
    return {
        "is_pending": True,
        "sla_available": False,
        "reason": "SLA information unavailable (neither approvedHours nor workingDays present)"
    }


def should_send_reminder(
    sla_duration_minutes: float,
    sla_deadline: datetime,
    current_time: datetime,
    reminder_already_sent: bool,
    threshold_minutes: float = 30.0
) -> Tuple[bool, str, float]:
    """
    Evaluates reminder condition:
    - If reminder already sent -> False
    - If SLA duration <= threshold_minutes (e.g. 30 mins) -> Immediate reminder required (True)
    - If SLA duration > threshold_minutes -> Send when 0 < remaining_minutes <= threshold_minutes
    Returns (should_send: bool, reason: str, remaining_minutes: float)
    """
    if reminder_already_sent:
        return False, "Reminder already sent for this ticket/step/SLA", 0.0

    remaining_minutes = (sla_deadline - current_time).total_seconds() / 60.0

    # CASE 2: Short SLA (<= 30 minutes)
    if sla_duration_minutes <= threshold_minutes:
        return True, "SLA duration <= 30 mins (Short SLA - Immediate reminder required)", remaining_minutes

    # CASE 1: Long SLA (> 30 minutes)
    if 0 < remaining_minutes <= threshold_minutes:
        return True, f"Remaining time ({remaining_minutes:.1f} mins) is within threshold (<= {threshold_minutes} mins)", remaining_minutes

    if remaining_minutes <= 0:
        return False, f"SLA expired ({abs(remaining_minutes):.1f} mins ago)", remaining_minutes

    return False, f"SLA not yet within threshold ({remaining_minutes:.1f} mins remaining)", remaining_minutes


def extract_step_name(ticket: Dict[str, Any]) -> str:
    """Extracts actual ticket step name from ticket object (checking documentType first)."""
    for field in ("documentType", "stepName", "step", "ticketStep", "ticketStepName", "step_name"):
        val = ticket.get(field)
        if val and str(val).strip():
            return str(val).strip()
    return "Pending Step"


_cycle_lock = threading.Lock()


async def run_sla_monitoring_cycle_async(
    ams_client: Optional[AMSApi] = None,
    current_time: Optional[datetime] = None,
    threshold_minutes: float = 30.0
) -> Dict[str, Any]:
    """
    Executes a complete non-blocking asynchronous SLA Monitoring cycle using httpx:
    1. Fetches ticket details via GET /api/Ticket/GetTicketDetails asynchronously
    2. Takes top 100 tickets
    3. Filters for ticketStepstatus == 'Pending' (case-insensitive)
    4. Calculates SLA duration/deadline
    5. Checks reminder condition
    6. Sends POST /api/Ticket/SendTicketStepReminder asynchronously if required
    7. Marks reminder as sent ONLY on HTTP POST success
    """
    if not _cycle_lock.acquire(blocking=False):
        logger.info("SLA Monitoring cycle already in progress. Skipping duplicate execution.")
        return {
            "success": True,
            "message": "SLA Monitoring cycle already in progress.",
            "skipped": True,
            "reminders_sent": 0
        }

    try:
        now = current_time or datetime.now()
        logger.info(f"Async SLA Monitor cycle started at {now.isoformat()}")

        client = ams_client or AMSApi()

        async with httpx.AsyncClient(timeout=15.0) as http_client:
            # 1. Fetch tickets asynchronously
            try:
                tickets = await client.get_ticket_details(timeout=15)
            except Exception as err:
                logger.error(f"Failed to fetch tickets from GetTicketDetails API: {err}")
                return {
                    "success": False,
                    "error": f"Failed to fetch tickets: {err}",
                    "processed_count": 0,
                    "reminders_sent": 0
                }

            if not isinstance(tickets, list):
                logger.error(f"Unexpected response format from GetTicketDetails: {type(tickets)}")
                tickets = []

            # 2. Top 100 tickets
            top_100_tickets = tickets[:100]
            total_fetched = len(tickets)
            processed_top = len(top_100_tickets)
            logger.info(f"Fetched {total_fetched} tickets. Processing top {processed_top} tickets.")

            pending_count = 0
            reminders_sent_count = 0
            reminders_failed_count = 0
            skipped_count = 0
            already_sent_count = 0

            logs: List[str] = []

            for ticket in top_100_tickets:
                ticket_id = str(ticket.get("ticketId") or ticket.get("id") or "UNKNOWN").strip()
                step_name = extract_step_name(ticket)

                try:
                    sla_info = calculate_sla_details(ticket, current_time=now)

                    if not sla_info.get("is_pending"):
                        continue

                    pending_count += 1
                    logs.append(f"Ticket: {ticket_id} | Step: {step_name} | Status: Pending")

                    if not sla_info.get("sla_available"):
                        logger.info(f"Ticket: {ticket_id} - SLA information unavailable")
                        logs.append(f"Ticket: {ticket_id} - SLA information unavailable - Skipped")
                        skipped_count += 1
                        continue

                    sla_duration = sla_info["sla_duration_minutes"]
                    sla_deadline = sla_info["sla_deadline"]
                    priority_src = sla_info["priority_source"]

                    store_key = SLAReminderStore.make_key(ticket_id, step_name, sla_deadline)
                    already_sent = SLAReminderStore.is_sent(store_key)

                    should_send, reason, remaining_mins = should_send_reminder(
                        sla_duration_minutes=sla_duration,
                        sla_deadline=sla_deadline,
                        current_time=now,
                        reminder_already_sent=already_sent,
                        threshold_minutes=threshold_minutes
                    )

                    if already_sent:
                        already_sent_count += 1
                        logs.append(f"Ticket: {ticket_id} - Reminder already sent - Skipped")
                        logger.info(f"Ticket: {ticket_id} - Reminder already sent")
                        continue

                    if not should_send:
                        logs.append(f"Ticket: {ticket_id} - SLA Duration: {sla_duration:.1f}m - Remaining: {remaining_mins:.1f}m - {reason}")
                        logger.info(f"Ticket: {ticket_id} - {reason}")
                        continue

                    # Reminder is required!
                    display_mins = remaining_mins if remaining_mins > 0 else sla_duration
                    mins_int = int(round(display_mins))
                    if mins_int <= 0:
                        mins_int = int(round(sla_duration))
                    time_remaining_str = f"{mins_int} Mins"

                    payload = {
                        "consultantName": str(ticket.get("name") or "").strip(),
                        "consultantEmail": str(ticket.get("email") or "").strip(),
                        "ticketNo": ticket_id,
                        "timeRemaining": time_remaining_str,
                        "stepName": step_name
                    }

                    logger.info(f"Sending ticket step reminder for Ticket: {ticket_id} (Step: {step_name}, Remaining: {time_remaining_str})")

                    # Execute POST request asynchronously
                    try:
                        await asyncio.sleep(0.05)
                        res = await client.send_ticket_step_reminder(payload, timeout=15)
                        # Success! Mark as sent
                        SLAReminderStore.mark_sent(store_key, {
                            "ticketId": ticket_id,
                            "stepName": step_name,
                            "sla_deadline": sla_deadline.isoformat(),
                            "priority_source": priority_src,
                            "payload": payload,
                            "response": str(res)
                        })
                        reminders_sent_count += 1
                        logs.append(f"Ticket: {ticket_id} | Step: {step_name} | Reminder Sent: SUCCESS")
                        logger.info(f"Ticket: {ticket_id} | Reminder Sent: SUCCESS")
                    except Exception as post_err:
                        reminders_failed_count += 1
                        logs.append(f"Ticket: {ticket_id} | Step: {step_name} | Reminder Sent: FAILED ({post_err}) - DO NOT mark as sent")
                        logger.error(f"Ticket: {ticket_id} | Reminder POST failed: {post_err}. Will retry on next cycle.")

                except Exception as ticket_err:
                    logger.error(f"Error processing ticket {ticket_id}: {ticket_err}")
                    logs.append(f"Ticket: {ticket_id} - Processing error: {ticket_err}")

            summary_msg = (
                f"SLA Monitor cycle completed. "
                f"Total Fetched: {total_fetched}, Top 100 Processed: {processed_top}, "
                f"Pending: {pending_count}, Reminders Sent: {reminders_sent_count}, "
                f"POST Failed (Retrying): {reminders_failed_count}, Already Sent: {already_sent_count}, "
                f"No SLA Info: {skipped_count}"
            )
            logger.info(summary_msg)

            return {
                "success": True,
                "timestamp": now.isoformat(),
                "total_fetched": total_fetched,
                "processed_top": processed_top,
                "pending_count": pending_count,
                "reminders_sent": reminders_sent_count,
                "reminders_failed": reminders_failed_count,
                "already_sent_count": already_sent_count,
                "no_sla_info_count": skipped_count,
                "logs": logs
            }
    finally:
        _cycle_lock.release()


def run_sla_monitoring_cycle(
    ams_client: Optional[AMSApi] = None,
    current_time: Optional[datetime] = None,
    threshold_minutes: float = 30.0
) -> Dict[str, Any]:
    """Synchronous wrapper for run_sla_monitoring_cycle_async."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(
                lambda: asyncio.run(run_sla_monitoring_cycle_async(ams_client, current_time, threshold_minutes))
            )
            return future.result()
    else:
        return asyncio.run(run_sla_monitoring_cycle_async(ams_client, current_time, threshold_minutes))
