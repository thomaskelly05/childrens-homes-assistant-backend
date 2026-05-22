from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.current_user import get_current_user
from db.connection import get_db
from repositories.os_repository_utils import row_bool, row_column_name, row_dict, row_scalar

logger = logging.getLogger(__name__)

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

PERFORMANCE_INDEXES = [
    "idx_young_people_home_status",
    "idx_young_people_provider_home",
    "idx_os_chronology_young_person_event_at",
    "idx_os_chronology_home_event_at",
    "idx_os_chronology_source_lookup",
    "idx_evidence_links_young_person",
    "idx_evidence_links_source_lookup",
    "idx_os_evidence_links_young_person",
    "idx_os_evidence_links_source_lookup",
    "idx_daily_notes_young_person_recent",
    "idx_daily_notes_home_recent",
    "idx_incidents_young_person_recent",
    "idx_incidents_home_recent",
    "idx_missing_episodes_young_person_recent",
    "idx_missing_episodes_home_recent",
    "idx_education_records_young_person_recent",
    "idx_health_records_young_person_recent",
    "idx_family_contact_records_young_person_recent",
    "idx_keywork_sessions_young_person_recent",
    "idx_operational_projection_subject",
]

SLOW_ENDPOINT_MS = 400
CARE_HUB_TARGET_MS = 300

REQUIRED_COLUMNS = {
    "young_people": ["id", "first_name", "last_name", "display_name", "age", "home_id", "provider_id"],
    "daily_notes": ["id", "young_person_id", "note_date", "mood", "presentation", "young_person_voice", "workflow_status"],
    "incidents": ["id", "young_person_id", "incident_type", "incident_datetime", "description", "safeguarding_flag", "child_voice"],
    "missing_episodes": ["id", "young_person_id", "start_datetime", "police_reference", "trigger_factors", "child_voice"],
    "os_chronology_events": ["id", "source_table", "source_id", "title", "summary", "event_at", "young_person_id"],
    "evidence_links": ["id", "source_table", "source_id", "evidence_type", "young_person_id"],
}

PROOF_WORKFLOWS = {
    "daily_note": {"table": "daily_notes", "date_columns": ["note_date", "created_at", "updated_at"], "summary_columns": ["presentation", "mood", "activities", "young_person_voice", "actions_required"]},
    "incident": {"table": "incidents", "date_columns": ["incident_datetime", "created_at", "updated_at"], "summary_columns": ["incident_type", "description", "presentation", "child_voice", "actions_taken"]},
    "missing_episode": {"table": "missing_episodes", "date_columns": ["start_datetime", "reported_datetime", "return_datetime", "created_at"], "summary_columns": ["police_reference", "trigger_factors", "push_pull_factors", "child_voice", "outcome"]},
    "education": {"table": "education_records", "date_columns": ["record_date", "created_at", "updated_at"], "summary_columns": ["attendance_status", "provision_name", "learning_engagement", "child_voice", "support_action"]},
    "health": {"table": "health_records", "date_columns": ["event_datetime", "created_at", "updated_at"], "summary_columns": ["record_type", "title", "summary", "child_voice", "outcome"]},
    "family_contact": {"table": "family_contact_records", "date_columns": ["contact_datetime", "created_at", "updated_at"], "summary_columns": ["contact_type", "contact_person", "post_contact_presentation", "child_voice"]},
    "keywork": {"table": "keywork_sessions", "date_columns": ["session_date", "created_at", "updated_at"], "summary_columns": ["topic", "purpose", "summary", "child_voice", "reflective_analysis"]},
}


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _table_exists(cur: Any, name: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=%s) AS exists",
        (name,),
    )
    return row_bool(cur.fetchone(), key="exists")


def _view_exists(cur: Any, name: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name=%s) AS exists",
        (name,),
    )
    return row_bool(cur.fetchone(), key="exists")


def _columns(cur: Any, table: str) -> set[str]:
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s",
        (table,),
    )
    return {row_column_name(row) for row in cur.fetchall() or [] if row_column_name(row)}


def _index_exists(cur: Any, index_name: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = %s) AS exists",
        (index_name,),
    )
    return row_bool(cur.fetchone(), key="exists")


def _count(cur: Any, table: str) -> int | None:
    if not _table_exists(cur, table):
        return None
    try:
        cur.execute(f"SELECT COUNT(*) AS count FROM public.{_q(table)}")
        row = cur.fetchone()
        value = row_scalar(row, key="count")
        return int(value) if value is not None else 0
    except Exception as error:
        logger.warning("validation_count_failed table=%s error=%s", table, error)
        return None


