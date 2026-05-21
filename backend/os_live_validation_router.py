from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

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

PROOF_WORKFLOWS = {
    "daily_note": {
        "table": "daily_notes",
        "date_columns": ["note_date", "created_at", "updated_at"],
        "summary_columns": ["presentation", "mood", "activities", "young_person_voice", "actions_required"],
    },
    "incident": {
        "table": "incidents",
        "date_columns": ["incident_datetime", "created_at", "updated_at"],
        "summary_columns": ["incident_type", "description", "presentation", "child_voice", "actions_taken"],
    },
    "missing_episode": {
        "table": "missing_episodes",
        "date_columns": ["start_datetime", "reported_datetime", "return_datetime", "created_at"],
        "summary_columns": ["police_reference", "trigger_factors", "push_pull_factors", "child_voice", "outcome"],
    },
    "education": {
        "table": "education_records",
        "date_columns": ["record_date", "created_at", "updated_at"],
        "summary_columns": ["attendance_status", "provision_name", "learning_engagement", "child_voice", "support_action"],
    },
    "health": {
        "table": "health_records",
        "date_columns": ["event_datetime", "created_at", "updated_at"],
        "summary_columns": ["record_type", "title", "summary", "child_voice", "outcome"],
    },
    "family_contact": {
        "table": "family_contact_records",
        "date_columns": ["contact_datetime", "created_at", "updated_at"],
        "summary_columns": ["contact_type", "contact_person", "post_contact_presentation", "child_voice"],
    },
    "keywork": {
        "table": "keywork_sessions",
        "date_columns": ["session_date", "created_at", "updated_at"],
        "summary_columns": ["topic", "purpose", "summary", "child_voice", "reflective_analysis"],
    },
}


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


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
    cur.execute(f'SELECT COUNT(*) FROM public.{_q(table)}')
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _safe_view_count(cur: Any, view: str) -> int | None:
    if not _view_exists(cur, view):
        return None
    cur.execute(f'SELECT COUNT(*) FROM public.{_q(view)}')
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _existing_column(cols: set[str], candidates: list[str]) -> str | None:
    for column in candidates:
        if column in cols:
            return column
    return None


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


def _latest_record(cur: Any, table: str, young_person_id: int | None = None) -> dict[str, Any] | None:
    if not _table_exists(cur, table):
        return None
    cols = _columns(cur, table)
    where = ""
    params: list[Any] = []
    if young_person_id is not None and "young_person_id" in cols:
        where = "WHERE young_person_id = %s"
        params.append(young_person_id)
    date_column = _existing_column(cols, ["updated_at", "created_at", "note_date", "incident_datetime", "start_datetime", "record_date", "event_datetime", "contact_datetime", "session_date"])
    order = f"ORDER BY {_q(date_column)} DESC NULLS LAST" if date_column else "ORDER BY id DESC"
    cur.execute(f"SELECT * FROM public.{_q(table)} {where} {order} LIMIT 1", tuple(params))
    row = cur.fetchone()
    if not row:
        return None
    keys = [desc[0] for desc in cur.description]
    return dict(zip(keys, row))


def _link_count(cur: Any, table: str, record_id: Any, link_table: str) -> int | None:
    if not _table_exists(cur, link_table):
        return None
    cols = _columns(cur, link_table)
    if not {"source_table", "source_id"}.issubset(cols):
        return None
    cur.execute(
        f"SELECT COUNT(*) FROM public.{_q(link_table)} WHERE source_table = %s AND source_id = %s",
        (table, str(record_id)),
    )
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _chronology_count(cur: Any, table: str, record_id: Any) -> int | None:
    return _link_count(cur, table, record_id, "os_chronology_events")


def _workflow_count(cur: Any, table: str, record_id: Any) -> int | None:
    if not _table_exists(cur, "record_workflow_events"):
        return None
    cols = _columns(cur, "record_workflow_events")
    if "source_table" in cols and "source_id" in cols:
        cur.execute(
            "SELECT COUNT(*) FROM public.record_workflow_events WHERE source_table = %s AND source_id = %s",
            (table, str(record_id)),
        )
    elif "record_id" in cols:
        cur.execute("SELECT COUNT(*) FROM public.record_workflow_events WHERE record_id = %s", (str(record_id),))
    else:
        return None
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _build_workflow_proof(current_user: dict[str, Any], conn: Any, young_person_id: int | None = None) -> dict[str, Any]:
    proofs = []
    with conn.cursor() as cur:
        for workflow, config in PROOF_WORKFLOWS.items():
            table = config["table"]
            if not _table_exists(cur, table):
                proofs.append({"workflow": workflow, "table": table, "status": "missing_table", "ready": False})
                continue
            record = _latest_record(cur, table, young_person_id=young_person_id)
            if not record:
                proofs.append({"workflow": workflow, "table": table, "status": "no_records_yet", "ready": False})
                continue
            record_id = record.get("id")
            chronology_links = _chronology_count(cur, table, record_id)
            evidence_links = _link_count(cur, table, record_id, "evidence_links")
            os_evidence_links = _link_count(cur, table, record_id, "os_evidence_links")
            workflow_events = _workflow_count(cur, table, record_id)
            cols = set(record.keys())
            summary_fields_present = [column for column in config["summary_columns"] if column in cols and record.get(column) not in (None, "")]
            status = "ready" if (chronology_links or 0) > 0 and ((evidence_links or 0) > 0 or (os_evidence_links or 0) > 0) else "needs_linking"
            proofs.append(
                {
                    "workflow": workflow,
                    "table": table,
                    "record_id": str(record_id),
                    "young_person_id": record.get("young_person_id"),
                    "status": status,
                    "ready": status == "ready",
                    "chronology_links": chronology_links,
                    "evidence_links": evidence_links,
                    "os_evidence_links": os_evidence_links,
                    "workflow_events": workflow_events,
                    "therapeutic_fields_present": summary_fields_present,
                    "workflow_status": record.get("workflow_status") or record.get("status"),
                }
            )
    ready_count = sum(1 for item in proofs if item.get("ready"))
    return {
        "ok": ready_count == len([item for item in proofs if item.get("status") != "missing_table"]),
        "status": "ready" if ready_count and all(item.get("ready") or item.get("status") in {"missing_table", "no_records_yet"} for item in proofs) else "needs_attention",
        "current_user": {
            "id": current_user.get("id") or current_user.get("user_id"),
            "role": current_user.get("role"),
            "home_id": current_user.get("home_id"),
            "provider_id": current_user.get("provider_id"),
        },
        "young_person_id": young_person_id,
        "proofs": proofs,
        "next_actions": [
            "If a workflow shows no_records_yet, create one real record through the UI.",
            "If a workflow shows needs_linking, run or fix the pull-through process for chronology/evidence.",
            "If chronology_links and evidence_links are present, ORB and reports have a usable evidence trail.",
        ],
    }


@router.get("/live")
def live_os_validation(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_live_validation(current_user=current_user, conn=conn)


@compat_router.get("/live-validation")
def live_os_validation_command_alias(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_live_validation(current_user=current_user, conn=conn)


@router.get("/workflow-proof")
def workflow_proof(
    young_person_id: int | None = Query(default=None),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return _build_workflow_proof(current_user=current_user, conn=conn, young_person_id=young_person_id)


@compat_router.get("/workflow-proof")
def workflow_proof_command_alias(
    young_person_id: int | None = Query(default=None),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return _build_workflow_proof(current_user=current_user, conn=conn, young_person_id=young_person_id)
