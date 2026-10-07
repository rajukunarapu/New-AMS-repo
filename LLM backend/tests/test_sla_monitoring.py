"""
tests/test_sla_monitoring.py - Pytest Test Suite for SLA Monitoring Engine.
Tests all requirements & confirmed business rules:
1. Field mapping & ticket grouping
2. SLA clock start at FS step & BRD approved hours
3. Skipping tickets with no BRD approved hours
4. Priority intervals (1=Low/24h at 6 PM, 2=Med/24h at 6 PM, 3=High/4h, 4=Very High/1h)
5. Short-SLA throttling rule (< 1 hour)
6. SLA breach marking and overrun tracking
7. Hard DELETE on finished/closed tickets
8. Inprocess ticket status gating
9. Timestamp anchoring across daily rollovers
"""

import os
import pytest
import tempfile
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from config import BRD_DOC_TYPE, FS_DOC_TYPE
from services.sla_reminder_store import SLATracker
from services.sla_monitor_service import (
    run_sla_monitoring_cycle,
    map_api_row_to_internal,
    parse_reported_on_time,
    calculate_sla_deadline,
    should_send_reminder,
    format_time_remaining,
    resolve_latest_step_name,
)


class MockAMSClient:
    """Mock AMS client for testing SLA Monitoring Engine."""

    def __init__(self, dummy_tickets: Optional[List[Dict[str, Any]]] = None):
        self.dummy_tickets = dummy_tickets if dummy_tickets is not None else []
        self.posted_reminders: List[Dict[str, Any]] = []

    async def get_ticket_details(self, timeout: float = 60) -> List[Dict[str, Any]]:
        return self.dummy_tickets

    async def send_ticket_step_reminder(self, payload: Dict[str, Any], timeout: float = 60) -> Dict[str, Any]:
        self.posted_reminders.append(payload)
        return {"status": "success", "payload": payload}


