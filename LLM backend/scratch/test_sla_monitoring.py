"""
scratch/test_sla_monitoring.py - Automated Unit & Integration Test Suite for SLA Monitoring Feature.
Runs all 12 mandatory test cases specified in the prompt.
"""

import unittest
from datetime import datetime, timedelta
from typing import Dict, Any, List

from services.sla_monitor_service import (
    calculate_sla_details,
    should_send_reminder,
    calculate_working_day_deadline,
    parse_reported_datetime,
    run_sla_monitoring_cycle,
    SLAReminderStore
)
from ams_api import AMSApi


class MockAMSApi(AMSApi):
    """Mock AMS API client for testing SLA Monitoring cycle behavior."""
    def __init__(self, ticket_list: List[Dict[str, Any]] = None, fail_post: bool = False):
        super().__init__()
        self.mock_tickets = ticket_list or []
        self.fail_post = fail_post
        self.posted_reminders: List[Dict[str, Any]] = []

    def get_ticket_details(self, timeout=60):
        return self.mock_tickets

    def send_ticket_step_reminder(self, payload: dict, timeout=60):
        if self.fail_post:
            raise Exception("500 Internal Server Error (Mock API Failure)")
        self.posted_reminders.append(payload)
        return {"status": "success", "message": "Reminder sent successfully"}


