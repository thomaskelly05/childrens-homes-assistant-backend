from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/os/validation", tags=["OS Live Validation"])
compat_router = APIRouter(prefix="/api/os-command", tags=["OS Live Validation Compatibility"])

CORE_TABLES = [
    "young_people",
    "daily_notes",
    "incidents",
    "missing_episodes",
    "risk_assessments",
    "support_plans",
    "health_records",
    "education_records",
    "family_contact_records",
    "keywork_sessions",
    "os_chronology_events",
    "evidence_links",
    "os_evidence_links",
    "operational_projection_snapshots",
]

CORE_VIEWS = [
    "vw_os_young_person_profile",
    "vw_os_chronology_pullthrough",
]

REQUIRED_COLUMNS = {
    "young_people": ["id", "first_name", "last_name", "display_name", "age", "home_id", "provider_id"],
    "daily_notes": ["id", "young_person_id", "note_date", "mood", "presentation", "young_person_voice", "workflow_status"],
    "incidents": ["id", "young_person_id", "incident_type", "incident_datetime", "description", "safeguarding_flag", "child_voice"],
    "missing_episodes": ["id", "young_person_id", "start_datetime", "police_reference", "trigger_factors", "child_voice"],
    "os_chronology_events": ["id", "source_table", "source_id", "title", "summary", "event_at", "young_person_id"],
    "evidence_links": ["id", "source_table", "source_id", "evidence_type", "young_person_id"],
}


def _table_exists(cur: Any, name: str) -> bool:
    cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=%s)", (name,))
    return bool(cur.fetchone()[0])


def _view_exists(cur: Any, name: str) -> bool:
    cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name=%s)", (name,))
    return bool(cur.fetchone()[0])


def _columns(cur: Any, table: str) -> set[str]:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s", (table,))
    return {str(row[0]) for row in cur.fetchall() or []}


def _count(cur: Any, table: str) -> int | None:
    if not _table_exists(cur, table):
        return None
    cur.execute(f'SELECT COUNT(*) FROM public."{table}"')
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _safe_view_count(cur: Any, view: str) -> int | None:
    if not _view_exists(cur, view):
        return None
    cur.execute(f'SELECT COUNT(*) FROM public."{view}"')
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _build_live_validation(current_user: dict[str, Any], conn: Any) -> dict[str, Any]:
    with conn.cursor() as cur:
        table_report = []
        missing_tables = []
        missing_columns: dict[str, list[str]] = {}
        for table in CORE_TABLES:
            exists = _table_exists(cur, table)
            if not exists:
                missing_tables.append(table)
                table_report.append({"table": table, "exists": False, "count": None, "missing_columns": REQUIRED_COLUMNS.get(table, [])})
                continue
            cols = _columns(cur, table)
            required = REQUIRED_COLUMNS.get(table, [])
            missing = [column for column in required if column not in cols]
            if missing:
                missing_columns[table] = missing
            table_report.append({"table": table, "exists": True, "count": _count(cur, table), "missing_columns": missing})

        view_report = []
        missing_views = []
        for view in CORE_VIEWS:
            exists = _view_exists(cur, view)
            if not exists:
                missing_views.append(view)
            view_report.append({"view": view, "exists": exists, "count": _safe_view_count(cur, view) if exists else None})

    protected_route_status = "authenticated" if current_user else "unknown"
    critical_failures = missing_tables + missing_views + [f"{table}.{','.join(cols)}" for table, cols in missing_columns.items()]
    return {
        "ok": len(critical_failures) == 0,
        "status": "ready" if len(critical_failures) == 0 else "needs_attention",
        "current_user": {
            "id": current_user.get("id") or current_user.get("user_id"),
            "role": current_user.get("role"),
            "home_id": current_user.get("home_id"),
            "provider_id": current_user.get("provider_id"),
        },
        "protected_route_status": protected_route_status,
        "tables": table_report,
        "views": view_report,
        "critical_failures": critical_failures,
        "next_checks": [
            "Create or open a young person record.",
            "Create a daily note and confirm os_chronology_events count increases.",
            "Confirm evidence_links contains the saved record.",
            "Ask ORB a care-scoped question and confirm care_retrieval=true.",
        ],
    }


@router.get("/live")
def live_os_validation(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_live_validation(current_user=current_user, conn=conn)


@compat_router.get("/live-validation")
def live_os_validation_command_alias(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_live_validation(current_user=current_user, conn=conn)
