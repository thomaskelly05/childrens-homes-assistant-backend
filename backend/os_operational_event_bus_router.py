from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/os/event-bus", tags=["OS Operational Event Bus"])
compat_router = APIRouter(prefix="/api/os-command", tags=["OS Operational Event Bus Compatibility"])

EVENT_TABLES = {
    "daily_note": "daily_notes",
    "incident": "incidents",
    "missing_episode": "missing_episodes",
    "education": "education_records",
    "health": "health_records",
    "family_contact": "family_contact_records",
    "keywork": "keywork_sessions",
    "risk_assessment": "risk_assessments",
    "support_plan": "support_plans",
}


REQUIRED_EVENT_COLUMNS = {
    "young_person_id",
    "created_at",
}


OPTIONAL_SIGNAL_COLUMNS = {
    "child_voice",
    "young_person_voice",
    "presentation",
    "mood",
    "safeguarding_flag",
    "workflow_status",
    "requires_manager_review",
}



def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'



def _table_exists(cur: Any, table: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=%s)",
        (table,),
    )
    row = cur.fetchone()
    return bool(row[0]) if row else False



def _columns(cur: Any, table: str) -> set[str]:
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s",
        (table,),
    )
    return {str(row[0]) for row in cur.fetchall() or []}



def _count(cur: Any, table: str) -> int:
    cur.execute(f"SELECT COUNT(*) FROM public.{_q(table)}")
    row = cur.fetchone()
    return int(row[0]) if row else 0



def _latest_timestamp_column(cols: set[str]) -> str | None:
    for candidate in [
        "updated_at",
        "created_at",
        "note_date",
        "incident_datetime",
        "start_datetime",
        "event_datetime",
        "record_date",
        "session_date",
    ]:
        if candidate in cols:
            return candidate
    return None


@router.get("/status")
def operational_event_bus_status(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    reports = []
    ready = True

    with conn.cursor() as cur:
        for event_type, table in EVENT_TABLES.items():
            if not _table_exists(cur, table):
                ready = False
                reports.append(
                    {
                        "event_type": event_type,
                        "table": table,
                        "status": "missing_table",
                        "ready": False,
                    }
                )
                continue

            cols = _columns(cur, table)
            missing_required = sorted(REQUIRED_EVENT_COLUMNS.difference(cols))
            signal_columns = sorted(col for col in OPTIONAL_SIGNAL_COLUMNS if col in cols)
            timestamp_column = _latest_timestamp_column(cols)
            total_records = _count(cur, table)

            chronology_connected = False
            evidence_connected = False

            if _table_exists(cur, "os_chronology_events"):
                cur.execute(
                    "SELECT COUNT(*) FROM public.os_chronology_events WHERE source_table = %s",
                    (table,),
                )
                chronology_connected = int(cur.fetchone()[0]) > 0

            if _table_exists(cur, "evidence_links"):
                cur.execute(
                    "SELECT COUNT(*) FROM public.evidence_links WHERE source_table = %s",
                    (table,),
                )
                evidence_connected = int(cur.fetchone()[0]) > 0

            event_ready = (
                len(missing_required) == 0
                and chronology_connected
                and evidence_connected
            )

            if not event_ready:
                ready = False

            reports.append(
                {
                    "event_type": event_type,
                    "table": table,
                    "ready": event_ready,
                    "status": "ready" if event_ready else "needs_attention",
                    "records": total_records,
                    "timestamp_column": timestamp_column,
                    "missing_required_columns": missing_required,
                    "signal_columns": signal_columns,
                    "chronology_connected": chronology_connected,
                    "evidence_connected": evidence_connected,
                }
            )

    return {
        "ok": ready,
        "status": "ready" if ready else "needs_attention",
        "current_user": {
            "id": current_user.get("id") or current_user.get("user_id"),
            "role": current_user.get("role"),
        },
        "event_bus": reports,
        "next_actions": [
            "Ensure all workflows create chronology events.",
            "Ensure all workflows create evidence links.",
            "Ensure therapeutic signal fields are preserved.",
            "Ensure ORB projections consume operational event streams.",
        ],
    }


@compat_router.get("/event-bus-status")
def operational_event_bus_status_alias(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return operational_event_bus_status(current_user=current_user, conn=conn)