def _safe_view_count(cur: Any, view: str) -> int | None:
    if not _view_exists(cur, view):
        return None
    try:
        cur.execute(f"SELECT COUNT(*) AS count FROM public.{_q(view)}")
        row = cur.fetchone()
        value = row_scalar(row, key="count")
        return int(value) if value is not None else 0
    except Exception as error:
        logger.warning("validation_view_count_failed view=%s error=%s", view, error)
        return None


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
        "current_user": {"id": current_user.get("id") or current_user.get("user_id"), "role": current_user.get("role"), "home_id": current_user.get("home_id"), "provider_id": current_user.get("provider_id")},
        "protected_route_status": protected_route_status,
        "tables": table_report,
        "views": view_report,
        "critical_failures": critical_failures,
        "next_checks": ["Create or open a young person record.", "Create a daily note and confirm os_chronology_events count increases.", "Confirm evidence_links contains the saved record.", "Ask ORB a care-scoped question and confirm care_retrieval=true."],
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
    return row_dict(row, description=getattr(cur, "description", None))


def _link_count(cur: Any, table: str, record_id: Any, link_table: str) -> int | None:
    if not _table_exists(cur, link_table):
        return None
    cols = _columns(cur, link_table)
    if not {"source_table", "source_id"}.issubset(cols):
        return None
    try:
        cur.execute(
            f"SELECT COUNT(*) AS count FROM public.{_q(link_table)} WHERE source_table = %s AND source_id = %s",
            (table, str(record_id)),
        )
        row = cur.fetchone()
        value = row_scalar(row, key="count")
        return int(value) if value is not None else 0
    except Exception as error:
        logger.warning("validation_link_count_failed table=%s link_table=%s error=%s", table, link_table, error)
        return None


def _chronology_count(cur: Any, table: str, record_id: Any) -> int | None:
    return _link_count(cur, table, record_id, "os_chronology_events")


def _workflow_count(cur: Any, table: str, record_id: Any) -> int | None:
    if not _table_exists(cur, "record_workflow_events"):
        return None
    cols = _columns(cur, "record_workflow_events")
    try:
        if "source_table" in cols and "source_id" in cols:
            cur.execute(
                "SELECT COUNT(*) AS count FROM public.record_workflow_events WHERE source_table = %s AND source_id = %s",
                (table, str(record_id)),
            )
        elif "record_id" in cols:
            cur.execute(
                "SELECT COUNT(*) AS count FROM public.record_workflow_events WHERE record_id = %s",
                (str(record_id),),
            )
        else:
            return None
        row = cur.fetchone()
        value = row_scalar(row, key="count")
        return int(value) if value is not None else 0
    except Exception as error:
        logger.warning("validation_workflow_count_failed table=%s error=%s", table, error)
        return None


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
            proofs.append({"workflow": workflow, "table": table, "record_id": str(record_id), "young_person_id": record.get("young_person_id"), "status": status, "ready": status == "ready", "chronology_links": chronology_links, "evidence_links": evidence_links, "os_evidence_links": os_evidence_links, "workflow_events": workflow_events, "therapeutic_fields_present": summary_fields_present, "workflow_status": record.get("workflow_status") or record.get("status")})
    ready_count = sum(1 for item in proofs if item.get("ready"))
    return {
        "ok": ready_count == len([item for item in proofs if item.get("status") != "missing_table"]),
        "status": "ready" if ready_count and all(item.get("ready") or item.get("status") in {"missing_table", "no_records_yet"} for item in proofs) else "needs_attention",
        "current_user": {"id": current_user.get("id") or current_user.get("user_id"), "role": current_user.get("role"), "home_id": current_user.get("home_id"), "provider_id": current_user.get("provider_id")},
        "young_person_id": young_person_id,
        "proofs": proofs,
        "next_actions": ["If a workflow shows no_records_yet, create one real record through the UI.", "If a workflow shows needs_linking, run or fix the pull-through process for chronology/evidence.", "If chronology_links and evidence_links are present, ORB and reports have a usable evidence trail."],
    }


