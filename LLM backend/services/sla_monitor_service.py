"""
services/sla_monitor_service.py - Modular SLA Monitoring Engine for AMS Application.

Features:
1. Data source from GET /api/Ticket/GetTicketDetails (grouped by ticketId, mapped via map_api_row_to_internal).
2. SLA clock starts at FS step (FS_DOC_TYPE). Approved hours read ONLY from BRD step (BRD_DOC_TYPE).
3. Priority-based reminder intervals (1=24h, 2=24h, 3=1h, 4=1h).
4. Short-SLA rule: Approved hours < 1 sent immediately.
5. SLA breach handling: Calculates and records overrun duration (current time - deadline) until closed.
6. Skip finished/closed tickets.
7. Dummy AMS client with comprehensive test data for offline dev and easy swapping to real AMSApi.
"""

import os
import time
import logging
import inspect
import threading
import asyncio
from datetime import datetime, date, time as dt_time, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set
from collections import defaultdict

# Import configuration constants
from config import (
    BRD_DOC_TYPE,
    FS_DOC_TYPE,
    BUSINESS_START_HOUR,
    BUSINESS_END_HOUR,
    P3_P4_REMINDER_HOUR,
    SHORT_SLA_REMINDER_INTERVAL_MINUTES,
    PRIORITY_REMINDER_INTERVALS_HOURS,
    PRIORITY_NAMES,
    ACTIVE_TICKET_STATUS,
    CLOSED_TICKET_STATUSES,
    SLA_EMAIL,
    SLA_PASSWORD,
    TICKET_DETAILS_API_URL,
    TICKET_STEP_REMINDER_API_URL,
)
from ams_api import AMSApi
from services.sla_reminder_store import SLATracker, resolve_db_path

# Configure logger for SLA Monitoring Engine
logger = logging.getLogger("SLA_Monitor")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [SLA Monitor] [%(levelname)s] %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)


def now_local() -> datetime:
    """
    Returns naive local datetime driven by optional SLA_TIMEZONE env var (e.g. Asia/Kolkata).
    Falls back to system datetime.now().
    """
    tz_str = os.getenv("SLA_TIMEZONE")
    if tz_str:
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo(tz_str)
            return datetime.now(tz).replace(tzinfo=None)
        except Exception as e:
            logger.warning(f"Could not parse SLA_TIMEZONE '{tz_str}': {e}. Using system local time.")
    return datetime.now()


def log_startup_timezone():
    """Logs startup information showing server local time and configured SLA credentials."""
    now_dt = now_local()
    tz_name = time.tzname[time.daylight] if time.daylight else time.tzname[0]
    current_email = AMSApi().email
    logger.info(
        f"SLA Service Startup | Local Time: {now_dt.strftime('%Y-%m-%d %H:%M:%S')} | "
        f"Timezone: {tz_name} | SLA Email: {current_email or 'Not Configured'} | "
        f"BRD DocType: {BRD_DOC_TYPE} | FS DocType: {FS_DOC_TYPE}"
    )


