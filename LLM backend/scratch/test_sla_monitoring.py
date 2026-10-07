"""
scratch/test_sla_monitoring.py - Pytest & Unittest Compatibility Runner for SLA Monitoring.
"""

from tests.test_sla_monitoring import (
    test_01_new_pending_step_inserts_row_and_deadline,
    test_02_pre_reminder_fires_once_and_concurrent_claims,
    test_03_disappearing_step_marked_completed,
    test_04_deadline_mail_fires_only_if_completed_zero,
    test_05_missed_pre_reminder_becomes_skipped,
    test_06_grace_window_skips_old_deadlines,
    test_07_failed_post_leaves_status_not_done_and_retries,
    test_08_changed_deadline_resets_both_stages,
    test_09_failed_ticket_fetch_changes_nothing,
)