@pytest.fixture
def temp_db():
    """Provides a clean temporary SQLite database path for each test."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    SLATracker.init(db_path)
    yield db_path
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass


def test_01_api_row_mapping_and_field_names():
    """Test 1: Verifies raw API field mapping preserves exact API spellings mapped to internal keys."""
    raw_api_row = {
        "ticketId": "ATG2610102",
        "priority": 4,
        "customerApprovedHours": 5,
        "documentType": "BUD",
        "ticketStaus": "Inprocess",
        "workingDays": None,
        "ticketStepstatus": "Completed",
        "reportedontime": "12:27:33:507",
        "assigintoindividual": 121147,
        "name": "Thirupathi Galipelly",
        "email": "thirupathi.galipelly@neovatic.com"
    }

    mapped = map_api_row_to_internal(raw_api_row)

    assert mapped["ticket_id"] == "ATG2610102"
    assert mapped["priority"] == 4
    assert mapped["customer_approved_hours"] == 5.0
    assert mapped["document_type"] == "BUD"
    assert mapped["ticket_status"] == "Inprocess"
    assert mapped["working_days"] is None
    assert mapped["reported_on_time"] == "12:27:33:507"
    assert mapped["assigned_to_individual"] == 121147
    assert mapped["name"] == "Thirupathi Galipelly"
    assert mapped["email"] == "thirupathi.galipelly@neovatic.com"


def test_02_brd_approved_hours_and_fs_clock_start(temp_db):
    """Test 2: Approved hours read strictly from BRD step; SLA clock starts at FS step for P4 (Very High)."""
    tickets = [
        # BRD step row with 10 approved hours
        {
            "ticketId": "TICK-TEST-02",
            "priority": 4,  # Very High (1h interval)
            "customerApprovedHours": 10,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "08:00:00:000",
            "name": "Consultant A",
            "email": "a@example.com",
        },
        # FS step row (SLA clock starts at 09:00:00:000)
        {
            "ticketId": "TICK-TEST-02",
            "priority": 4,
            "customerApprovedHours": 99,  # Should be ignored!
            "documentType": FS_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
            "name": "Consultant A",
            "email": "a@example.com",
        }
    ]

    mock_client = MockAMSClient(dummy_tickets=tickets)
    now = datetime(2026, 10, 5, 9, 30, 0)

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now, db_path=temp_db)

    assert res["success"] is True
    assert res["reminders_sent"] == 1

    posted = mock_client.posted_reminders[0]
    assert posted["ticketNo"] == "TICK-TEST-02"
    assert posted["stepName"] == FS_DOC_TYPE

    row = SLATracker.get_row("TICK-TEST-02", db_path=temp_db)
    assert row is not None
    assert row["customer_approved_hours"] == 10.0
    # 09:00 (FS start time) + 10 business hours (9 AM - 7 PM) = 19:00 (7 PM) same day
    assert row["sla_deadline"] == "2026-10-05T19:00:00"


def test_03_no_brd_approved_hours_skipped(temp_db):
    """Test 3: Ticket with no BRD approved hours or 0 approved hours is skipped and no payload sent."""
    tickets = [
        {
            "ticketId": "TICK-NO-BRD",
            "priority": 4,
            "customerApprovedHours": None,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        },
        {
            "ticketId": "TICK-ZERO-BRD",
            "priority": 4,
            "customerApprovedHours": 0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        },
    ]

    mock_client = MockAMSClient(dummy_tickets=tickets)
    now = datetime(2026, 10, 5, 10, 0, 0)

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now, db_path=temp_db)

    assert res["success"] is True
    assert res["reminders_sent"] == 0
    assert len(mock_client.posted_reminders) == 0
    assert SLATracker.get_row("TICK-ZERO-BRD", db_path=temp_db) is None


def test_04_short_sla_immediate_rule(temp_db):
    """Test 4: Approved hours <= 1.0 hour triggers immediate payload sending for P4 (Very High)."""
    tickets = [
        {
            "ticketId": "TICK-SHORT",
            "priority": 4,  # P4 ticket
            "customerApprovedHours": 0.5,  # 30 mins SLA
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "10:00:00:000",
        },
        {
            "ticketId": "TICK-SHORT",
            "priority": 4,
            "customerApprovedHours": None,
            "documentType": FS_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "10:00:00:000",
        }
    ]

    mock_client = MockAMSClient(dummy_tickets=tickets)
    now_1005 = datetime(2026, 10, 5, 10, 5, 0)

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now_1005, db_path=temp_db)

    assert res["reminders_sent"] == 1
    assert len(mock_client.posted_reminders) == 1
    assert mock_client.posted_reminders[0]["ticketNo"] == "TICK-SHORT"


def test_05_breach_handling_and_overrun_tracking(temp_db):
    """Test 5: Ticket past deadline is marked SLA_BREACHED and records overrun duration."""
    tickets = [
        {
            "ticketId": "TICK-BREACH",
            "priority": 4,
            "customerApprovedHours": 1.0,  # 1 hour SLA
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "08:00:00:000",  # Aligns to 09:00 -> Deadline 10:00
        },
        {
            "ticketId": "TICK-BREACH",
            "priority": 4,
            "customerApprovedHours": None,
            "documentType": FS_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "08:00:00:000",
        }
    ]

    mock_client = MockAMSClient(dummy_tickets=tickets)
    now_1100 = datetime(2026, 10, 5, 11, 0, 0)  # 1 hour past 10:00 deadline!

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now_1100, db_path=temp_db)

    assert res["reminders_sent"] == 1
    posted = mock_client.posted_reminders[0]

    assert "Overdue by 60 Mins" in posted["timeRemaining"]

    row = SLATracker.get_row("TICK-BREACH", db_path=temp_db)
    assert row["sla_status"] == "SLA_BREACHED"
    assert row["overrun_seconds"] == 3600.0


def test_06_skip_finished_closed_tickets(temp_db):
    """Test 6: Closed/Completed tickets are hard-deleted from SQLite and do not trigger reminders."""
    tickets = [
        {
            "ticketId": "TICK-CLOSED",
            "priority": 4,
            "customerApprovedHours": 5.0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Completed",
            "reportedontime": "08:00:00:000",
        }
    ]

    mock_client = MockAMSClient(dummy_tickets=tickets)
    now = datetime(2026, 10, 5, 10, 0, 0)

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now, db_path=temp_db)

    assert res["success"] is True
    assert res["reminders_sent"] == 0
    assert len(mock_client.posted_reminders) == 0

    row = SLATracker.get_row("TICK-CLOSED", db_path=temp_db)
    assert row is None  # Hard-deleted!


def test_07_inprocess_status_gating(temp_db):
    """Test 7: Only tickets with ticketStaus == 'Inprocess' are monitored; others are ignored."""
    sample_tickets = [
        {
            "ticketId": "TICK-INPROCESS",
            "priority": 4,
            "customerApprovedHours": 5.0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "10:00:00:000",
        },
        {
            "ticketId": "TICK-PENDING",
            "priority": 4,
            "customerApprovedHours": 5.0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Pending",
            "reportedontime": "10:00:00:000",
        }
    ]
    mock_client = MockAMSClient(dummy_tickets=sample_tickets)
    now = datetime(2026, 10, 5, 10, 30, 0)

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now, db_path=temp_db)

    assert res["success"] is True
    assert res["total_tickets"] == 2
    assert res["reminders_sent"] == 1  # Only TICK-INPROCESS sent!

    row_inp = SLATracker.get_row("TICK-INPROCESS", db_path=temp_db)
    row_pen = SLATracker.get_row("TICK-PENDING", db_path=temp_db)

    assert row_inp is not None
    assert row_pen is None  # TICK-PENDING not written to SQLite!


def test_08_updated_approved_hours_recalculates_deadline(temp_db):
    """Test 8: Updating customerApprovedHours on an existing ticket recalculates deadline and resets reminder timer."""
    ticket_initial = [
        {
            "ticketId": "TICK-UPDATE-HOURS",
            "priority": 4,
            "customerApprovedHours": 10.0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        },
        {
            "ticketId": "TICK-UPDATE-HOURS",
            "priority": 4,
            "customerApprovedHours": None,
            "documentType": FS_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        }
    ]

    mock_client = MockAMSClient(dummy_tickets=ticket_initial)
    now_0900 = datetime(2026, 10, 5, 9, 0, 0)

    # Initial cycle -> 09:00 start + 10 business hours = 19:00 (7 PM)
    res1 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now_0900, db_path=temp_db)
    assert res1["reminders_sent"] == 1
    row1 = SLATracker.get_row("TICK-UPDATE-HOURS", db_path=temp_db)
    assert row1["customer_approved_hours"] == 10.0
    assert row1["sla_deadline"] == "2026-10-05T19:00:00"

    # Customer updates approved hours from 10h to 2h!
    ticket_updated = [
        {
            "ticketId": "TICK-UPDATE-HOURS",
            "priority": 4,
            "customerApprovedHours": 2.0,  # Updated from 10h to 2h!
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        },
        {
            "ticketId": "TICK-UPDATE-HOURS",
            "priority": 4,
            "customerApprovedHours": None,
            "documentType": FS_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        }
    ]
    mock_client.dummy_tickets = ticket_updated

    # Cycle at 09:05 -> detects updated hours (2h -> deadline 11:00) and triggers new reminder!
    now_0905 = datetime(2026, 10, 5, 9, 5, 0)
    res2 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now_0905, db_path=temp_db)
    assert res2["reminders_sent"] == 1
    row2 = SLATracker.get_row("TICK-UPDATE-HOURS", db_path=temp_db)
    assert row2["customer_approved_hours"] == 2.0
    assert row2["sla_deadline"] == "2026-10-05T11:00:00"


def test_09_different_prefix_same_digits_not_duplicated(temp_db):
    """Test 9: Verifies that ATG2610104 and Dix2610104 are treated as distinct tickets based on full ticket ID."""
    tickets = [
        # Ticket 1: ATG2610104
        {
            "ticketId": "ATG2610104",
            "priority": 4,
            "customerApprovedHours": 5.0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        },
        # Ticket 2: Dix2610104 (Same digits, different prefix!)
        {
            "ticketId": "Dix2610104",
            "priority": 4,
            "customerApprovedHours": 8.0,
            "documentType": BRD_DOC_TYPE,
            "ticketStaus": "Inprocess",
            "reportedontime": "09:00:00:000",
        }
    ]

    mock_client = MockAMSClient(dummy_tickets=tickets)
    now = datetime(2026, 10, 5, 10, 0, 0)

    res = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now, db_path=temp_db)

    assert res["success"] is True
    assert res["total_tickets"] == 2
    assert res["reminders_sent"] == 2

    row_atg = SLATracker.get_row("ATG2610104", db_path=temp_db)
    row_dix = SLATracker.get_row("Dix2610104", db_path=temp_db)

    assert row_atg is not None
    assert row_dix is not None
    assert row_atg["ticket_id"] == "ATG2610104"
    assert row_dix["ticket_id"] == "Dix2610104"
    assert row_atg["customer_approved_hours"] == 5.0
    assert row_dix["customer_approved_hours"] == 8.0


def test_10_weekend_blackout_rule(temp_db):
    """Test 10: NO reminders sent on Saturday or Sunday for ANY priority (1, 2, 3, 4)."""
    tickets = [
        {"ticketId": "P1-WEEKEND", "priority": 1, "customerApprovedHours": 5.0, "documentType": BRD_DOC_TYPE, "ticketStaus": "Inprocess", "reportedontime": "09:00:00:000"},
        {"ticketId": "P2-WEEKEND", "priority": 2, "customerApprovedHours": 5.0, "documentType": BRD_DOC_TYPE, "ticketStaus": "Inprocess", "reportedontime": "09:00:00:000"},
        {"ticketId": "P3-WEEKEND", "priority": 3, "customerApprovedHours": 5.0, "documentType": BRD_DOC_TYPE, "ticketStaus": "Inprocess", "reportedontime": "09:00:00:000"},
        {"ticketId": "P4-WEEKEND", "priority": 4, "customerApprovedHours": 5.0, "documentType": BRD_DOC_TYPE, "ticketStaus": "Inprocess", "reportedontime": "09:00:00:000"},
    ]
    mock_client = MockAMSClient(dummy_tickets=tickets)
    
    # Saturday Oct 10 2026 at 10:00 AM
    saturday_now = datetime(2026, 10, 10, 10, 0, 0)
    res_sat = run_sla_monitoring_cycle(ams_client=mock_client, current_time=saturday_now, db_path=temp_db)
    assert res_sat["reminders_sent"] == 0

    # Sunday Oct 11 2026 at 18:00 (6 PM)
    sunday_now = datetime(2026, 10, 11, 18, 0, 0)
    res_sun = run_sla_monitoring_cycle(ams_client=mock_client, current_time=sunday_now, db_path=temp_db)
    assert res_sun["reminders_sent"] == 0


def test_11_p1_p2_daily_6pm_rule(temp_db):
    """Test 11: P1 (Low) and P2 (Medium) tickets send reminders once daily at 6 PM (18:00) on working days."""
    tickets = [
        {"ticketId": "TICK-P1", "priority": 1, "customerApprovedHours": 10.0, "documentType": BRD_DOC_TYPE, "ticketStaus": "Inprocess", "reportedontime": "09:00:00:000"},
        {"ticketId": "TICK-P2", "priority": 2, "customerApprovedHours": 10.0, "documentType": BRD_DOC_TYPE, "ticketStaus": "Inprocess", "reportedontime": "09:00:00:000"},
    ]
    mock_client = MockAMSClient(dummy_tickets=tickets)

    # Monday 10:00 AM (before 6 PM) -> no P1/P2 reminder
    now_10am = datetime(2026, 10, 5, 10, 0, 0)
    res_10am = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now_10am, db_path=temp_db)
    assert res_10am["reminders_sent"] == 0

    # Monday 18:05 (6:05 PM) -> triggers daily 6 PM reminder for both P1 and P2!
    now_6pm = datetime(2026, 10, 5, 18, 5, 0)
    res_6pm = run_sla_monitoring_cycle(ams_client=mock_client, current_time=now_6pm, db_path=temp_db)
    assert res_6pm["reminders_sent"] == 2


def test_12_format_time_remaining():
    """Test 12: Verify timeRemaining formatting for < 60 mins, < 24h, and >= 24h (days + hrs + mins)."""
    assert format_time_remaining(45) == "45 mins"
    assert format_time_remaining(0) == "0 mins"
    assert format_time_remaining(-5) == "0 mins"
    assert format_time_remaining(60) == "1 hrs"
    assert format_time_remaining(1358) == "22 hrs 38 mins"
    assert format_time_remaining(120) == "2 hrs"
    assert format_time_remaining(125) == "2 hrs 5 mins"
    # Days tests (>= 1440 mins / 24h)
    assert format_time_remaining(1440) == "1 day"
    assert format_time_remaining(1500) == "1 day 1 hrs"
    assert format_time_remaining(1515) == "1 day 1 hrs 15 mins"
    assert format_time_remaining(2880) == "2 days"
    assert format_time_remaining(2900) == "2 days 20 mins"
    assert format_time_remaining(2960) == "2 days 1 hrs 20 mins"


def test_13_resolve_latest_step_name():
    """Test 13: Verify resolve_latest_step_name walks steps in reverse to find the latest non-null documentType."""
    steps_payload = {
        "success": True,
        "ticketId": "ATG2610147",
        "steps": [
            {"documentType": None, "ticketStatus": "Created"},
            {"documentType": None, "ticketStatus": "Assigned"},
            {"documentType": "BUD", "ticketStatus": "Inprocess"},
            {"documentType": "FS", "ticketStatus": "Inprocess"},
            {"documentType": "TS", "ticketStatus": "Inprocess"},
            {"documentType": "CONFIG", "ticketStatus": "Inprocess"},
            {"documentType": None, "ticketStatus": "Completed"},
        ]
    }
    assert resolve_latest_step_name(steps_payload, default_step="BUD") == "CONFIG"

    # Edge cases
    assert resolve_latest_step_name({}, default_step="BUD") == "BUD"
    assert resolve_latest_step_name({"steps": []}, default_step="BUD") == "BUD"
    assert resolve_latest_step_name({"steps": [{"documentType": None}]}, default_step="DEFAULT") == "DEFAULT"