def map_api_row_to_internal(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maps raw API response row field names (keeping exact API spellings ticketStaus, assigintoindividual)
    to a clean internal dictionary in one dedicated place.
    """
    prio_val = row.get("priority")
    try:
        priority = int(prio_val) if prio_val is not None else 1
    except (ValueError, TypeError):
        priority = 1

    app_hrs_raw = row.get("customerApprovedHours")
    approved_hours: Optional[float] = None
    if app_hrs_raw is not None and str(app_hrs_raw).strip() != "":
        try:
            approved_hours = float(app_hrs_raw)
        except (ValueError, TypeError):
            approved_hours = None

    work_days_raw = row.get("workingDays")
    working_days: Optional[float] = None
    if work_days_raw is not None and str(work_days_raw).strip() != "":
        try:
            working_days = float(work_days_raw)
        except (ValueError, TypeError):
            working_days = None

    return {
        "ticket_id": str(row.get("ticketId") or "").strip(),
        "priority": priority,
        "customer_approved_hours": approved_hours,
        "document_type": str(row.get("documentType") or "").strip(),
        "ticket_status": str(row.get("ticketStaus") or "").strip(),
        "working_days": working_days,
        "ticket_step_status": str(row.get("ticketStepstatus") or "").strip(),
        "reported_on_time": str(row.get("reportedontime") or "").strip(),
        "assigned_to_individual": row.get("assigintoindividual"),
        "name": str(row.get("name") or "").strip(),
        "email": str(row.get("email") or "").strip(),
        "raw_row": row,
    }


def format_time_remaining(minutes: int) -> str:
    """
    Formats remaining time in minutes into a clean human-readable string:
    - Less than 60 mins       -> 'X mins'
    - 60 mins to 1439 mins    -> 'X hrs Y mins' (or 'X hrs' if Y=0)
    - 1440 mins (24h) or more -> 'X days Y hrs Z mins'
    """
    if minutes < 0:
        minutes = 0
    if minutes < 60:
        return f"{minutes} mins"

    if minutes < 1440:
        hours = minutes // 60
        rem_mins = minutes % 60
        if rem_mins > 0:
            return f"{hours} hrs {rem_mins} mins"
        return f"{hours} hrs"

    # 24 hours (1440 mins) or more
    days = minutes // 1440
    rem_after_days = minutes % 1440
    hours = rem_after_days // 60
    rem_mins = rem_after_days % 60

    day_unit = "day" if days == 1 else "days"
    parts = [f"{days} {day_unit}"]
    if hours > 0:
        parts.append(f"{hours} hrs")
    if rem_mins > 0:
        parts.append(f"{rem_mins} mins")

    return " ".join(parts)


def resolve_latest_step_name(steps_data: Any, default_step: str = "BUD") -> str:
    """
    Parses response from GET /api/Ticket/GetTicketSteps/{ticketNo},
    walks the steps list IN REVERSE, and returns the documentType of the latest step with a non-null documentType.
    """
    if not steps_data:
        return default_step

    steps_list = []
    if isinstance(steps_data, dict):
        steps_list = steps_data.get("steps") or steps_data.get("data") or steps_data.get("result") or []
    elif isinstance(steps_data, list):
        steps_list = steps_data

    if not isinstance(steps_list, list):
        return default_step

    for step in reversed(steps_list):
        if isinstance(step, dict):
            doc_type = step.get("documentType")
            if doc_type and str(doc_type).strip() and str(doc_type).strip().lower() != "null":
                return str(doc_type).strip()

    return default_step



def parse_reported_on_time(time_str: str, ref_date: Optional[date] = None) -> datetime:
    """
    Parses reportedontime, which is a time-only string in HH:mm:ss:fff format (e.g., '12:27:33:507' or '12:27:33').
    Combines parsed time with reference date (defaults to today's local date).

    # TODO: Replace today's date fallback once real API provides full date/timestamp field.
    """
    base_date = ref_date or now_local().date()
    if not time_str or not str(time_str).strip():
        return datetime.combine(base_date, dt_time(0, 0, 0))

    t_str = str(time_str).strip().replace(".", ":")
    parts = t_str.split(":")

    try:
        h = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
        m = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        s = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
        ms = 0
        if len(parts) > 3 and parts[3].isdigit():
            ms_str = parts[3]
            if len(ms_str) == 3:
                ms = int(ms_str) * 1000
            elif len(ms_str) > 0:
                ms = int(ms_str.ljust(6, '0')[:6])
        parsed_time = dt_time(h, m, s, ms)
    except Exception as e:
        logger.warning(f"Could not parse reportedontime '{time_str}': {e}. Defaulting to 00:00:00.")
        parsed_time = dt_time(0, 0, 0)

    return datetime.combine(base_date, parsed_time)


def is_working_day(dt: datetime) -> bool:
    """Returns True if dt is Monday through Friday (weekday 0..4)."""
    return dt.weekday() < 5


def calculate_business_hours_deadline(fs_start_time: datetime, approved_hours: float) -> datetime:
    """
    Calculates SLA deadline strictly within the daily 9 AM to 7 PM business window (10 hours/day),
    skipping weekends (Saturday & Sunday) and overnight hours (7 PM to 9 AM).
    """
    if approved_hours <= 0:
        return fs_start_time

    current = fs_start_time

    # Align starting time to business hours window if needed
    while True:
        if current.weekday() >= 5:  # Weekend
            days_ahead = 7 - current.weekday()
            current = datetime.combine(current.date() + timedelta(days=days_ahead), dt_time(BUSINESS_START_HOUR, 0, 0))
            continue

        if current.hour < BUSINESS_START_HOUR:
            current = datetime.combine(current.date(), dt_time(BUSINESS_START_HOUR, 0, 0))
            break
        elif current.hour >= BUSINESS_END_HOUR:
            current = datetime.combine(current.date() + timedelta(days=1), dt_time(BUSINESS_START_HOUR, 0, 0))
            continue
        else:
            break

    remaining_hours = approved_hours

    while remaining_hours > 0:
        end_of_business_today = datetime.combine(current.date(), dt_time(BUSINESS_END_HOUR, 0, 0))
        available_hours_today = (end_of_business_today - current).total_seconds() / 3600.0

        if remaining_hours <= available_hours_today:
            current += timedelta(hours=remaining_hours)
            remaining_hours = 0
            break
        else:
            remaining_hours -= available_hours_today
            next_day = current.date() + timedelta(days=1)
            while next_day.weekday() >= 5:  # Skip Sat & Sun
                next_day += timedelta(days=1)
            current = datetime.combine(next_day, dt_time(BUSINESS_START_HOUR, 0, 0))

    return current


def calculate_sla_deadline(
    fs_start_time: datetime,
    approved_hours: float,
    working_days: Optional[float] = None
) -> datetime:
    """
    Calculates SLA deadline from FS start time and approved hours.
    Calculates time strictly from 9 AM to 7 PM daily on business days (Mon-Fri).
    """
    return calculate_business_hours_deadline(fs_start_time, approved_hours)


def should_send_reminder(
    ticket_id: str,
    priority: int,
    approved_hours: float,
    is_breached: bool,
    last_sent_at: Optional[datetime],
    current_time: datetime
) -> bool:
    """
    Evaluates whether a reminder payload should be sent for a ticket during this cycle:
    - Weekend blackout rule: NO reminders on Sat & Sun for ANY priority.
    - Business hours rule: NO reminders outside 9 AM - 7 PM window.
    - Low (1) & Medium (2) Priority: Daily at 6:00 PM (18:00) on working days (Mon-Fri).
    - High (3) & Very High (4) Priority: Every 1 hour (9 AM - 7 PM window, Mon-Fri).
    """
    # 1. Weekend Blackout Rule: Absolutely NO reminders on Sat (5) & Sun (6)
    if current_time.weekday() >= 5:
        return False

    # 2. Business Hours Rule: NO reminders outside 9 AM - 7 PM window
    if current_time.hour < BUSINESS_START_HOUR or current_time.hour >= BUSINESS_END_HOUR:
        return False

    # 3. Priority 1 (Low) & Priority 2 (Medium): Daily at 6:00 PM (18:00)
    if priority in (1, 2):
        from config import LOW_MED_REMINDER_HOUR
        if current_time.hour < LOW_MED_REMINDER_HOUR:
            return False
        if last_sent_at is None:
            return True
        return last_sent_at.date() < current_time.date()

    # 4. Priority 3 (High, 1h) and Priority 4 (Very High, 1h)
    interval_hours = PRIORITY_REMINDER_INTERVALS_HOURS.get(priority, 1.0)

    if last_sent_at is None:
        return True

    elapsed = current_time - last_sent_at

    # Short-SLA rule: approved hours <= 1.0 hour (minimum 15-minute throttle interval)
    if approved_hours <= 1.0 and not is_breached:
        return elapsed >= timedelta(minutes=SHORT_SLA_REMINDER_INTERVAL_MINUTES)

    return elapsed >= timedelta(hours=interval_hours)


_cycle_lock = threading.Lock()


async def run_sla_monitoring_cycle_async(
    ams_client: Optional[Any] = None,
    current_time: Optional[datetime] = None,
    db_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a complete SLA Monitoring cycle:
    1. Fetches tickets directly from AMS API (/api/Ticket/GetTicketDetails).
    2. Maps raw fields to clean internal structure and groups by ticketId.
    3. Gates strictly on ticketStaus == ACTIVE_TICKET_STATUS ('inprocess'). Hard-deletes closed tickets.
    4. Evaluates SLA clock start at FS step and reads approved hours ONLY from BRD step.
    5. Locks original_fs_start_time on first discovery to anchor deadlines permanently across daily rollovers.
    6. Evaluates breach status & overrun duration.
    7. Applies priority rules (1/2=Daily at 6 PM, 3/4=1h) and short-SLA 15m throttle.
    8. Tracks last-sent timestamps in SLATracker store.
    """
    if not _cycle_lock.acquire(blocking=False):
        logger.info("SLA Monitoring cycle already in progress. Skipping execution.")
        return {
            "success": True,
            "message": "SLA Monitoring cycle already in progress.",
            "skipped": True,
            "reminders_sent": 0
        }

    try:
        now = current_time or now_local()
        target_db = resolve_db_path(db_path)
        
        # Ensure SQLite DB store initialized
        await asyncio.to_thread(SLATracker.init, target_db)

        logger.info(f"SLA Monitor cycle started at {now.isoformat()} (DB: {target_db})")

        # Select client: Provided client or real AMSApi
        if ams_client is not None:
            client = ams_client
        else:
            client = AMSApi()

        # 1. Fetch tickets from API
        try:
            res_or_coro = client.get_ticket_details(timeout=60)
            if asyncio.iscoroutine(res_or_coro) or inspect.isawaitable(res_or_coro):
                raw_tickets = await res_or_coro
            else:
                raw_tickets = res_or_coro
        except Exception as err:
            logger.error(f"Failed to fetch tickets from GetTicketDetails API: {err}. Aborting cycle.")
            return {
                "success": False,
                "error": f"Failed to fetch tickets: {err}",
                "total_fetched": 0,
                "reminders_sent": 0,
                "reminders_failed": 0
            }

        if not isinstance(raw_tickets, list):
            logger.error(f"Unexpected response format from GetTicketDetails ({type(raw_tickets)}). Aborting cycle.")
            return {
                "success": False,
                "error": f"Unexpected response format: {type(raw_tickets)}",
                "total_fetched": 0,
                "reminders_sent": 0,
                "reminders_failed": 0
            }

        total_fetched = len(raw_tickets)

        # 2. Map fields and group rows by ticketId
        grouped_tickets: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for row in raw_tickets:
            mapped_row = map_api_row_to_internal(row)
            t_id = mapped_row["ticket_id"]
            if t_id:
                grouped_tickets[t_id].append(mapped_row)

        sent_count = 0
        failed_count = 0
        skipped_count = 0
        processed_tickets = 0

        # 3. Process each ticket group
        for ticket_id, rows in grouped_tickets.items():
            processed_tickets += 1
            try:
                ticket_status = str(rows[0]["ticket_status"] or "").strip().lower()

                # Rule 1: If ticket is closed/completed, hard DELETE from SQLite store
                if ticket_status in CLOSED_TICKET_STATUSES:
                    logger.debug(f"Ticket '{ticket_id}' status is '{rows[0]['ticket_status']}' (Closed/Completed). Deleting from tracker DB.")
                    await asyncio.to_thread(SLATracker.delete_ticket, ticket_id, target_db)
                    skipped_count += 1
                    continue

                # Rule 2: Only tickets with ticketStaus == ACTIVE_TICKET_STATUS ('inprocess') are tracked
                if ticket_status != ACTIVE_TICKET_STATUS:
                    logger.debug(f"Ticket '{ticket_id}' status is '{rows[0]['ticket_status']}' (not '{ACTIVE_TICKET_STATUS}'). Skipping monitoring.")
                    skipped_count += 1
                    continue

                # Rule 3: Read customerApprovedHours ONLY from the BRD step row (must be > 0)
                brd_row = next(
                    (r for r in rows if r["document_type"].upper() == BRD_DOC_TYPE.upper()), None
                )

                if brd_row is None or brd_row["customer_approved_hours"] is None or brd_row["customer_approved_hours"] <= 0:
                    app_hrs_val = brd_row.get("customer_approved_hours") if brd_row else None
                    logger.debug(
                        f"Ticket '{ticket_id}': BRD step ('{BRD_DOC_TYPE}') row missing, null, or customerApprovedHours is <= 0 ({app_hrs_val}). "
                        f"Deleting any existing record from DB and skipping monitoring."
                    )
                    await asyncio.to_thread(SLATracker.delete_ticket, ticket_id, target_db)
                    skipped_count += 1
                    continue

                approved_hours = brd_row["customer_approved_hours"]
                priority = brd_row["priority"]
                working_days = brd_row["working_days"]
                consultant_name = brd_row["name"] or rows[0]["name"]
                consultant_email = brd_row["email"] or rows[0]["email"]

                # Rule 4: SLA clock starts at FS step
                fs_row = next(
                    (r for r in rows if r["document_type"].upper() == FS_DOC_TYPE.upper()), None
                )
                timing_row = fs_row or brd_row
                reported_time_str = timing_row["reported_on_time"]

                # Timestamp Anchoring: Fetch existing DB record to reuse anchored original_fs_start_time
                existing_record = await asyncio.to_thread(SLATracker.get_row, ticket_id, target_db)
                last_sent_at: Optional[datetime] = None
                original_fs_start_time: Optional[datetime] = None

                if existing_record:
                    prev_approved = existing_record.get("customer_approved_hours")
                    orig_fs_str = existing_record.get("original_fs_start_time")
                    if orig_fs_str:
                        try:
                            original_fs_start_time = datetime.fromisoformat(orig_fs_str)
                        except Exception:
                            original_fs_start_time = None

                    # Only reset last_sent_at if customerApprovedHours was updated
                    if prev_approved is not None and prev_approved != approved_hours:
                        logger.info(
                            f"Ticket '{ticket_id}': Customer approved hours updated ({prev_approved}h -> {approved_hours}h). Resetting last_sent_at."
                        )
                        last_sent_at = None
                    elif existing_record.get("last_sent_at"):
                        try:
                            last_sent_at = datetime.fromisoformat(existing_record["last_sent_at"])
                        except Exception:
                            last_sent_at = None

                # If ticket is seen for the first time, combine time string with today's date and anchor it
                if original_fs_start_time is None:
                    fs_start_time = parse_reported_on_time(reported_time_str, ref_date=now.date())
                    original_fs_start_time = fs_start_time
                else:
                    fs_start_time = original_fs_start_time

                # Calculate Deadline from anchored fs_start_time
                sla_deadline = calculate_sla_deadline(fs_start_time, approved_hours, working_days)

                # Evaluate SLA Breach & Overrun
                is_breached = (now > sla_deadline)
                if is_breached:
                    sla_status = "SLA_BREACHED"
                    overrun_seconds = (now - sla_deadline).total_seconds()
                    overrun_mins = int(round(overrun_seconds / 60.0))
                    overrun_str = f"Overdue by {overrun_mins} Mins"
                    time_remaining_str = "0 Mins"
                else:
                    sla_status = "WITHIN_SLA"
                    overrun_seconds = 0.0
                    overrun_str = "None"
                    rem_mins = max(0, int(round((sla_deadline - now).total_seconds() / 60.0)))
                    time_remaining_str = f"{rem_mins} Mins"

                # Check if reminder is due
                due_to_send = should_send_reminder(
                    ticket_id=ticket_id,
                    priority=priority,
                    approved_hours=approved_hours,
                    is_breached=is_breached,
                    last_sent_at=last_sent_at,
                    current_time=now
                )

                # Update store with current calculated state and anchored start time
                await asyncio.to_thread(
                    SLATracker.update_ticket_state,
                    ticket_id=ticket_id,
                    priority=priority,
                    approved_hours=approved_hours,
                    fs_start_time=fs_start_time,
                    sla_deadline=sla_deadline,
                    sla_status=sla_status,
                    overrun_seconds=overrun_seconds,
                    consultant_name=consultant_name,
                    consultant_email=consultant_email,
                    original_fs_start_time=original_fs_start_time,
                    now=now,
                    db_path=target_db,
                )

                if not due_to_send:
                    logger.info(f"Ticket '{ticket_id}': Reminder within interval (Last sent: {last_sent_at}). Skipping duplicate payload.")
                    continue

                # Construct exact 5-field reminder payload for /api/Ticket/SendTicketStepReminder
                # 1. Dynamically fetch latest active step from GET /api/Ticket/GetTicketSteps/{ticketNo}
                step_name_val = timing_row.get("document_type") or BRD_DOC_TYPE or "BUD"
                try:
                    steps_res = client.get_ticket_steps(ticket_id)
                    if asyncio.iscoroutine(steps_res) or inspect.isawaitable(steps_res):
                        steps_res = await steps_res
                    step_name_val = resolve_latest_step_name(steps_res, default_step=step_name_val)
                except Exception as steps_err:
                    logger.warning(
                        f"Could not fetch latest steps from API for ticket '{ticket_id}': {steps_err}. "
                        f"Falling back to default step '{step_name_val}'."
                    )

                # 2. Format timeRemaining payload (hours + mins if >= 60 mins)
                if is_breached:
                    time_remaining_payload = overrun_str
                else:
                    time_remaining_payload = format_time_remaining(rem_mins)

                payload = {
                    "consultantName": consultant_name or "",
                    "consultantEmail": consultant_email or "",
                    "ticketNo": ticket_id,
                    "timeRemaining": time_remaining_payload,
                    "stepName": step_name_val,
                }

                logger.info(
                    f"Sending SLA Reminder Payload | Ticket: {ticket_id} | Priority: {priority} ({PRIORITY_NAMES.get(priority)}) | "
                    f"Approved Hours: {approved_hours}h | Status: {sla_status} | Overrun: {overrun_str} | Remaining: {time_remaining_str}"
                )

                # Send payload to API
                try:
                    res_or_coro = client.send_ticket_step_reminder(payload, timeout=15)
                    if asyncio.iscoroutine(res_or_coro) or inspect.isawaitable(res_or_coro):
                        await res_or_coro
                    
                    await asyncio.to_thread(
                        SLATracker.record_reminder_sent,
                        ticket_id=ticket_id,
                        sent_at=now,
                        sla_status=sla_status,
                        overrun_seconds=overrun_seconds,
                        db_path=target_db
                    )
                    sent_count += 1
                    logger.info(f"Ticket '{ticket_id}' reminder posted successfully.")
                except Exception as post_err:
                    failed_count += 1
                    logger.error(f"Failed to post reminder for Ticket '{ticket_id}': {post_err}")

            except Exception as ticket_err:
                logger.error(f"Error processing ticket '{ticket_id}': {ticket_err}")

        logger.info(
            f"SLA Monitoring Cycle Complete | Total Fetched Rows: {total_fetched} | Unique Tickets: {len(grouped_tickets)} | "
            f"Sent: {sent_count} | Skipped: {skipped_count} | Failed: {failed_count}"
        )

        return {
            "success": True,
            "timestamp": now.isoformat(),
            "total_fetched": total_fetched,
            "total_tickets": len(grouped_tickets),
            "reminders_sent": sent_count,
            "skipped_count": skipped_count,
            "reminders_failed": failed_count,
        }

    finally:
        _cycle_lock.release()


def run_sla_monitoring_cycle(
    ams_client: Optional[Any] = None,
    current_time: Optional[datetime] = None,
    db_path: Optional[str] = None
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
                lambda: asyncio.run(
                    run_sla_monitoring_cycle_async(ams_client, current_time, db_path)
                )
            )
            return future.result()
    else:
        return asyncio.run(
            run_sla_monitoring_cycle_async(ams_client, current_time, db_path)
        )
