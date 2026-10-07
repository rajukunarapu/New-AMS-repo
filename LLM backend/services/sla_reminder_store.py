"""
services/sla_reminder_store.py - Database and In-Memory Store for SLA Monitoring Service.
Tracks last-sent timestamps per ticket to avoid duplicate reminders within configured intervals.
Supports transitioning between SQLite store and server-friendly storage solutions.
"""

import os
import sys
import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger("SLA_Store")


def get_default_db_path() -> str:
    """Returns platform-specific default DB path outside code directory."""
    if sys.platform == "win32" or os.name == "nt":
        return r"C:\ProgramData\AMS\sla_tracker.db"
    return "/var/lib/ams/sla_tracker.db"


def resolve_db_path(db_path: Optional[str] = None) -> str:
    """Resolves DB path from parameter, SLA_DB_PATH env var, or system default."""
    path = db_path or os.getenv("SLA_DB_PATH") or get_default_db_path()
    parent = os.path.dirname(os.path.abspath(path))
    if parent and not os.path.exists(parent):
        try:
            os.makedirs(parent, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create database directory '{parent}': {e}")
    return path


@contextmanager
def get_db_transaction(db_path: str):
    """
    Context manager providing an exclusive transaction (BEGIN IMMEDIATE) with WAL mode.
    Ensures safe multi-process/multi-thread concurrency and flushes WAL log on commit.
    """
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("BEGIN IMMEDIATE;")
        yield conn
        conn.commit()
        try:
            conn.execute("PRAGMA wal_checkpoint(PASSIVE);")
        except Exception:
            pass
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return dict(row)


class SLATracker:
    """
    SQLite persistent store for SLA Ticket Reminder tracking.
    Tracks last_sent_at and locked original_fs_start_time per ticketId.
    Only active 'Inprocess' tickets are maintained; closed/completed tickets are hard-deleted.
    """

    @classmethod
    def init(cls, db_path: Optional[str] = None):
        """Initializes SQLite database schema and indexes, handling non-destructive auto-migration."""
        target_path = resolve_db_path(db_path)
        logger.info(f"Initializing SLA Tracker database at: {target_path}")

        with get_db_transaction(target_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sla_tracker (
                    ticket_id TEXT PRIMARY KEY,
                    priority INTEGER,
                    customer_approved_hours REAL,
                    fs_start_time TEXT,
                    original_fs_start_time TEXT,
                    sla_deadline TEXT,
                    last_sent_at TEXT,
                    sla_status TEXT NOT NULL DEFAULT 'PENDING',
                    overrun_seconds REAL DEFAULT 0,
                    consultant_name TEXT,
                    consultant_email TEXT,
                    updated_at TEXT
                );
                """
            )

            # Safe additive schema migration (never DROP TABLE)
            cursor = conn.execute("PRAGMA table_info(sla_tracker)")
            cols = {row[1] for row in cursor.fetchall()}

            migrations = {
                "original_fs_start_time": "ALTER TABLE sla_tracker ADD COLUMN original_fs_start_time TEXT;",
                "sla_status": "ALTER TABLE sla_tracker ADD COLUMN sla_status TEXT NOT NULL DEFAULT 'PENDING';",
                "overrun_seconds": "ALTER TABLE sla_tracker ADD COLUMN overrun_seconds REAL DEFAULT 0;",
            }

            for col_name, stmt in migrations.items():
                if col_name not in cols:
                    try:
                        conn.execute(stmt)
                        logger.info(f"Migrated SLA Tracker schema: Added column '{col_name}'.")
                    except Exception as e:
                        logger.warning(f"Failed to add column '{col_name}': {e}")

            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_sla_status ON sla_tracker (sla_status);"
            )

    @classmethod
    def get_row(cls, ticket_id: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Fetches tracked record by ticket_id."""
        target_path = resolve_db_path(db_path)
        t_id_lower = str(ticket_id).strip().lower()

        conn = sqlite3.connect(target_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            cursor = conn.execute(
                "SELECT * FROM sla_tracker WHERE LOWER(ticket_id) = ?",
                (t_id_lower,),
            )
            return row_to_dict(cursor.fetchone())
        finally:
            conn.close()

    @classmethod
    def update_ticket_state(
        cls,
        ticket_id: str,
        priority: int,
        approved_hours: Optional[float],
        fs_start_time: Optional[datetime],
        sla_deadline: Optional[datetime],
        sla_status: str,
        overrun_seconds: float,
        consultant_name: str,
        consultant_email: str,
        original_fs_start_time: Optional[datetime] = None,
        now: Optional[datetime] = None,
        db_path: Optional[str] = None,
    ):
        """Upserts active ticket state into store."""
        target_path = resolve_db_path(db_path)
        now_dt = now or datetime.now()
        now_str = now_dt.isoformat()
        t_id_clean = str(ticket_id).strip()
        t_id_lower = t_id_clean.lower()

        fs_str = fs_start_time.isoformat() if fs_start_time else None
        orig_fs_str = original_fs_start_time.isoformat() if original_fs_start_time else fs_str
        dl_str = sla_deadline.isoformat() if sla_deadline else None

        with get_db_transaction(target_path) as conn:
            cursor = conn.execute(
                "SELECT ticket_id, original_fs_start_time FROM sla_tracker WHERE LOWER(ticket_id) = ?",
                (t_id_lower,),
            )
            row = cursor.fetchone()

            if row is None:
                conn.execute(
                    """
                    INSERT INTO sla_tracker (
                        ticket_id, priority, customer_approved_hours, fs_start_time, original_fs_start_time,
                        sla_deadline, last_sent_at, sla_status, overrun_seconds, consultant_name,
                        consultant_email, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
                    """,
                    (
                        t_id_clean,
                        priority,
                        approved_hours,
                        fs_str,
                        orig_fs_str,
                        dl_str,
                        sla_status,
                        overrun_seconds,
                        consultant_name,
                        consultant_email,
                        now_str,
                    ),
                )
            else:
                conn.execute(
                    """
                    UPDATE sla_tracker SET
                        priority = ?, customer_approved_hours = ?, fs_start_time = ?, sla_deadline = ?,
                        sla_status = ?, overrun_seconds = ?, consultant_name = ?,
                        consultant_email = ?, updated_at = ?
                    WHERE LOWER(ticket_id) = ?
                    """,
                    (
                        priority,
                        approved_hours,
                        fs_str,
                        dl_str,
                        sla_status,
                        overrun_seconds,
                        consultant_name,
                        consultant_email,
                        now_str,
                        t_id_lower,
                    ),
                )

    @classmethod
    def delete_ticket(cls, ticket_id: str, db_path: Optional[str] = None):
        """Hard deletes a closed or non-active ticket record from tracker store."""
        target_path = resolve_db_path(db_path)
        t_id_lower = str(ticket_id).strip().lower()

        with get_db_transaction(target_path) as conn:
            conn.execute(
                "DELETE FROM sla_tracker WHERE LOWER(ticket_id) = ?",
                (t_id_lower,),
            )
        logger.info(f"Ticket '{ticket_id}' deleted from SLA tracker store.")

    @classmethod
    def record_reminder_sent(
        cls,
        ticket_id: str,
        sent_at: datetime,
        sla_status: str,
        overrun_seconds: float = 0.0,
        db_path: Optional[str] = None,
    ):
        """Updates last_sent_at timestamp when a reminder is posted successfully."""
        target_path = resolve_db_path(db_path)
        t_id_lower = str(ticket_id).strip().lower()
        sent_str = sent_at.isoformat()

        with get_db_transaction(target_path) as conn:
            conn.execute(
                """
                UPDATE sla_tracker SET
                    last_sent_at = ?, sla_status = ?, overrun_seconds = ?, updated_at = ?
                WHERE LOWER(ticket_id) = ?
                """,
                (sent_str, sla_status, overrun_seconds, sent_str, t_id_lower),
            )

    @classmethod
    def mark_completed(cls, ticket_id: str, db_path: Optional[str] = None):
        """Wrapper calling delete_ticket to hard-delete closed tickets."""
        cls.delete_ticket(ticket_id, db_path)

    @classmethod
    def get_all(cls, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetches all tracked SLA rows."""
        target_path = resolve_db_path(db_path)
        conn = sqlite3.connect(target_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            cursor = conn.execute("SELECT * FROM sla_tracker ORDER BY updated_at DESC")
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    @classmethod
    def clear(cls, db_path: Optional[str] = None):
        """Clears all records from table."""
        target_path = resolve_db_path(db_path)
        if os.path.exists(target_path):
            with get_db_transaction(target_path) as conn:
                conn.execute("DELETE FROM sla_tracker")