def _probe_chronology_performance(conn: Any, current_user: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        from services.os_chronology_service import list_chronology_for_connection

        payload = list_chronology_for_connection(
            conn,
            current_user=current_user,
            filters={},
            page=1,
            page_size=25,
        )
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        timing = payload.get("timing") or {}
        return {
            "ok": duration_ms <= SLOW_ENDPOINT_MS,
            "duration_ms": duration_ms,
            "item_count": payload.get("total"),
            "timing": timing,
            "slow": duration_ms > SLOW_ENDPOINT_MS,
        }
    except Exception as error:
        logger.warning("chronology_performance_probe_failed error=%s", error, exc_info=True)
        return {"ok": False, "duration_ms": None, "error": str(error), "slow": True}


def _probe_care_hub_performance(conn: Any) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        from services.care_hub_intelligence_service import care_hub_intelligence_service

        payload = care_hub_intelligence_service.build(conn, limit=10, use_cache=False)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        timing = payload.get("timing") or {}
        cache_hit = timing.get("cache_hit", False)
        return {
            "ok": duration_ms <= CARE_HUB_TARGET_MS,
            "duration_ms": duration_ms,
            "event_count": (payload.get("operational_feed") or {}).get("event_count"),
            "timing": timing,
            "cache_hit": cache_hit,
            "slow": duration_ms > CARE_HUB_TARGET_MS,
        }
    except Exception as error:
        logger.warning("care_hub_performance_probe_failed error=%s", error, exc_info=True)
        return {"ok": False, "duration_ms": None, "error": str(error), "slow": True}


def _probe_operational_feed_performance(conn: Any) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        from services.operational_feed_service import build_operational_feed

        payload = build_operational_feed(conn, limit=20)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        timing = payload.get("timing") or {}
        return {
            "ok": duration_ms <= CARE_HUB_TARGET_MS,
            "duration_ms": duration_ms,
            "event_count": payload.get("event_count"),
            "timing": timing,
            "slow": duration_ms > CARE_HUB_TARGET_MS,
        }
    except Exception as error:
        logger.warning("operational_feed_performance_probe_failed error=%s", error, exc_info=True)
        return {"ok": False, "duration_ms": None, "error": str(error), "slow": True}


def _probe_cache_health() -> dict[str, Any]:
    from services.intelligence_cache_service import intelligence_cache_service

    health = intelligence_cache_service.invalidation_health()
    return {
        "ok": True,
        "tracked_entries": health.get("tracked_entries"),
        "known_events": len(health.get("known_events") or []),
        "recent_invalidations": len(health.get("recent_invalidations") or []),
    }


def _probe_provider_aggregation(conn: Any, current_user: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        from services.provider_intelligence_service import provider_intelligence_service

        payload = provider_intelligence_service.build_operational_convergence(
            conn,
            current_user=current_user,
            limit=10,
        )
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        return {
            "ok": True,
            "duration_ms": duration_ms,
            "homes": len(payload.get("homes") or []),
            "slow": duration_ms > SLOW_ENDPOINT_MS,
        }
    except Exception as error:
        logger.warning("provider_aggregation_probe_failed error=%s", error, exc_info=True)
        return {"ok": False, "duration_ms": None, "error": str(error), "slow": True}


def _build_performance_validation(current_user: dict[str, Any], conn: Any) -> dict[str, Any]:
    validation_errors: list[str] = []
    index_report: list[dict[str, Any]] = []

    with conn.cursor() as cur:
        for index_name in PERFORMANCE_INDEXES:
            try:
                exists = _index_exists(cur, index_name)
                index_report.append({"index": index_name, "exists": exists})
            except Exception as error:
                logger.warning("performance_index_check_failed index=%s error=%s", index_name, error)
                index_report.append({"index": index_name, "exists": False, "error": str(error)})
                validation_errors.append(f"index_check_failed:{index_name}")

    missing = [item["index"] for item in index_report if not item.get("exists")]

    chronology_probe = _probe_chronology_performance(conn, current_user)
    care_hub_probe = _probe_care_hub_performance(conn)
    feed_probe = _probe_operational_feed_performance(conn)
    cache_probe = _probe_cache_health()
    provider_probe = _probe_provider_aggregation(conn, current_user)

    slow_warnings: list[str] = []
    if chronology_probe.get("slow"):
        slow_warnings.append(f"chronology:{chronology_probe.get('duration_ms')}ms")
    if care_hub_probe.get("slow"):
        slow_warnings.append(f"care_hub:{care_hub_probe.get('duration_ms')}ms")
    if feed_probe.get("slow"):
        slow_warnings.append(f"operational_feed:{feed_probe.get('duration_ms')}ms")
    if provider_probe.get("slow"):
        slow_warnings.append(f"provider_aggregation:{provider_probe.get('duration_ms')}ms")

    performance_summaries = {
        "chronology": chronology_probe,
        "care_hub": care_hub_probe,
        "operational_feed": feed_probe,
        "cache": cache_probe,
        "provider_aggregation": provider_probe,
    }

    probes_ok = all(
        probe.get("ok", False)
        for probe in (chronology_probe, care_hub_probe, feed_probe, cache_probe, provider_probe)
        if "error" not in probe
    )
    ok = not missing and not validation_errors and probes_ok and not slow_warnings

    return {
        "ok": ok,
        "status": "ready" if ok else "needs_attention",
        "current_user": {"id": current_user.get("id") or current_user.get("user_id"), "role": current_user.get("role"), "home_id": current_user.get("home_id"), "provider_id": current_user.get("provider_id")},
        "indexes": index_report,
        "missing_indexes": missing,
        "validation_errors": validation_errors,
        "performance_summaries": performance_summaries,
        "slow_endpoint_warnings": slow_warnings,
        "migration": "1001_operational_performance_indexes.sql",
        "next_checks": ["Open /young-people/[id] and confirm response time improves.", "Open /command-centre and confirm Care Hub widgets load without long waits.", "Run /api/os-command/care-hub and /api/os-command/operational-feed while authenticated."],
    }


@router.get("/live")
def live_os_validation(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_live_validation(current_user=current_user, conn=conn)


@compat_router.get("/live-validation")
def live_os_validation_command_alias(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_live_validation(current_user=current_user, conn=conn)


@router.get("/workflow-proof")
def workflow_proof(young_person_id: int | None = Query(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_workflow_proof(current_user=current_user, conn=conn, young_person_id=young_person_id)


@compat_router.get("/workflow-proof")
def workflow_proof_command_alias(young_person_id: int | None = Query(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_workflow_proof(current_user=current_user, conn=conn, young_person_id=young_person_id)


@router.get("/performance")
def performance_validation(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_performance_validation(current_user=current_user, conn=conn)


@compat_router.get("/performance-validation")
def performance_validation_command_alias(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_performance_validation(current_user=current_user, conn=conn)


CARE_HUB_ENDPOINTS = ("/os/care-hub", "/os/care-hub/live", "/os/care-hub/alerts", "/os/care-hub/inspection", "/os/care-hub/workforce", "/os/care-hub/safeguarding", "/os/care-hub/safeguarding-queues", "/os/care-hub/provider")


def _build_care_hub_validation(current_user: dict[str, Any], conn: Any) -> dict[str, Any]:
    from routers import care_hub_routes

    canonical_paths = {getattr(route, "path", "") for route in care_hub_routes.router.routes}
    missing_paths = [path for path in CARE_HUB_ENDPOINTS if path not in canonical_paths]
    probe: dict[str, Any] = {"attempted": False, "ok": False, "detail": "not_run"}
    if not missing_paths:
        try:
            from services.care_hub_intelligence_service import care_hub_intelligence_service

            payload = care_hub_intelligence_service.build(conn, limit=5, use_cache=False)
            probe = {"attempted": True, "ok": bool(payload.get("ok")), "event_count": (payload.get("operational_feed") or {}).get("event_count"), "alert_total": (payload.get("alerts") or {}).get("total"), "timing": payload.get("timing")}
        except Exception as error:
            probe = {"attempted": True, "ok": False, "detail": str(error)}

    return {
        "ok": not missing_paths and probe.get("ok", False),
        "status": "ready" if not missing_paths and probe.get("ok") else "needs_attention",
        "current_user": {"id": current_user.get("id") or current_user.get("user_id"), "role": current_user.get("role"), "home_id": current_user.get("home_id"), "provider_id": current_user.get("provider_id")},
        "protected_route_status": "authenticated" if current_user else "unknown",
        "expected_paths": list(CARE_HUB_ENDPOINTS),
        "missing_paths": missing_paths,
        "service_probe": probe,
        "next_checks": ["Open /command-centre and confirm Care Hub widgets render from /os/care-hub.", "Save a daily note and confirm care_hub_live cache invalidation fires.", "Review split safeguarding queues for missing, Reg 40, restraint, allegation and medication risk."],
    }


@router.get("/care-hub")
def care_hub_validation(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_care_hub_validation(current_user=current_user, conn=conn)


@compat_router.get("/care-hub-validation")
def care_hub_validation_command_alias(current_user=Depends(get_current_user), conn=Depends(get_db)) -> dict[str, Any]:
    return _build_care_hub_validation(current_user=current_user, conn=conn)
