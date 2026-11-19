# SLA Monitoring Service Documentation

The SLA Monitoring Service is a background engine for tracking ticket SLA deadlines, priority-based reminder intervals, SLA breach overrun tracking, and automated reminder notifications.

---

## 1. Quick Start & Execution

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure credentials in `.env`:
   ```ini
   SLA_EMAIL=your_sla_email@neovatic.com
   SLA_PASSWORD=your_secure_password
   ```

### Running the Standalone Service

Run the background service loop using:
```bash
python run_scheduler.py
```

### Running Automated Tests

Run the pytest suite:
```bash
python -m pytest tests/test_sla_monitoring.py
```

---

## 2. Swapping Between Dummy Client and Real Production API

The service features a **layer-decoupled data source architecture**:

- **Dummy Client (`DummyAMSClient`)**: Active by default (`USE_DUMMY_SLA_CLIENT=true` in `.env`). Returns sample data matching the exact shape returned by `GET /api/Ticket/GetTicketDetails`.
- **Production API (`AMSApi`)**: To connect to the live AMS API:
  1. Set `USE_DUMMY_SLA_CLIENT=false` in `.env`.
  2. Provide live endpoints and credentials in `.env`:
     ```ini
     TICKET_DETAILS_API_URL=http://172.16.32.50/api/Ticket/GetTicketDetails
     TICKET_STEP_REMINDER_API_URL=http://172.16.32.50/api/Ticket/SendTicketStepReminder
     SLA_EMAIL=actual_user@neovatic.com
     SLA_PASSWORD=actual_password
     ```
  3. No code changes are required in `sla_monitor_service.py` or `sla_scheduler.py`.

---

## 3. SLA Business Logic & Rules

### A. Field Mapping & Grouping
- Raw API fields (including `ticketStaus` and `assigintoindividual`) are mapped in `map_api_row_to_internal()` in `services/sla_monitor_service.py`.
- API responses containing multiple rows per ticket (one per document type / step) are grouped by `ticketId`.

### B. Status Gating & Lifecycle Management
- **Inprocess Only**: Only tickets with `ticketStaus == "Inprocess"` are saved into SQLite and monitored. Non-inprocess statuses (e.g. `Pending`, `On Hold`) are ignored.
- **Hard Delete on Close**: Tickets with status matching `CLOSED_TICKET_STATUSES` (`Closed`, `Completed`, `Resolved`) are hard-deleted from the SQLite database via `SLATracker.delete_ticket()`, keeping the tracker database lean.

### C. SLA Start, Timestamp Anchoring & Approved Hours
- **SLA Start Clock**: Starts at the **FS step** (`FS_DOC_TYPE`, default `"FS"`).
- **Original Timestamp Anchoring**: On first discovery, `reportedontime` (time-only string `HH:mm:ss:fff`) is combined with `now.date()` and permanently locked into SQLite (`original_fs_start_time`). Subsequent monitoring cycles reuse this locked datetime, preventing SLA deadline drift across daily rollovers.
- **Approved Hours**: Read **strictly** from the **BRD step** (`BRD_DOC_TYPE`, default `"BUD"`). If the BRD row has no approved hours, the ticket is skipped with a warning log.

### D. Priority Intervals & Short-SLA Throttling
- **Priority Mappings & Intervals**:
  - `4 (Very High)`: Every 1 hour (9 AM – 7 PM window, Mon–Fri)
  - `3 (High)`: Every 4 hours (9 AM – 7 PM window, Mon–Fri)
  - `2 (Medium)`: Daily at 6:00 PM (18:00) on working days
  - `1 (Low)`: Daily at 6:00 PM (18:00) on working days
- **Overnight & Weekend Blackout**: Reminders strictly fire between 9:00 AM and 7:00 PM on business days (Mon–Fri). No reminders fire on weekends or overnight.
- **Short-SLA Throttle**: If `customerApprovedHours <= 1.0`, reminders enforce a 15-minute minimum throttle interval (`SHORT_SLA_REMINDER_INTERVAL_MINUTES=15`) to avoid inbox flooding.

### E. Breach Handling & Overrun Tracking
- If current time > SLA deadline:
  - Ticket is marked `SLA_BREACHED`.
  - Overrun duration (`current_time - deadline`) is recorded and continuously updated until closed.
  - Breach status and overrun duration (e.g. `"Overdue by 120 Mins"`) are included in outgoing reminder payloads.

---

## 4. Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SLA_EMAIL` | Authentication email for SLA Service | Required (Set in `.env`) |
| `SLA_PASSWORD` | Authentication password for SLA Service | Required (Set in `.env`) |
| `SLA_BASE_URL` | Base URL of AMS API Server | `http://172.16.32.50` |
| `GET_TICKET_DETAILS_ENDPOINT` | API endpoint for fetching ticket list | `/api/Ticket/GetTicketDetails` |
| `SEND_TICKET_REMINDER_ENDPOINT` | API endpoint for posting reminder payloads | `/api/Ticket/SendTicketStepReminder` |
| `BRD_DOC_TYPE` | Document type string for BRD step | `BUD` |
| `FS_DOC_TYPE` | Document type string for FS step | `FS` |
| `CLOSED_TICKET_STATUSES` | Comma-separated list of closed statuses | `closed,completed,resolved` |
| `USE_DUMMY_SLA_CLIENT` | Toggle dummy client (`true`/`false`) | `true` |
| `SLA_DB_PATH` | Path to SQLite tracker store | `data/sla_tracker.db` |