class TestSLAMonitoring(unittest.TestCase):

    def setUp(self):
        SLAReminderStore.clear()

    def tearDown(self):
        SLAReminderStore.clear()

    def test_01_approved_hours_5(self):
        """Test 1: approvedHours = 5 -> SLA = 300 minutes, reminder when <= 30 minutes remaining."""
        ticket = {
            "ticketId": "Dix001",
            "ticketStepstatus": "Pending",
            "approvedHours": 5,
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 1",
            "email": "user1@example.com"
        }
        reported_dt = datetime(2026, 9, 22, 10, 0, 0)
        sla_info = calculate_sla_details(ticket)

        self.assertTrue(sla_info["is_pending"])
        self.assertTrue(sla_info["sla_available"])
        self.assertEqual(sla_info["sla_duration_minutes"], 300.0)
        expected_deadline = reported_dt + timedelta(minutes=300)
        self.assertEqual(sla_info["sla_deadline"], expected_deadline)

        # 14:25 -> 35 min remaining -> DO NOT SEND
        curr_1425 = reported_dt + timedelta(minutes=265)
        send, reason, rem = should_send_reminder(300.0, expected_deadline, curr_1425, False)
        self.assertFalse(send, f"Should not send at 35 min remaining (reason: {reason})")

        # 14:30 -> 30 min remaining -> SEND ONCE
        curr_1430 = reported_dt + timedelta(minutes=270)
        send, reason, rem = should_send_reminder(300.0, expected_deadline, curr_1430, False)
        self.assertTrue(send, f"Should send at 30 min remaining (reason: {reason})")

    def test_02_approved_hours_half_hour(self):
        """Test 2: approvedHours = 0.5 -> SLA = 30 minutes -> Immediate reminder when Pending ticket is fetched."""
        ticket = {
            "ticketId": "Dix002",
            "ticketStepstatus": "Pending",
            "approvedHours": 0.5,
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 2",
            "email": "user2@example.com"
        }
        sla_info = calculate_sla_details(ticket)
        self.assertEqual(sla_info["sla_duration_minutes"], 30.0)

        # Immediate reminder check at fetch time (10:00:00)
        fetch_time = datetime(2026, 9, 22, 10, 0, 0)
        send, reason, rem = should_send_reminder(30.0, sla_info["sla_deadline"], fetch_time, False)
        self.assertTrue(send, "Should send immediately for 30 min SLA")

    def test_03_approved_hours_quarter_hour(self):
        """Test 3: approvedHours = 0.25 -> SLA = 15 minutes -> Immediate reminder."""
        ticket = {
            "ticketId": "Dix003",
            "ticketStepstatus": "Pending",
            "approvedHours": 0.25,
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 3",
            "email": "user3@example.com"
        }
        sla_info = calculate_sla_details(ticket)
        self.assertEqual(sla_info["sla_duration_minutes"], 15.0)

        fetch_time = datetime(2026, 9, 22, 10, 0, 0)
        send, reason, rem = should_send_reminder(15.0, sla_info["sla_deadline"], fetch_time, False)
        self.assertTrue(send, "Should send immediately for 15 min SLA")

    def test_04_approved_hours_decimal_point_23(self):
        """Test 4: approvedHours = 0.23 -> SLA = 13.8 minutes -> Immediate reminder."""
        ticket = {
            "ticketId": "Dix004",
            "ticketStepstatus": "Pending",
            "approvedHours": 0.23,
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 4",
            "email": "user4@example.com"
        }
        sla_info = calculate_sla_details(ticket)
        self.assertAlmostEqual(sla_info["sla_duration_minutes"], 13.8, places=1)

        fetch_time = datetime(2026, 9, 22, 10, 0, 0)
        send, reason, rem = should_send_reminder(13.8, sla_info["sla_deadline"], fetch_time, False)
        self.assertTrue(send, "Should send immediately for 13.8 min SLA")

    def test_05_approved_hours_1_remaining_45(self):
        """Test 5: approvedHours = 1, remaining = 45 minutes -> Expected: No reminder."""
        reported_dt = datetime(2026, 9, 22, 10, 0, 0)
        deadline = reported_dt + timedelta(hours=1)
        curr_time = reported_dt + timedelta(minutes=15)  # 45 min remaining

        send, reason, rem = should_send_reminder(60.0, deadline, curr_time, False)
        self.assertFalse(send, "Should NOT send when 45 minutes remaining")
        self.assertAlmostEqual(rem, 45.0, places=1)

    def test_06_approved_hours_1_remaining_30(self):
        """Test 6: approvedHours = 1, remaining = 30 minutes -> Expected: Send exactly once."""
        reported_dt = datetime(2026, 9, 22, 10, 0, 0)
        deadline = reported_dt + timedelta(hours=1)
        curr_time = reported_dt + timedelta(minutes=30)  # 30 min remaining

        send, reason, rem = should_send_reminder(60.0, deadline, curr_time, False)
        self.assertTrue(send, "Should send when 30 minutes remaining")
        self.assertAlmostEqual(rem, 30.0, places=1)

    def test_07_approved_hours_1_remaining_20_already_sent(self):
        """Test 7: approvedHours = 1, remaining = 20 minutes, reminder already sent = true -> Expected: No reminder."""
        reported_dt = datetime(2026, 9, 22, 10, 0, 0)
        deadline = reported_dt + timedelta(hours=1)
        curr_time = reported_dt + timedelta(minutes=40)  # 20 min remaining

        send, reason, rem = should_send_reminder(60.0, deadline, curr_time, True)
        self.assertFalse(send, "Should NOT send if reminder already sent")

    def test_08_post_fails_retry_on_next_execution(self):
        """Test 8: approvedHours = 1, remaining = 30 minutes, POST fails -> Expected: Do not mark as sent, retry on next execution."""
        ticket = {
            "ticketId": "Dix008",
            "ticketStepstatus": "Pending",
            "approvedHours": 1,
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 8",
            "email": "user8@example.com"
        }
        mock_client = MockAMSApi(ticket_list=[ticket], fail_post=True)
        current_time = datetime(2026, 9, 22, 10, 30, 0)  # Exactly 30 min remaining

        # 1st execution (POST fails)
        res1 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=current_time)
        self.assertEqual(res1["reminders_sent"], 0)
        self.assertEqual(res1["reminders_failed"], 1)

        # Storage should NOT have marked as sent
        key = SLAReminderStore.make_key("Dix008", "Pending Step", datetime(2026, 9, 22, 11, 0, 0))
        self.assertFalse(SLAReminderStore.is_sent(key), "Storage MUST NOT mark sent on POST failure")

        # 2nd execution (POST succeeds)
        mock_client.fail_post = False
        res2 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=current_time)
        self.assertEqual(res2["reminders_sent"], 1)
        self.assertEqual(res2["reminders_failed"], 0)
        self.assertTrue(SLAReminderStore.is_sent(key), "Storage MUST mark sent after POST success")

    def test_09_ticket_step_status_completed(self):
        """Test 9: ticketStepstatus = Completed -> Expected: Ignore ticket."""
        ticket = {
            "ticketId": "Dix009",
            "ticketStepstatus": "Completed",
            "approvedHours": 5,
            "name": "User 9"
        }
        sla_info = calculate_sla_details(ticket)
        self.assertFalse(sla_info["is_pending"])
        self.assertFalse(sla_info["sla_available"])

    def test_10_missing_sla_information(self):
        """Test 10: approvedHours = null, workingDays = null -> Expected: Skip ticket and log 'SLA information unavailable'."""
        ticket = {
            "ticketId": "Dix010",
            "ticketStepstatus": "Pending",
            "approvedHours": None,
            "workingDays": None,
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 10"
        }
        sla_info = calculate_sla_details(ticket)
        self.assertTrue(sla_info["is_pending"])
        self.assertFalse(sla_info["sla_available"])
        self.assertIn("SLA information unavailable", sla_info["reason"])

        mock_client = MockAMSApi(ticket_list=[ticket])
        res = run_sla_monitoring_cycle(ams_client=mock_client)
        self.assertEqual(res["no_sla_info_count"], 1)
        self.assertEqual(res["reminders_sent"], 0)

    def test_11_working_days_calculation(self):
        """Test 11: workingDays provided -> Verify deadline respects business-day/weekend rules."""
        # Reported Friday 2026-09-25 at 10:00:00 AM, workingDays = 2
        # Friday 10:00 + 2 working days -> Monday 10:00 (Day 1), Tuesday 10:00 (Day 2) -> Deadline Tuesday 2026-09-29 10:00:00
        reported_dt = datetime(2026, 9, 25, 10, 0, 0)
        deadline = calculate_working_day_deadline(reported_dt, 2)
        expected_deadline = datetime(2026, 9, 29, 10, 0, 0)
        self.assertEqual(deadline, expected_deadline, "Friday + 2 working days must skip Saturday & Sunday to land on Tuesday")

        ticket = {
            "ticketId": "Dix011",
            "ticketStepstatus": "Pending",
            "approvedHours": None,
            "workingDays": 2,
            "reportedon": "2026-09-25",
            "reportedontime": "10:00:00",
            "name": "User 11"
        }
        sla_info = calculate_sla_details(ticket)
        self.assertTrue(sla_info["sla_available"])
        self.assertEqual(sla_info["priority_source"], "workingDays")
        self.assertEqual(sla_info["sla_deadline"], expected_deadline)

    def test_12_multiple_scheduler_runs_deduplication(self):
        """Test 12: Run scheduler multiple times for the same ticket -> Expected: Only ONE successful reminder POST."""
        ticket = {
            "ticketId": "Dix012",
            "ticketStepstatus": "Pending",
            "approvedHours": 0.5,  # 30 min SLA -> Immediate reminder
            "reportedon": "2026-09-22",
            "reportedontime": "10:00:00",
            "name": "User 12",
            "email": "user12@example.com"
        }
        mock_client = MockAMSApi(ticket_list=[ticket])
        current_time = datetime(2026, 9, 22, 10, 0, 0)

        # Run 1
        res1 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=current_time)
        self.assertEqual(res1["reminders_sent"], 1)

        # Run 2
        res2 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=current_time + timedelta(minutes=1))
        self.assertEqual(res2["reminders_sent"], 0)
        self.assertEqual(res2["already_sent_count"], 1)

        # Run 3
        res3 = run_sla_monitoring_cycle(ams_client=mock_client, current_time=current_time + timedelta(minutes=2))
        self.assertEqual(res3["reminders_sent"], 0)
        self.assertEqual(res3["already_sent_count"], 1)

        # Total HTTP POST calls must be exactly 1
        self.assertEqual(len(mock_client.posted_reminders), 1, "Only ONE POST request must be executed across multiple scheduler runs")


if __name__ == "__main__":
    unittest.main()
